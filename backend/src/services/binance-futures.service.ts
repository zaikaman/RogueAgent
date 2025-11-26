import crypto from 'crypto';
import axios, { AxiosInstance, AxiosError } from 'axios';
import WebSocket from 'ws';
import { logger } from '../utils/logger.util';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════════
// BINANCE FUTURES SERVICE
// Full USDT-M Perpetual Trading API Implementation
// Supports all 600+ pairs, leverage up to 125x, isolated margin
// ═══════════════════════════════════════════════════════════════════════════════

interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
}

interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'STOP' | 'TAKE_PROFIT';
  quantity?: number;
  price?: number;
  stopPrice?: number;
  closePosition?: boolean;
  reduceOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  newClientOrderId?: string;
  workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
  priceProtect?: boolean;
  positionSide?: 'BOTH' | 'LONG' | 'SHORT';
}

interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: 'isolated' | 'cross';
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

interface AccountBalance {
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
}

interface OrderResult {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  updateTime: number;
}

interface SymbolInfo {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  filters: any[];
  minNotional: number;
  minQty: number;
  maxQty: number;
  tickSize: number;
  stepSize: number;
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
  tpPrice?: number;
  slPrice?: number;
  tpOrderId?: number;
  slOrderId?: number;
}

// WebSocket event types
interface WSAccountUpdate {
  eventType: 'ACCOUNT_UPDATE';
  eventTime: number;
  transactionTime: number;
  updateData: {
    balances: Array<{
      asset: string;
      walletBalance: string;
      crossWalletBalance: string;
      balanceChange: string;
    }>;
    positions: Array<{
      symbol: string;
      positionAmt: string;
      entryPrice: string;
      accumulatedRealized: string;
      unrealizedPnl: string;
      marginType: 'isolated' | 'cross';
      isolatedWallet: string;
      positionSide: 'BOTH' | 'LONG' | 'SHORT';
    }>;
  };
}

interface WSOrderUpdate {
  eventType: 'ORDER_TRADE_UPDATE';
  eventTime: number;
  transactionTime: number;
  order: {
    symbol: string;
    clientOrderId: string;
    side: 'BUY' | 'SELL';
    orderType: string;
    timeInForce: string;
    originalQuantity: string;
    originalPrice: string;
    averagePrice: string;
    stopPrice: string;
    executionType: string;
    orderStatus: string;
    orderId: number;
    lastFilledQuantity: string;
    cumulativeFilledQuantity: string;
    lastFilledPrice: string;
    commissionAsset: string;
    commission: string;
    orderTradeTime: number;
    tradeId: number;
    bidsNotional: string;
    askNotional: string;
    isMaker: boolean;
    isReduceOnly: boolean;
    workingType: string;
    originalOrderType: string;
    positionSide: 'BOTH' | 'LONG' | 'SHORT';
    closeAll: boolean;
    activationPrice: string;
    callbackRate: string;
    priceProtect: boolean;
    realizedProfit: string;
  };
}

export class BinanceFuturesService extends EventEmitter {
  private baseUrl: string;
  private wsBaseUrl: string;
  private credentials: BinanceCredentials;
  private axiosInstance: AxiosInstance;
  private symbolInfoCache: Map<string, SymbolInfo> = new Map();
  private lastExchangeInfoFetch: number = 0;
  private EXCHANGE_INFO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private userDataStream: WebSocket | null = null;
  private listenKey: string | null = null;
  private listenKeyKeepAliveInterval: NodeJS.Timeout | null = null;
  private wsReconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private isTestnet: boolean;

