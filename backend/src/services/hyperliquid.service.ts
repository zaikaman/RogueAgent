import { Hyperliquid } from 'hyperliquid';
import { logger } from '../utils/logger.util';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════════
// HYPERLIQUID SERVICE
// Testnet Perpetual Trading API Implementation using Official SDK
// Supports all Hyperliquid perpetual pairs with dynamic max leverage per asset
// ═══════════════════════════════════════════════════════════════════════════════

interface HyperliquidCredentials {
  privateKey: string;
  walletAddress: string;
}

interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
}

interface Position {
  coin: string;
  entryPx: string;
  leverage: { type: 'cross' | 'isolated'; value: number; rawUsd?: string };
  liquidationPx: string;
  marginUsed: string;
  maxLeverage: number;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

interface UserState {
  assetPositions: Array<{ position: Position; type: string }>;
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  withdrawable: string;
}

interface OrderResult {
  status: 'ok' | 'err';
  response?: {
    type: string;
    data?: {
      statuses: Array<{
        resting?: { oid: number };
        filled?: { totalSz: string; avgPx: string; oid: number };
        error?: string;
      }>;
    };
  };
  error?: string;
}

interface TradePosition {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liquidationPrice: number;
  marginType: 'isolated' | 'cross';
}

// Hyperliquid available perpetual pairs (fallback list)
const HYPERLIQUID_PERPS = [
  'BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'MATIC', 'DOGE', 'LTC', 'LINK',
  'UNI', 'AAVE', 'CRV', 'MKR', 'SNX', 'COMP', 'SUSHI', 'YFI', 'ATOM', 'DOT',
  'ADA', 'XRP', 'BNB', 'TRX', 'APT', 'SUI', 'SEI', 'TIA', 'INJ', 'FTM',
  'NEAR', 'RUNE', 'DYDX', 'GMX', 'LDO', 'RPL', 'FXS', 'PENDLE', 'BLUR',
  'WLD', 'PYTH', 'JTO', 'JUP', 'W', 'ENA', 'STRK', 'MANTA', 'DYM', 'ONDO',
  'WIF', 'BONK', 'PEPE', 'SHIB', 'FLOKI', 'ORDI', 'MEME', 'PEOPLE', 'TURBO',
  'POPCAT', 'BRETT', 'NEIRO', 'GOAT', 'PNUT', 'ACT', 'MOODENG', 'AI16Z',
  'HYPE', 'VIRTUAL', 'AIXBT', 'FARTCOIN', 'GRIFFAIN', 'ZEREBRO', 'KOMA'
];

export class HyperliquidService extends EventEmitter {
  private sdk: Hyperliquid;
  private credentials: HyperliquidCredentials;
  private isTestnet: boolean;
  private isConnected: boolean = false;
  private assetInfoCache: Map<string, AssetInfo> = new Map();
  private assetIndexMap: Map<string, number> = new Map();
  private lastMetaFetch: number = 0;
  private META_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(credentials: HyperliquidCredentials, testnet: boolean = true) {
    super();
    this.credentials = credentials;
    this.isTestnet = testnet;

    // Initialize the official SDK
    this.sdk = new Hyperliquid({
      privateKey: credentials.privateKey,
      testnet,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect to Hyperliquid (required before trading)
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      await this.sdk.connect();
      this.isConnected = true;
      logger.info('Connected to Hyperliquid SDK');
    } catch (error: any) {
      logger.error('Failed to connect to Hyperliquid', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect from Hyperliquid
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.sdk.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Hyperliquid SDK');
    } catch (error: any) {
      logger.warn('Error disconnecting from Hyperliquid', { error: error.message });
    }
  }

  /**
   * Ensure SDK is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA & INFO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get perpetuals metadata (universe and asset info)
   */
  async getMeta(): Promise<{ universe: AssetInfo[] }> {
    if (Date.now() - this.lastMetaFetch < this.META_CACHE_TTL && this.assetInfoCache.size > 0) {
      return { universe: Array.from(this.assetInfoCache.values()) };
    }

    await this.ensureConnected();
    const meta = await this.sdk.info.perpetuals.getMeta();
    const universe = meta.universe as AssetInfo[];

    this.assetInfoCache.clear();
    this.assetIndexMap.clear();
    
    universe.forEach((asset, index) => {
      if (!asset.isDelisted) {
        // Store both with and without -PERP suffix for flexibility
        const baseName = asset.name.replace(/-PERP$/, '');
        this.assetInfoCache.set(asset.name, asset);
        this.assetInfoCache.set(baseName, asset);
        this.assetIndexMap.set(asset.name, index);
        this.assetIndexMap.set(baseName, index);
      }
    });

    this.lastMetaFetch = Date.now();
    logger.info(`Loaded ${universe.length} Hyperliquid perpetual assets`);
    
    return { universe };
  }

  /**
   * Get user's perpetual account state
   */
  async getUserState(): Promise<UserState> {
    await this.ensureConnected();
    const state = await this.sdk.info.perpetuals.getClearinghouseState(this.credentials.walletAddress);
    return state as unknown as UserState;
  }

  /**
   * Get mid prices for all coins
   */
  async getAllMids(): Promise<Record<string, string>> {
    await this.ensureConnected();
    return this.sdk.info.getAllMids();
  }

  /**
   * Get max leverage for a specific asset
   */
  async getMaxLeverage(symbol: string): Promise<number> {
    await this.getMeta();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const info = this.assetInfoCache.get(normalizedSymbol);
    
    if (!info) {
      logger.warn(`Asset ${symbol} not found, using default max leverage of 20x`);
      return 20;
    }
    
    return info.maxLeverage;
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const mids = await this.getAllMids();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const baseSymbol = this.formatSymbol(symbol);
    
    // Try with -PERP suffix first, then without
    const price = mids[normalizedSymbol] || mids[baseSymbol];
    if (!price) throw new Error(`Price not found for ${symbol}`);
    return parseFloat(price);
  }

  /**
   * Normalize symbol to Hyperliquid format
   * On testnet, symbols have -PERP suffix (e.g., ETH-PERP)
   */
  normalizeSymbol(tokenSymbol: string): string {
    const upper = tokenSymbol.toUpperCase().replace(/USDT$/, '');
    
    // If already has -PERP, return as-is
    if (upper.endsWith('-PERP')) {
      return upper;
    }
    
    // On testnet, add -PERP suffix
    if (this.isTestnet) {
      return `${upper}-PERP`;
    }
    
    return upper;
  }

  /**
   * Format symbol for display (remove -PERP suffix)
   */
  formatSymbol(tokenSymbol: string): string {
    return tokenSymbol.toUpperCase().replace(/USDT$/, '').replace(/-PERP$/, '');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT & BALANCE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Test connection by fetching user state
   */
  async testConnection(): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      await this.ensureConnected();
      const state = await this.getUserState();
      const balance = parseFloat(state.marginSummary.accountValue);
      return { success: true, balance };
    } catch (error: any) {
      logger.error('Hyperliquid connection test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account equity
   */
  async getAccountEquity(): Promise<number> {
    const state = await this.getUserState();
    return parseFloat(state.marginSummary.accountValue);
  }

  /**
   * Get withdrawable balance
   */
  async getWithdrawableBalance(): Promise<number> {
    const state = await this.getUserState();
    return parseFloat(state.withdrawable);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all open positions
   */
  async getPositions(): Promise<Position[]> {
    const state = await this.getUserState();
    return state.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => ap.position);
  }

  /**
   * Get formatted positions with P&L
   */
  async getFormattedPositions(): Promise<TradePosition[]> {
    const positions = await this.getPositions();
    const mids = await this.getAllMids();

    return positions.map(p => {
      const szi = parseFloat(p.szi);
      const entryPrice = parseFloat(p.entryPx);
      const coin = p.coin.replace(/-PERP$/, '');
      const currentPrice = parseFloat(mids[p.coin] || mids[coin] || p.entryPx);
      const pnl = parseFloat(p.unrealizedPnl);
      const positionValue = Math.abs(szi * entryPrice);

      return {
        symbol: coin,
        direction: szi > 0 ? 'LONG' : 'SHORT',
        entryPrice,
        currentPrice,
        quantity: Math.abs(szi),
        leverage: p.leverage.value,
        unrealizedPnl: pnl,
        unrealizedPnlPercent: positionValue > 0 ? (pnl / positionValue) * 100 : 0,
        liquidationPrice: parseFloat(p.liquidationPx),
        marginType: p.leverage.type,
      } as TradePosition;
    });
  }

  /**
   * Get position for a specific symbol
   */
  async getPosition(symbol: string): Promise<Position | null> {
    const positions = await this.getPositions();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const baseSymbol = this.formatSymbol(symbol);
    
    return positions.find(p => 
      p.coin === normalizedSymbol || 
      p.coin === baseSymbol ||
      p.coin.replace(/-PERP$/, '') === baseSymbol
    ) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVERAGE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update leverage for a symbol
   * Automatically clamps to the asset's max leverage if requested leverage is too high
   */
  async setLeverage(symbol: string, leverage: number, isCross: boolean = false): Promise<{ success: boolean; actualLeverage: number }> {
    await this.ensureConnected();
    await this.getMeta();
    
    const normalizedSymbol = this.normalizeSymbol(symbol);
    
    // Get max leverage for this asset
    const assetInfo = this.assetInfoCache.get(normalizedSymbol);
    const maxLeverage = assetInfo?.maxLeverage || 20;
    
    // Clamp leverage to max
    const actualLeverage = Math.min(leverage, maxLeverage);
    
    if (leverage > maxLeverage) {
      logger.warn(`Requested leverage ${leverage}x exceeds max ${maxLeverage}x for ${symbol}, using ${actualLeverage}x`);
    }

    try {
      const leverageMode = isCross ? 'cross' : 'isolated';
      await this.sdk.exchange.updateLeverage(normalizedSymbol, leverageMode, actualLeverage);
      logger.info(`Leverage set to ${actualLeverage}x for ${symbol} (max: ${maxLeverage}x)`);
      return { success: true, actualLeverage };
    } catch (error: any) {
      logger.error(`Failed to set leverage for ${symbol}`, { error: error.message });
      return { success: false, actualLeverage: 1 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Place an order using the official SDK
   */
  async placeOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    price?: number;
    reduceOnly?: boolean;
    orderType?: 'limit' | 'market';
    timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
    clientOrderId?: string;
  }): Promise<OrderResult> {
    await this.ensureConnected();
    await this.getMeta();
    
    const normalizedSymbol = this.normalizeSymbol(params.symbol);
    const assetInfo = this.assetInfoCache.get(normalizedSymbol);
    
    if (!assetInfo) {
      throw new Error(`Asset ${params.symbol} not found`);
    }

    // Round size to appropriate decimals
    const szDecimals = assetInfo.szDecimals;
    const roundedSize = Math.floor(params.size * Math.pow(10, szDecimals)) / Math.pow(10, szDecimals);

    // Get current price if not provided (for market orders)
    let orderPrice = params.price;
    if (!orderPrice || params.orderType === 'market') {
      const currentPrice = await this.getPrice(params.symbol);
      // For market orders, use a price slightly away from current to ensure fill
      const slippage = params.isBuy ? 1.005 : 0.995; // 0.5% slippage
      orderPrice = currentPrice * slippage;
    }

    try {
      const orderType = params.orderType === 'market' 
        ? { limit: { tif: 'Ioc' as const } } // IOC for market-like execution
        : { limit: { tif: (params.timeInForce || 'Gtc') as 'Gtc' | 'Ioc' | 'Alo' } };

      const result = await this.sdk.exchange.placeOrder({
        coin: normalizedSymbol,
        is_buy: params.isBuy,
        sz: roundedSize,
        limit_px: orderPrice,
        order_type: orderType,
        reduce_only: params.reduceOnly || false,
      });

      logger.info(`Order placed: ${params.symbol} ${params.isBuy ? 'LONG' : 'SHORT'} ${roundedSize} @ ${orderPrice}`);
      return result as OrderResult;
    } catch (error: any) {
      logger.error('Order placement failed', { error: error.message, symbol: params.symbol });
      throw error;
    }
  }

  /**
   * Place a market order (convenience method)
   */
  async placeMarketOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    reduceOnly?: boolean;
  }): Promise<OrderResult> {
    return this.placeOrder({
      ...params,
      orderType: 'market',
    });
  }

  /**
   * Close a position
   */
  async closePosition(symbol: string): Promise<OrderResult | null> {
    const position = await this.getPosition(symbol);
    if (!position) {
      logger.warn(`No position found for ${symbol}`);
      return null;
    }

    const szi = parseFloat(position.szi);
    const isBuy = szi < 0; // If short, buy to close; if long, sell to close

    return this.placeMarketOrder({
      symbol,
      isBuy,
      size: Math.abs(szi),
      reduceOnly: true,
    });
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<{ closed: string[]; errors: string[] }> {
    const positions = await this.getPositions();
    const closed: string[] = [];
    const errors: string[] = [];

    for (const position of positions) {
      try {
        const symbol = position.coin.replace(/-PERP$/, '');
        await this.closePosition(symbol);
        closed.push(symbol);
      } catch (error: any) {
        errors.push(`${position.coin}: ${error.message}`);
      }
    }

    return { closed, errors };
  }

  /**
   * Get open orders
   */
  async getOpenOrders(): Promise<any[]> {
    await this.ensureConnected();
    return this.sdk.info.getUserOpenOrders(this.credentials.walletAddress);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    await this.ensureConnected();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    return this.sdk.exchange.cancelOrder({ coin: normalizedSymbol, o: orderId });
  }

  /**
   * Cancel all orders for a symbol
   */
  async cancelAllOrders(symbol?: string): Promise<any> {
    await this.ensureConnected();
    
    // Get all open orders
    const openOrders = await this.getOpenOrders();
    const results: any[] = [];
    
    for (const order of openOrders) {
      // Filter by symbol if provided
      if (symbol) {
        const normalizedSymbol = this.normalizeSymbol(symbol);
        const orderSymbol = order.coin || order.asset;
        if (orderSymbol !== normalizedSymbol && orderSymbol !== this.formatSymbol(symbol)) {
          continue;
        }
      }
      
      try {
        const result = await this.cancelOrder(order.coin || order.asset, order.oid);
        results.push(result);
      } catch (error: any) {
        logger.warn(`Failed to cancel order ${order.oid}`, { error: error.message });
      }
    }
    
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get list of available perpetual symbols
   */
  async getAvailableSymbols(): Promise<string[]> {
    await this.getMeta();
    // Return unique base symbols (without -PERP)
    const symbols = new Set<string>();
    this.assetInfoCache.forEach((_, key) => {
      symbols.add(key.replace(/-PERP$/, ''));
    });
    return Array.from(symbols);
  }

  /**
   * Check if a symbol is available for trading
   */
  async isSymbolAvailable(symbol: string): Promise<boolean> {
    await this.getMeta();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    return this.assetInfoCache.has(normalizedSymbol);
  }

  /**
   * Get symbol info (decimals, max leverage, etc.)
   */
  async getSymbolInfo(symbol: string): Promise<AssetInfo | null> {
    await this.getMeta();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    return this.assetInfoCache.get(normalizedSymbol) || null;
  }

  /**
   * Get user fills (recent trades)
   */
  async getFills(limit: number = 50): Promise<any[]> {
    await this.ensureConnected();
    const fills = await this.sdk.info.getUserFills(this.credentials.walletAddress);
    return fills.slice(0, limit);
  }

  /**
   * Open a bracket position (entry + TP + SL)
   * This is a convenience method that places entry, take-profit, and stop-loss orders
   */
  async openBracketPosition(params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    riskPercent: number;
    leverage: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    clientOrderIdPrefix?: string;
  }): Promise<{
    entryOrder: OrderResult;
    tpOrder?: OrderResult;
    slOrder?: OrderResult;
    position: { quantity: number; entryPrice: number };
  }> {
    await this.ensureConnected();
    
    const { symbol, side, riskPercent, leverage, takeProfitPrice, stopLossPrice } = params;
    const isBuy = side === 'LONG';
    
    // Get account equity and current price
    const equity = await this.getAccountEquity();
    const currentPrice = await this.getPrice(symbol);
    
    // Calculate position size based on risk
    const riskAmount = equity * (riskPercent / 100);
    const stopLossDistance = Math.abs(currentPrice - stopLossPrice);
    const positionValue = (riskAmount / stopLossDistance) * currentPrice;
    const quantity = positionValue / currentPrice;
    
    // Set leverage
    await this.setLeverage(symbol, leverage, false);
    
    // Place entry order (market)
    const entryOrder = await this.placeMarketOrder({
      symbol,
      isBuy,
      size: quantity,
    });

    const entryFilled = entryOrder.response?.data?.statuses?.[0]?.filled;
    if (!entryFilled) {
      return {
        entryOrder,
        position: { quantity: 0, entryPrice: 0 },
      };
    }

    const actualQuantity = parseFloat(entryFilled.totalSz);
    const entryPrice = parseFloat(entryFilled.avgPx);

    // Place take-profit order (limit, reduce-only)
    let tpOrder: OrderResult | undefined;
    try {
      tpOrder = await this.placeOrder({
        symbol,
        isBuy: !isBuy, // opposite side
        size: actualQuantity,
        price: takeProfitPrice,
        reduceOnly: true,
        orderType: 'limit',
        timeInForce: 'Gtc',
      });
    } catch (error: any) {
      logger.warn(`Failed to place TP order for ${symbol}`, { error: error.message });
    }

    // Place stop-loss order (trigger order, reduce-only)
    let slOrder: OrderResult | undefined;
    try {
      slOrder = await this.placeTriggerOrder({
        symbol,
        isBuy: !isBuy, // opposite side
        size: actualQuantity,
        triggerPrice: stopLossPrice,
        reduceOnly: true,
        triggerType: 'sl',
      });
    } catch (error: any) {
      logger.warn(`Failed to place SL order for ${symbol}`, { error: error.message });
    }

    return {
      entryOrder,
      tpOrder,
      slOrder,
      position: { quantity: actualQuantity, entryPrice },
    };
  }

  /**
   * Place a trigger order (stop-loss or take-profit with trigger)
   * Note: This uses the SDK's trigger order functionality if available,
   * otherwise falls back to a limit order at trigger price
   */
  async placeTriggerOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    triggerPrice: number;
    limitPrice?: number;
    reduceOnly?: boolean;
    triggerType?: 'tp' | 'sl';
    clientOrderId?: string;
  }): Promise<OrderResult> {
    await this.ensureConnected();
    await this.getMeta();
    
    const normalizedSymbol = this.normalizeSymbol(params.symbol);
    const assetInfo = this.assetInfoCache.get(normalizedSymbol);
    
    if (!assetInfo) {
      throw new Error(`Asset ${params.symbol} not found`);
    }

    // Round size to appropriate decimals
    const szDecimals = assetInfo.szDecimals;
    const roundedSize = Math.floor(params.size * Math.pow(10, szDecimals)) / Math.pow(10, szDecimals);

    try {
      // Try to use the SDK's trigger order method
      const orderType = {
        trigger: {
          isMarket: !params.limitPrice,
          triggerPx: params.triggerPrice.toString(),
          tpsl: params.triggerType || 'sl',
        },
      };

      const result = await this.sdk.exchange.placeOrder({
        coin: normalizedSymbol,
        is_buy: params.isBuy,
        sz: roundedSize,
        limit_px: params.limitPrice || params.triggerPrice,
        order_type: orderType as any,
        reduce_only: params.reduceOnly || false,
      });

      logger.info(`Trigger order placed: ${params.symbol} ${params.isBuy ? 'BUY' : 'SELL'} @ trigger ${params.triggerPrice}`);
      return result as OrderResult;
    } catch (error: any) {
      logger.error('Trigger order placement failed', { error: error.message, symbol: params.symbol });
      throw error;
    }
  }

  /**
   * Get static list of Hyperliquid perpetual symbols (for signal filtering)
   */
  static getKnownSymbols(): string[] {
    return HYPERLIQUID_PERPS;
  }
}

// Factory function to create service instance
export function createHyperliquidService(
  privateKey: string,
  walletAddress: string,
  testnet: boolean = true
): HyperliquidService {
  return new HyperliquidService({ privateKey, walletAddress }, testnet);
}

// Export known symbols for external use
export const HYPERLIQUID_AVAILABLE_PERPS = HYPERLIQUID_PERPS;
