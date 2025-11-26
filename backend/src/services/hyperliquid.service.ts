import axios, { AxiosInstance, AxiosError } from 'axios';
import WebSocket from 'ws';
import { ethers } from 'ethers';
import { logger } from '../utils/logger.util';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════════
// HYPERLIQUID SERVICE
// Testnet Perpetual Trading API Implementation
// Supports all Hyperliquid perpetual pairs with dynamic max leverage per asset
// ═══════════════════════════════════════════════════════════════════════════════

// API URLs
const MAINNET_API_URL = 'https://api.hyperliquid.xyz';
const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz';
const MAINNET_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const TESTNET_WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws';

interface HyperliquidCredentials {
  privateKey: string; // Ethereum private key for signing
  walletAddress: string; // User's wallet address
}

interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
}

interface AssetContext {
  dayNtlVlm: string;
  funding: string;
  impactPxs: [string, string];
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
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

// Hyperliquid available perpetual pairs (large & mid caps)
// This list is fetched dynamically but we maintain a fallback
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
  private baseUrl: string;
  private wsUrl: string;
  private credentials: HyperliquidCredentials;
  private axiosInstance: AxiosInstance;
  private assetInfoCache: Map<string, AssetInfo> = new Map();
  private assetContextCache: Map<string, AssetContext> = new Map();
  private assetIndexMap: Map<string, number> = new Map();
  private lastMetaFetch: number = 0;
  private META_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private ws: WebSocket | null = null;
  private isTestnet: boolean;