  constructor(credentials: BinanceCredentials, testnet: boolean = false) {
    super();
    this.credentials = credentials;
    this.isTestnet = testnet;
    
    // Use testnet or mainnet URLs
    this.baseUrl = testnet 
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
    this.wsBaseUrl = testnet
      ? 'wss://stream.binancefuture.com'
      : 'wss://fstream.binance.com';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'X-MBX-APIKEY': credentials.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Add response interceptor for rate limit handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          // Rate limited - extract retry-after header
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
          logger.warn(`Binance rate limit hit, retrying after ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
          return this.axiosInstance.request(error.config!);
        }
        if (error.response?.status === 418) {
          logger.error('Binance IP banned! Contact support.');
        }
        throw error;
      }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private buildSignedParams(params: Record<string, any>): string {
    const timestamp = Date.now();
    const recvWindow = 5000;
    
    const allParams: Record<string, any> = {
      ...params,
      recvWindow,
      timestamp,
    };

    // Remove undefined values
    Object.keys(allParams).forEach((key: string) => {
      if (allParams[key] === undefined) {
        delete allParams[key];
      }
    });

    const queryString = new URLSearchParams(allParams as any).toString();
    const signature = this.generateSignature(queryString);
    
    return `${queryString}&signature=${signature}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT & BALANCE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Test connectivity - ping endpoint
   */
  async ping(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/fapi/v1/ping');
      return true;
    } catch (error) {
      logger.error('Binance ping failed', error);
      return false;
    }
  }

  /**
   * Get server time - useful for sync
   */
  async getServerTime(): Promise<number> {
    const response = await this.axiosInstance.get('/fapi/v1/time');
    return response.data.serverTime;
  }

  /**
   * Test API credentials by fetching account balance
   */
  async testConnection(): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const balances = await this.getBalance();
      const usdtBalance = balances.find(b => b.asset === 'USDT');
      return {
        success: true,
        balance: usdtBalance ? parseFloat(usdtBalance.availableBalance) : 0,
      };
    } catch (error: any) {
      const msg = error.response?.data?.msg || error.message;
      logger.error('Binance connection test failed', { error: msg });
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Get account balances
   */
  async getBalance(): Promise<AccountBalance[]> {
    const signedParams = this.buildSignedParams({});
    const response = await this.axiosInstance.get(`/fapi/v3/balance?${signedParams}`);
    return response.data;
  }

  /**
   * Get USDT available balance for trading
   */
  async getUsdtBalance(): Promise<number> {
    const balances = await this.getBalance();
    const usdt = balances.find(b => b.asset === 'USDT');
    return usdt ? parseFloat(usdt.availableBalance) : 0;
  }

  /**
   * Get account equity (wallet balance + unrealized PnL)
   */
  async getAccountEquity(): Promise<number> {
    const balances = await this.getBalance();
    const usdt = balances.find(b => b.asset === 'USDT');
    if (!usdt) return 0;
    
    return parseFloat(usdt.balance) + parseFloat(usdt.crossUnPnl);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all open positions
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    
    const signedParams = this.buildSignedParams(params);
    const response = await this.axiosInstance.get(`/fapi/v2/positionRisk?${signedParams}`);
    
    // Filter to only positions with non-zero amount
    return response.data.filter((p: Position) => parseFloat(p.positionAmt) !== 0);
  }

  /**
   * Get formatted positions with P&L calculation
   */
  async getFormattedPositions(): Promise<TradePosition[]> {
    const positions = await this.getPositions();
    
    return positions.map(p => {
      const positionAmt = parseFloat(p.positionAmt);
      const entryPrice = parseFloat(p.entryPrice);
      const markPrice = parseFloat(p.markPrice);
      const unrealizedPnl = parseFloat(p.unRealizedProfit);
      const leverage = parseInt(p.leverage);
      
      const direction: 'LONG' | 'SHORT' = positionAmt > 0 ? 'LONG' : 'SHORT';
      const quantity = Math.abs(positionAmt);
      
      // Calculate PnL percent
      const notionalValue = quantity * entryPrice;
      const unrealizedPnlPercent = notionalValue > 0 
        ? (unrealizedPnl / notionalValue) * 100 * leverage 
        : 0;

      return {
        symbol: p.symbol,
        direction,
        entryPrice,
        currentPrice: markPrice,
        quantity,
        leverage,
        unrealizedPnl,
        unrealizedPnlPercent,
        liquidationPrice: parseFloat(p.liquidationPrice),
        marginType: p.marginType,
      };
    });
  }

  /**
   * Get position for specific symbol
   */
  async getPosition(symbol: string): Promise<Position | null> {
    const positions = await this.getPositions(symbol);
    return positions.find(p => parseFloat(p.positionAmt) !== 0) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVERAGE & MARGIN OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set leverage for a symbol
   */
  async setLeverage(symbol: string, leverage: number): Promise<{ leverage: number; maxNotionalValue: string }> {
    const signedParams = this.buildSignedParams({ symbol, leverage });
    const response = await this.axiosInstance.post(`/fapi/v1/leverage?${signedParams}`);
    return response.data;
  }

  /**
   * Set margin type for a symbol (ISOLATED or CROSSED)
   */
  async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<boolean> {
    try {
      const signedParams = this.buildSignedParams({ symbol, marginType });
      await this.axiosInstance.post(`/fapi/v1/marginType?${signedParams}`);
      return true;
    } catch (error: any) {
      // Error code -4046 means "No need to change margin type"
      if (error.response?.data?.code === -4046) {
        return true; // Already set to desired margin type
      }
      throw error;
    }
  }

  /**
   * Get current position mode (Hedge Mode or One-Way)
   */
  async getPositionMode(): Promise<boolean> {
    const signedParams = this.buildSignedParams({});
    const response = await this.axiosInstance.get(`/fapi/v1/positionSide/dual?${signedParams}`);
    return response.data.dualSidePosition;
  }

  /**
   * Set position mode (Hedge Mode = true, One-Way = false)
   * Must have no open positions to change
   */
  async setPositionMode(dualSidePosition: boolean): Promise<boolean> {
    try {
      const signedParams = this.buildSignedParams({ dualSidePosition: dualSidePosition.toString() });
      await this.axiosInstance.post(`/fapi/v1/positionSide/dual?${signedParams}`);
      return true;
    } catch (error: any) {
      // Error -4059 means "No need to change position side"
      if (error.response?.data?.code === -4059) {
        return true;
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCHANGE INFO & SYMBOL OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get exchange info and cache symbol data
   */
  async loadExchangeInfo(): Promise<void> {
    if (Date.now() - this.lastExchangeInfoFetch < this.EXCHANGE_INFO_CACHE_TTL) {
      return; // Cache still valid
    }

    const response = await this.axiosInstance.get('/fapi/v1/exchangeInfo');
    
    this.symbolInfoCache.clear();
    
    for (const symbol of response.data.symbols) {
      if (symbol.contractType === 'PERPETUAL' && symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING') {
        const filters = symbol.filters;
        
        const priceFilter = filters.find((f: any) => f.filterType === 'PRICE_FILTER');
        const lotFilter = filters.find((f: any) => f.filterType === 'LOT_SIZE');
        const notionalFilter = filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');
        
        this.symbolInfoCache.set(symbol.symbol, {
          symbol: symbol.symbol,
          pair: symbol.pair,
          contractType: symbol.contractType,
          status: symbol.status,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          pricePrecision: symbol.pricePrecision,
          quantityPrecision: symbol.quantityPrecision,
          filters,
          minNotional: notionalFilter ? parseFloat(notionalFilter.notional) : 5,
          minQty: lotFilter ? parseFloat(lotFilter.minQty) : 0.001,
          maxQty: lotFilter ? parseFloat(lotFilter.maxQty) : 1000,
          tickSize: priceFilter ? parseFloat(priceFilter.tickSize) : 0.01,
          stepSize: lotFilter ? parseFloat(lotFilter.stepSize) : 0.001,
        });
      }
    }
    
    this.lastExchangeInfoFetch = Date.now();
    logger.info(`Loaded ${this.symbolInfoCache.size} USDT perpetual symbols`);
  }

  /**
   * Get symbol info from cache
   */
  async getSymbolInfo(symbol: string): Promise<SymbolInfo | null> {
    await this.loadExchangeInfo();
    return this.symbolInfoCache.get(symbol) || null;
  }

  /**
   * Check if symbol is available for trading
   */
  async isSymbolAvailable(symbol: string): Promise<boolean> {
    await this.loadExchangeInfo();
    return this.symbolInfoCache.has(symbol);
  }

  /**
   * Format symbol from token symbol (e.g., BTC -> BTCUSDT)
   */
  formatSymbol(tokenSymbol: string): string {
    const upper = tokenSymbol.toUpperCase();
    return upper.endsWith('USDT') ? upper : `${upper}USDT`;
  }

  /**
   * Round price to symbol precision
   */
  async roundPrice(symbol: string, price: number): Promise<number> {
    const info = await this.getSymbolInfo(symbol);
    if (!info) throw new Error(`Symbol ${symbol} not found`);
    
    const precision = info.pricePrecision;
    return Math.round(price * Math.pow(10, precision)) / Math.pow(10, precision);
  }

  /**
   * Round quantity to symbol precision
   */
  async roundQuantity(symbol: string, quantity: number): Promise<number> {
    const info = await this.getSymbolInfo(symbol);
    if (!info) throw new Error(`Symbol ${symbol} not found`);
    
    const stepSize = info.stepSize;
    return Math.floor(quantity / stepSize) * stepSize;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Place a new order
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
    };

    if (params.quantity !== undefined) orderParams.quantity = params.quantity;
    if (params.price !== undefined) orderParams.price = params.price;
    if (params.stopPrice !== undefined) orderParams.stopPrice = params.stopPrice;
    if (params.closePosition !== undefined) orderParams.closePosition = params.closePosition;
    if (params.reduceOnly !== undefined) orderParams.reduceOnly = params.reduceOnly;
    if (params.timeInForce !== undefined) orderParams.timeInForce = params.timeInForce;
    if (params.newClientOrderId !== undefined) orderParams.newClientOrderId = params.newClientOrderId;
    if (params.workingType !== undefined) orderParams.workingType = params.workingType;
    if (params.priceProtect !== undefined) orderParams.priceProtect = params.priceProtect;
    if (params.positionSide !== undefined) orderParams.positionSide = params.positionSide;

    const signedParams = this.buildSignedParams(orderParams);
    const response = await this.axiosInstance.post(`/fapi/v1/order?${signedParams}`);
    return response.data;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<OrderResult> {
    const signedParams = this.buildSignedParams({ symbol, orderId });
    const response = await this.axiosInstance.delete(`/fapi/v1/order?${signedParams}`);
    return response.data;
  }

  /**
   * Cancel all open orders for a symbol
   */
  async cancelAllOrders(symbol: string): Promise<boolean> {
    const signedParams = this.buildSignedParams({ symbol });
    await this.axiosInstance.delete(`/fapi/v1/allOpenOrders?${signedParams}`);
    return true;
  }

  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<OrderResult[]> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    
    const signedParams = this.buildSignedParams(params);
    const response = await this.axiosInstance.get(`/fapi/v1/openOrders?${signedParams}`);
    return response.data;
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const response = await this.axiosInstance.get(`/fapi/v1/ticker/price?symbol=${symbol}`);
    return parseFloat(response.data.price);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION SIZE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate position size based on risk percentage
   * @param symbol - Trading pair (e.g., BTCUSDT)
   * @param riskPercent - Risk percentage (e.g., 1 for 1%)
   * @param entryPrice - Entry price
   * @param stopLossPrice - Stop loss price
   * @param leverage - Leverage to use
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
    
    // Calculate risk per unit
    const priceDiff = Math.abs(entryPrice - stopLossPrice);
    const riskPerUnit = priceDiff;
    
    // Calculate raw quantity
    let quantity = riskAmount / riskPerUnit;
    
    // Round to symbol precision
    quantity = await this.roundQuantity(symbol, quantity);
    
    // Calculate notional value and margin
    const notionalValue = quantity * entryPrice;
    const margin = notionalValue / leverage;
    
    // Verify minimum notional
    const info = await this.getSymbolInfo(symbol);
    if (info && notionalValue < info.minNotional) {
      throw new Error(`Position notional value ($${notionalValue.toFixed(2)}) is below minimum ($${info.minNotional})`);
    }
    
    // Verify we have enough margin
    const usdtBalance = await this.getUsdtBalance();
    if (margin > usdtBalance) {
      throw new Error(`Insufficient margin. Required: $${margin.toFixed(2)}, Available: $${usdtBalance.toFixed(2)}`);
    }
    
    return { quantity, notionalValue, margin };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BRACKET ORDER (ENTRY + TP + SL)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Open a position with take profit and stop loss
   * This is the main function for executing trades from signals
   */
  async openBracketPosition(params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    riskPercent: number;
    leverage: number;
    entryPrice?: number; // If not provided, uses market order
    takeProfitPrice: number;
    stopLossPrice: number;
    clientOrderIdPrefix?: string;
  }): Promise<{
    entryOrder: OrderResult;
    tpOrder: OrderResult;
    slOrder: OrderResult;
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

    // Ensure position mode is set to One-Way
    await this.setPositionMode(false);
    
    // Set margin type to ISOLATED
    await this.setMarginType(symbol, 'ISOLATED');
    
    // Set leverage
    await this.setLeverage(symbol, leverage);

    // Get current price if entry not specified
    const currentPrice = entryPrice || await this.getPrice(symbol);
    
    // Calculate position size
    const positionSize = await this.calculatePositionSize(
      symbol,
      riskPercent,
      currentPrice,
      stopLossPrice,
      leverage
    );

    const orderSide = side === 'LONG' ? 'BUY' : 'SELL';
    const closeOrderSide = side === 'LONG' ? 'SELL' : 'BUY';
    const uniqueId = Date.now().toString(36);

    // Round prices
    const roundedTP = await this.roundPrice(symbol, takeProfitPrice);
    const roundedSL = await this.roundPrice(symbol, stopLossPrice);

    // 1. Place market entry order
    const entryOrder = await this.placeOrder({
      symbol,
      side: orderSide,
      type: 'MARKET',
      quantity: positionSize.quantity,
      newClientOrderId: `${clientOrderIdPrefix}_ENTRY_${uniqueId}`,
    });

    logger.info(`Entry order placed: ${entryOrder.orderId} for ${positionSize.quantity} ${symbol}`);

    // 2. Place take profit order
    const tpOrder = await this.placeOrder({
      symbol,
      side: closeOrderSide,
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: roundedTP,
      closePosition: true,
      workingType: 'CONTRACT_PRICE',
      priceProtect: true,
      newClientOrderId: `${clientOrderIdPrefix}_TP_${uniqueId}`,
    });

    logger.info(`Take profit order placed: ${tpOrder.orderId} at ${roundedTP}`);

    // 3. Place stop loss order
    const slOrder = await this.placeOrder({
      symbol,
      side: closeOrderSide,
      type: 'STOP_MARKET',
      stopPrice: roundedSL,
      closePosition: true,
      workingType: 'CONTRACT_PRICE',
      priceProtect: true,
      newClientOrderId: `${clientOrderIdPrefix}_SL_${uniqueId}`,
    });

    logger.info(`Stop loss order placed: ${slOrder.orderId} at ${roundedSL}`);

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

    const positionAmt = parseFloat(position.positionAmt);
    const side = positionAmt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(positionAmt);

    // Cancel all open orders first
    await this.cancelAllOrders(symbol);

    // Place market close order
    const closeOrder = await this.placeOrder({
      symbol,
      side,
      type: 'MARKET',
      quantity,
      reduceOnly: true,
      newClientOrderId: `ROGUE_CLOSE_${Date.now().toString(36)}`,
    });

    logger.info(`Position closed: ${closeOrder.orderId} for ${quantity} ${symbol}`);
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
        await this.closePosition(position.symbol);
        closed.push(position.symbol);
      } catch (error: any) {
        errors.push(`${position.symbol}: ${error.message}`);
      }
    }

    return { closed, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSOCKET USER DATA STREAM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start user data stream for real-time updates
   */
  async startUserDataStream(): Promise<void> {
    // Get listen key
    const signedParams = this.buildSignedParams({});
    const response = await this.axiosInstance.post(`/fapi/v1/listenKey`);
    this.listenKey = response.data.listenKey;

    // Connect WebSocket
    this.connectUserDataWebSocket();

    // Keep alive every 30 minutes
    this.listenKeyKeepAliveInterval = setInterval(() => {
      this.keepAliveListenKey();
    }, 30 * 60 * 1000);
  }

  private connectUserDataWebSocket(): void {
    if (!this.listenKey) return;

    const wsUrl = `${this.wsBaseUrl}/ws/${this.listenKey}`;
    this.userDataStream = new WebSocket(wsUrl);

    this.userDataStream.on('open', () => {
      logger.info('Binance user data WebSocket connected');
      this.wsReconnectAttempts = 0;
      this.emit('connected');
    });

    this.userDataStream.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleUserDataMessage(message);
      } catch (error) {
        logger.error('Error parsing WebSocket message', error);
      }
    });

    this.userDataStream.on('close', () => {
      logger.warn('Binance user data WebSocket closed');
      this.emit('disconnected');
      this.reconnectUserDataStream();
    });

    this.userDataStream.on('error', (error) => {
      logger.error('Binance user data WebSocket error', error);
      this.emit('error', error);
    });
  }

  private handleUserDataMessage(message: any): void {
    switch (message.e) {
      case 'ACCOUNT_UPDATE':
        this.emit('accountUpdate', {
          eventType: 'ACCOUNT_UPDATE',
          eventTime: message.E,
          transactionTime: message.T,
          updateData: {
            balances: message.a.B.map((b: any) => ({
              asset: b.a,
              walletBalance: b.wb,
              crossWalletBalance: b.cw,
              balanceChange: b.bc,
            })),
            positions: message.a.P.map((p: any) => ({
              symbol: p.s,
              positionAmt: p.pa,
              entryPrice: p.ep,
              accumulatedRealized: p.cr,
              unrealizedPnl: p.up,
              marginType: p.mt,
              isolatedWallet: p.iw,
              positionSide: p.ps,
            })),
          },
        } as WSAccountUpdate);
        break;

      case 'ORDER_TRADE_UPDATE':
        this.emit('orderUpdate', {
          eventType: 'ORDER_TRADE_UPDATE',
          eventTime: message.E,
          transactionTime: message.T,
          order: {
            symbol: message.o.s,
            clientOrderId: message.o.c,
            side: message.o.S,
            orderType: message.o.o,
            timeInForce: message.o.f,
            originalQuantity: message.o.q,
            originalPrice: message.o.p,
            averagePrice: message.o.ap,
            stopPrice: message.o.sp,
            executionType: message.o.x,
            orderStatus: message.o.X,
            orderId: message.o.i,
            lastFilledQuantity: message.o.l,
            cumulativeFilledQuantity: message.o.z,
            lastFilledPrice: message.o.L,
            commissionAsset: message.o.N,
            commission: message.o.n,
            orderTradeTime: message.o.T,
            tradeId: message.o.t,
            bidsNotional: message.o.b,
            askNotional: message.o.a,
            isMaker: message.o.m,
            isReduceOnly: message.o.R,
            workingType: message.o.wt,
            originalOrderType: message.o.ot,
            positionSide: message.o.ps,
            closeAll: message.o.cp,
            activationPrice: message.o.AP,
            callbackRate: message.o.cr,
            priceProtect: message.o.pP,
            realizedProfit: message.o.rp,
          },
        } as WSOrderUpdate);
        break;

      case 'listenKeyExpired':
        logger.warn('Listen key expired, recreating...');
        this.startUserDataStream();
        break;
    }
  }

  private async keepAliveListenKey(): Promise<void> {
    try {
      await this.axiosInstance.put(`/fapi/v1/listenKey`);
    } catch (error) {
      logger.error('Error keeping listen key alive', error);
      // Try to recreate
      await this.startUserDataStream();
    }
  }

  private reconnectUserDataStream(): void {
    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max WebSocket reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);
    this.wsReconnectAttempts++;

    logger.info(`Reconnecting WebSocket in ${delay}ms (attempt ${this.wsReconnectAttempts})`);

    setTimeout(() => {
      this.connectUserDataWebSocket();
    }, delay);
  }

  /**
   * Stop user data stream
   */
  async stopUserDataStream(): Promise<void> {
    if (this.listenKeyKeepAliveInterval) {
      clearInterval(this.listenKeyKeepAliveInterval);
      this.listenKeyKeepAliveInterval = null;
    }

    if (this.userDataStream) {
      this.userDataStream.close();
      this.userDataStream = null;
    }

    if (this.listenKey) {
      try {
        await this.axiosInstance.delete(`/fapi/v1/listenKey`);
      } catch (error) {
        logger.warn('Error closing listen key', error);
      }
      this.listenKey = null;
    }
  }

  /**
   * Get trade history for a symbol
   */
  async getTradeHistory(symbol: string, limit: number = 50): Promise<any[]> {
    const signedParams = this.buildSignedParams({ symbol, limit });
    const response = await this.axiosInstance.get(`/fapi/v1/userTrades?${signedParams}`);
    return response.data;
  }

  /**
   * Get income history (funding, realized PnL, etc.)
   */
  async getIncomeHistory(params: {
    symbol?: string;
    incomeType?: 'REALIZED_PNL' | 'FUNDING_FEE' | 'COMMISSION' | 'TRANSFER';
    limit?: number;
  } = {}): Promise<any[]> {
    const signedParams = this.buildSignedParams({
      ...params,
      limit: params.limit || 100,
    });
    const response = await this.axiosInstance.get(`/fapi/v1/income?${signedParams}`);
    return response.data;
  }
}

// Factory function to create service instance
export function createBinanceFuturesService(
  apiKey: string,
  apiSecret: string,
  testnet: boolean = false
): BinanceFuturesService {
  return new BinanceFuturesService({ apiKey, apiSecret }, testnet);
}