  constructor(credentials: HyperliquidCredentials, testnet: boolean = true) {
    super();
    this.credentials = credentials;
    this.isTestnet = testnet;
    
    this.baseUrl = testnet ? TESTNET_API_URL : MAINNET_API_URL;
    this.wsUrl = testnet ? TESTNET_WS_URL : MAINNET_WS_URL;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
          logger.warn(`Hyperliquid rate limit hit, retrying after ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
          return this.axiosInstance.request(error.config!);
        }
        throw error;
      }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE GENERATION (EIP-712 typed data signing)
  // ═══════════════════════════════════════════════════════════════════════════

  private async signL1Action(action: any, nonce: number): Promise<{ r: string; s: string; v: number }> {
    const wallet = new ethers.Wallet(this.credentials.privateKey);
    
    // Hyperliquid uses EIP-712 typed data signing
    const domain = {
      name: 'Exchange',
      version: '1',
      chainId: this.isTestnet ? 421614 : 42161, // Arbitrum Sepolia / Mainnet
      verifyingContract: '0x0000000000000000000000000000000000000000',
    };

    const types = {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    };

    // For order actions, Hyperliquid expects a specific message structure
    // This is a simplified version - real implementation needs full action encoding
    const connectionId = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(action)));

    const value = {
      source: this.isTestnet ? 'b' : 'a', // 'b' for testnet, 'a' for mainnet
      connectionId,
    };

    const signature = await wallet.signTypedData(domain, types, value);
    const { r, s, v } = ethers.Signature.from(signature);
    
    return { r, s, v };
  }

  private generateNonce(): number {
    return Date.now();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO ENDPOINT (Read-only operations)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get perpetuals metadata (universe and asset info)
   */
  async getMeta(): Promise<{ universe: AssetInfo[] }> {
    if (Date.now() - this.lastMetaFetch < this.META_CACHE_TTL && this.assetInfoCache.size > 0) {
      return { universe: Array.from(this.assetInfoCache.values()) };
    }

    const response = await this.axiosInstance.post('/info', { type: 'meta' });
    const universe = response.data.universe as AssetInfo[];

    this.assetInfoCache.clear();
    this.assetIndexMap.clear();
    
    universe.forEach((asset, index) => {
      if (!asset.isDelisted) {
        this.assetInfoCache.set(asset.name, asset);
        this.assetIndexMap.set(asset.name, index);
      }
    });

    this.lastMetaFetch = Date.now();
    logger.info(`Loaded ${this.assetInfoCache.size} Hyperliquid perpetual assets`);
    
    return { universe };
  }

  /**
   * Get asset contexts (mark price, funding, etc.)
   */
  async getMetaAndAssetCtxs(): Promise<[{ universe: AssetInfo[] }, AssetContext[]]> {
    const response = await this.axiosInstance.post('/info', { type: 'metaAndAssetCtxs' });
    const [meta, contexts] = response.data;

    this.assetContextCache.clear();
    meta.universe.forEach((asset: AssetInfo, index: number) => {
      if (!asset.isDelisted && contexts[index]) {
        this.assetContextCache.set(asset.name, contexts[index]);
      }
    });

    return response.data;
  }

  /**
   * Get mid prices for all coins
   */
  async getAllMids(): Promise<Record<string, string>> {
    const response = await this.axiosInstance.post('/info', { type: 'allMids' });
    return response.data;
  }

  /**
   * Get user's perpetual account state
   */
  async getUserState(): Promise<UserState> {
    const response = await this.axiosInstance.post('/info', {
      type: 'clearinghouseState',
      user: this.credentials.walletAddress,
    });
    return response.data;
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(): Promise<any[]> {
    const response = await this.axiosInstance.post('/info', {
      type: 'openOrders',
      user: this.credentials.walletAddress,
    });
    return response.data;
  }

  /**
   * Get user's fills
   */
  async getFills(limit: number = 50): Promise<any[]> {
    const response = await this.axiosInstance.post('/info', {
      type: 'userFills',
      user: this.credentials.walletAddress,
    });
    return response.data.slice(0, limit);
  }

  /**
   * Check if symbol is available for trading
   */
  async isSymbolAvailable(symbol: string): Promise<boolean> {
    await this.getMeta();
    return this.assetInfoCache.has(symbol.toUpperCase());
  }

  /**
   * Get symbol info
   */
  async getSymbolInfo(symbol: string): Promise<AssetInfo | null> {
    await this.getMeta();
    return this.assetInfoCache.get(symbol.toUpperCase()) || null;
  }

  /**
   * Get max leverage for a symbol
   * Different assets have different max leverage limits on Hyperliquid
   */
  async getMaxLeverage(symbol: string): Promise<number> {
    const info = await this.getSymbolInfo(symbol);
    if (!info) {
      logger.warn(`Asset ${symbol} not found, returning default max leverage of 20`);
      return 20; // Safe default
    }
    return info.maxLeverage;
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const mids = await this.getAllMids();
    const price = mids[symbol.toUpperCase()];
    if (!price) throw new Error(`Price not found for ${symbol}`);
    return parseFloat(price);
  }

  /**
   * Format symbol (normalize to Hyperliquid format)
   */
  formatSymbol(tokenSymbol: string): string {
    // Remove USDT suffix if present
    const upper = tokenSymbol.toUpperCase();
    return upper.replace(/USDT$/, '');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT & BALANCE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Test connection by fetching user state
   */
  async testConnection(): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
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
      const currentPrice = parseFloat(mids[p.coin] || p.entryPx);
      const unrealizedPnl = parseFloat(p.unrealizedPnl);
      const positionValue = parseFloat(p.positionValue);

      return {
        symbol: p.coin,
        direction: szi > 0 ? 'LONG' : 'SHORT',
        entryPrice,
        currentPrice,
        quantity: Math.abs(szi),
        leverage: p.leverage.value,
        unrealizedPnl,
        unrealizedPnlPercent: positionValue > 0 ? (unrealizedPnl / positionValue) * 100 * p.leverage.value : 0,
        liquidationPrice: parseFloat(p.liquidationPx),
        marginType: p.leverage.type,
      };
    });
  }

  /**
   * Get position for specific symbol
   */
  async getPosition(symbol: string): Promise<Position | null> {
    const positions = await this.getPositions();
    return positions.find(p => p.coin === symbol.toUpperCase()) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCHANGE ENDPOINT (Write operations)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update leverage for a symbol
   * Automatically clamps to the asset's max leverage if requested leverage is too high
   * @returns Object with success status and the actual leverage that was set
   */
  async setLeverage(symbol: string, leverage: number, isCross: boolean = false): Promise<{ success: boolean; actualLeverage: number }> {
    await this.getMeta();
    const upperSymbol = symbol.toUpperCase();
    const assetIndex = this.assetIndexMap.get(upperSymbol);
    if (assetIndex === undefined) throw new Error(`Asset ${symbol} not found`);

    // Get max leverage for this asset
    const assetInfo = this.assetInfoCache.get(upperSymbol);
    const maxLeverage = assetInfo?.maxLeverage || 20;
    
    // Clamp leverage to max
    const actualLeverage = Math.min(leverage, maxLeverage);
    
    if (leverage > maxLeverage) {
      logger.warn(`Requested leverage ${leverage}x exceeds max ${maxLeverage}x for ${symbol}, using ${actualLeverage}x`);
    }

    const nonce = this.generateNonce();
    const action = {
      type: 'updateLeverage',
      asset: assetIndex,
      isCross,
      leverage: actualLeverage,
    };

    const signature = await this.signL1Action(action, nonce);

    const response = await this.axiosInstance.post('/exchange', {
      action,
      nonce,
      signature,
    });

    const success = response.data.status === 'ok';
    if (success) {
      logger.info(`Leverage set to ${actualLeverage}x for ${symbol} (max: ${maxLeverage}x)`);
    }
    
    return { success, actualLeverage };
  }

  /**
   * Place an order
   */
  async placeOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    price?: number; // If undefined, market order
    reduceOnly?: boolean;
    orderType?: 'limit' | 'market';
    timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
    clientOrderId?: string;
  }): Promise<OrderResult> {
    await this.getMeta();
    const assetIndex = this.assetIndexMap.get(params.symbol.toUpperCase());
    if (assetIndex === undefined) throw new Error(`Asset ${params.symbol} not found`);

    const info = this.assetInfoCache.get(params.symbol.toUpperCase());
    if (!info) throw new Error(`Asset info not found for ${params.symbol}`);

    // Round size to appropriate decimals
    const szDecimals = info.szDecimals;
    const roundedSize = Math.floor(params.size * Math.pow(10, szDecimals)) / Math.pow(10, szDecimals);

    const nonce = this.generateNonce();
    
    // Build order object
    const order: any = {
      a: assetIndex, // asset index
      b: params.isBuy, // is buy
      p: params.price?.toString() || '0', // price (0 for market)
      s: roundedSize.toString(), // size
      r: params.reduceOnly || false, // reduce only
      t: params.orderType === 'market' 
        ? { market: {} }
        : { limit: { tif: params.timeInForce || 'Gtc' } },
    };

    if (params.clientOrderId) {
      order.c = params.clientOrderId;
    }

    const action = {
      type: 'order',
      orders: [order],
      grouping: 'na',
    };

    const signature = await this.signL1Action(action, nonce);

    try {
      const response = await this.axiosInstance.post('/exchange', {
        action,
        nonce,
        signature,
      });

      logger.info(`Order placed: ${params.symbol} ${params.isBuy ? 'BUY' : 'SELL'} ${roundedSize}`);
      return response.data;
    } catch (error: any) {
      logger.error('Order placement failed', { error: error.response?.data || error.message });
      throw error;
    }
  }

  /**
   * Place a trigger order (stop-loss or take-profit with trigger)
   * Trigger orders execute when the oracle price crosses the trigger price
   */
  async placeTriggerOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    triggerPrice: number;
    limitPrice?: number; // If undefined, executes as market when triggered
    reduceOnly?: boolean;
    triggerType?: 'tp' | 'sl'; // tp = take profit (above), sl = stop loss (below)
    clientOrderId?: string;
  }): Promise<OrderResult> {
    await this.getMeta();
    const assetIndex = this.assetIndexMap.get(params.symbol.toUpperCase());
    if (assetIndex === undefined) throw new Error(`Asset ${params.symbol} not found`);

    const info = this.assetInfoCache.get(params.symbol.toUpperCase());
    if (!info) throw new Error(`Asset info not found for ${params.symbol}`);

    // Round size to appropriate decimals
    const szDecimals = info.szDecimals;
    const roundedSize = Math.floor(params.size * Math.pow(10, szDecimals)) / Math.pow(10, szDecimals);

    const nonce = this.generateNonce();
    
    // Determine if trigger is above or below current price
    // isMarket: true = market order when triggered, false = limit order
    const isMarket = !params.limitPrice;
    const tpsl = params.triggerType || 'sl';
    
    // Build trigger order object
    const order: any = {
      a: assetIndex,
      b: params.isBuy,
      p: params.limitPrice?.toString() || params.triggerPrice.toString(),
      s: roundedSize.toString(),
      r: params.reduceOnly !== false, // Default to reduce-only for trigger orders
      t: {
        trigger: {
          isMarket,
          triggerPx: params.triggerPrice.toString(),
          tpsl,
        },
      },
    };

    if (params.clientOrderId) {
      order.c = params.clientOrderId;
    }

    const action = {
      type: 'order',
      orders: [order],
      grouping: 'na',
    };

    const signature = await this.signL1Action(action, nonce);

    try {
      const response = await this.axiosInstance.post('/exchange', {
        action,
        nonce,
        signature,
      });

      logger.info(`Trigger order placed: ${params.symbol} ${params.isBuy ? 'BUY' : 'SELL'} @ trigger ${params.triggerPrice}`);
      return response.data;
    } catch (error: any) {
      logger.error('Trigger order placement failed', { error: error.response?.data || error.message });
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<OrderResult> {
    await this.getMeta();
    const assetIndex = this.assetIndexMap.get(symbol.toUpperCase());
    if (assetIndex === undefined) throw new Error(`Asset ${symbol} not found`);

    const nonce = this.generateNonce();
    const action = {
      type: 'cancel',
      cancels: [{ a: assetIndex, o: orderId }],
    };

    const signature = await this.signL1Action(action, nonce);

    const response = await this.axiosInstance.post('/exchange', {
      action,
      nonce,
      signature,
    });

    return response.data;
  }

  /**
   * Cancel all orders for a symbol
   */
  async cancelAllOrders(symbol?: string): Promise<boolean> {
    const openOrders = await this.getOpenOrders();
    
    const ordersToCancel = symbol 
      ? openOrders.filter(o => o.coin === symbol.toUpperCase())
      : openOrders;

    for (const order of ordersToCancel) {
      try {
        await this.cancelOrder(order.coin, order.oid);
      } catch (error) {
        logger.warn(`Failed to cancel order ${order.oid}`, error);
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION SIZE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate position size based on risk percentage
   */
  async calculatePositionSize(
    symbol: string,
    riskPercent: number,
    entryPrice: number,
    stopLossPrice: number,
    leverage: number
  ): Promise<{ quantity: number; notionalValue: number; margin: number }> {
    const equity = await this.getAccountEquity();
    const riskAmount = equity * (riskPercent / 100);
    
    const priceDiff = Math.abs(entryPrice - stopLossPrice);
    const riskPerUnit = priceDiff;
    
    let quantity = riskAmount / riskPerUnit;
    
    // Get symbol info for precision
    const info = await this.getSymbolInfo(symbol);
    if (info) {
      const szDecimals = info.szDecimals;
      quantity = Math.floor(quantity * Math.pow(10, szDecimals)) / Math.pow(10, szDecimals);
    }
    
    const notionalValue = quantity * entryPrice;
    const margin = notionalValue / leverage;
    
    // Verify we have enough margin
    const withdrawable = await this.getWithdrawableBalance();
    if (margin > withdrawable) {
      throw new Error(`Insufficient margin. Required: $${margin.toFixed(2)}, Available: $${withdrawable.toFixed(2)}`);
    }
    
    return { quantity, notionalValue, margin };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BRACKET ORDER (ENTRY + TP + SL)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Open a position with take profit and stop loss
   */
  async openBracketPosition(params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    riskPercent: number;
    leverage: number;
    entryPrice?: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    clientOrderIdPrefix?: string;
  }): Promise<{
    entryOrder: OrderResult;
    tpOrder: OrderResult | null;
    slOrder: OrderResult | null;
    position: { quantity: number; notionalValue: number; margin: number };
  }> {
    const {
      symbol,
      side,
      riskPercent,
      leverage,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
      clientOrderIdPrefix = 'ROGUE',
    } = params;

    // Get current price if entry not specified
    const currentPrice = entryPrice || await this.getPrice(symbol);
    
    // Set leverage (isolated by default)
    await this.setLeverage(symbol, leverage, false);

    // Calculate position size
    const positionSize = await this.calculatePositionSize(
      symbol,
      riskPercent,
      currentPrice,
      stopLossPrice,
      leverage
    );

    const isBuy = side === 'LONG';
    const uniqueId = Date.now().toString(36);

    // 1. Place market entry order
    const entryOrder = await this.placeOrder({
      symbol,
      isBuy,
      size: positionSize.quantity,
      orderType: 'market',
      clientOrderId: `${clientOrderIdPrefix}_ENTRY_${uniqueId}`,
    });

    logger.info(`Entry order placed for ${positionSize.quantity} ${symbol}`);

    // 2. Place take profit order (reduce-only limit)
    let tpOrder: OrderResult | null = null;
    try {
      tpOrder = await this.placeOrder({
        symbol,
        isBuy: !isBuy, // Opposite side
        size: positionSize.quantity,
        price: takeProfitPrice,
        reduceOnly: true,
        orderType: 'limit',
        timeInForce: 'Gtc',
        clientOrderId: `${clientOrderIdPrefix}_TP_${uniqueId}`,
      });
      logger.info(`Take profit order placed at ${takeProfitPrice}`);
    } catch (error) {
      logger.warn('Failed to place TP order', error);
    }

    // 3. Place stop loss order using trigger order
    // Trigger orders execute when price crosses the trigger price
    let slOrder: OrderResult | null = null;
    try {
      slOrder = await this.placeTriggerOrder({
        symbol,
        isBuy: !isBuy, // Opposite side to close
        size: positionSize.quantity,
        triggerPrice: stopLossPrice,
        reduceOnly: true,
        triggerType: 'sl', // Stop-loss type
        clientOrderId: `${clientOrderIdPrefix}_SL_${uniqueId}`,
      });
      logger.info(`Stop loss trigger order placed at ${stopLossPrice}`);
    } catch (error) {
      logger.warn('Failed to place SL trigger order', error);
    }

    return {
      entryOrder,
      tpOrder,
      slOrder,
      position: positionSize,
    };
  }

  /**
   * Close a position at market price
   */
  async closePosition(symbol: string): Promise<OrderResult | null> {
    const position = await this.getPosition(symbol);
    if (!position) {
      logger.warn(`No open position for ${symbol}`);
      return null;
    }

    const szi = parseFloat(position.szi);
    const isBuy = szi < 0; // If short (negative), buy to close
    const quantity = Math.abs(szi);

    // Cancel all open orders first
    await this.cancelAllOrders(symbol);

    // Place market close order
    const closeOrder = await this.placeOrder({
      symbol,
      isBuy,
      size: quantity,
      orderType: 'market',
      reduceOnly: true,
      clientOrderId: `ROGUE_CLOSE_${Date.now().toString(36)}`,
    });

    logger.info(`Position closed: ${quantity} ${symbol}`);
    return closeOrder;
  }

  /**
   * Emergency: Close ALL positions
   */
  async closeAllPositions(): Promise<{ closed: string[]; errors: string[] }> {
    const positions = await this.getPositions();
    const closed: string[] = [];
    const errors: string[] = [];

    for (const position of positions) {
      try {
        await this.closePosition(position.coin);
        closed.push(position.coin);
      } catch (error: any) {
        errors.push(`${position.coin}: ${error.message}`);
      }
    }

    return { closed, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSOCKET SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start WebSocket connection for real-time updates
   */
  async startWebSocket(): Promise<void> {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => {
      logger.info('Hyperliquid WebSocket connected');
      this.emit('connected');

      // Subscribe to user events
      this.ws?.send(JSON.stringify({
        method: 'subscribe',
        subscription: {
          type: 'userEvents',
          user: this.credentials.walletAddress,
        },
      }));
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWebSocketMessage(message);
      } catch (error) {
        logger.error('Error parsing WebSocket message', error);
      }
    });

    this.ws.on('close', () => {
      logger.warn('Hyperliquid WebSocket closed');
      this.emit('disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => this.startWebSocket(), 5000);
    });

    this.ws.on('error', (error) => {
      logger.error('Hyperliquid WebSocket error', error);
      this.emit('error', error);
    });
  }

  private handleWebSocketMessage(message: any): void {
    if (message.channel === 'userEvents') {
      this.emit('userEvent', message.data);
    } else if (message.channel === 'trades') {
      this.emit('trade', message.data);
    } else if (message.channel === 'orderUpdates') {
      this.emit('orderUpdate', message.data);
    }
  }

  /**
   * Stop WebSocket connection
   */
  stopWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get list of available perpetual symbols
   */
  async getAvailableSymbols(): Promise<string[]> {
    await this.getMeta();
    return Array.from(this.assetInfoCache.keys());
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
