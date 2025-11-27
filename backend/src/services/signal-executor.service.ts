import { futuresAgentsService, FuturesAgent, FuturesTrade } from './futures-agents.service';
import { signalJobsService, SignalJob } from './signal-jobs.service';
import { SignalContent } from '../../shared/types/signal.types';
import { logger } from '../utils/logger.util';
import axios from 'axios';
import { config } from '../config/env.config';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL EXECUTOR SERVICE
// Processes Rogue signals and executes trades for all active Diamond agents
// ═══════════════════════════════════════════════════════════════════════════════

interface SignalPayload {
  signalId: string;
  signal: SignalContent;
}

interface AgentEvaluationResult {
  agentId: string;
  agentName: string;
  shouldTrade: boolean;
  reason: string;
  confidence: number;
}

interface TradeExecutionResult {
  agentId: string;
  agentName: string;
  walletAddress: string;
  success: boolean;
  trade?: Partial<FuturesTrade>;
  error?: string;
  jobId?: string; // For queued custom agent signals
}

class SignalExecutorService {
  private llmBaseUrl: string;
  private llmApiKey: string;
  private llmModel: string;

  constructor() {
    this.llmBaseUrl = config.SCANNER_BASE_URL || config.OPENAI_BASE_URL;
    this.llmApiKey = config.SCANNER_API_KEY || config.OPENAI_API_KEY || '';
    this.llmModel = config.SCANNER_MODEL || config.OPENAI_MODEL;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SIGNAL PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process a new signal for all active Diamond agents
   * Classic agents are processed immediately, custom agents are queued for background processing
   */
  async processSignal(payload: SignalPayload): Promise<{
    processed: number;
    executed: number;
    queued: number;
    results: TradeExecutionResult[];
  }> {
    const { signalId, signal } = payload;
    
    logger.info(`Processing signal ${signalId} for ${signal.token.symbol}`);

    // Get all Diamond users with active agents
    const diamondUsers = await futuresAgentsService.getDiamondUsersWithActiveAgents();
    
    if (diamondUsers.length === 0) {
      logger.info('No Diamond users with active agents');
      return { processed: 0, executed: 0, queued: 0, results: [] };
    }

    const results: TradeExecutionResult[] = [];
    let processed = 0;
    let executed = 0;
    let queued = 0;

    // Process each user's agents
    for (const user of diamondUsers) {
      for (const agent of user.agents) {
        processed++;
        
        try {
          // Custom agents with prompts get queued for background processing
          if (agent.type === 'custom' && agent.custom_prompt) {
            const job = await signalJobsService.createJob({
              walletAddress: user.walletAddress,
              agentId: agent.id,
              signalId,
              signalData: signal,
            });
            
            if (job) {
              queued++;
              results.push({
                agentId: agent.id,
                agentName: agent.name,
                walletAddress: user.walletAddress,
                success: true,
                error: undefined,
                jobId: job.id, // Include job ID for tracking
              });
            } else {
              results.push({
                agentId: agent.id,
                agentName: agent.name,
                walletAddress: user.walletAddress,
                success: false,
                error: 'Failed to queue signal job',
              });
            }
          } else {
            // Classic agents and custom agents without prompts are processed immediately
            const result = await this.processAgentSignal(
              user.walletAddress,
              agent,
              signalId,
              signal
            );
            
            results.push(result);
            if (result.success) executed++;
          }
        } catch (error: any) {
          results.push({
            agentId: agent.id,
            agentName: agent.name,
            walletAddress: user.walletAddress,
            success: false,
            error: error.message,
          });
        }
      }
    }

    logger.info(`Signal ${signalId} processed: ${processed} agents, ${executed} trades executed, ${queued} queued`);
    return { processed, executed, queued, results };
  }

  /**
   * Process signal for a specific agent
   */
  private async processAgentSignal(
    walletAddress: string,
    agent: FuturesAgent,
    signalId: string,
    signal: SignalContent
  ): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      agentId: agent.id,
      agentName: agent.name,
      walletAddress,
      success: false,
    };

    // 1. Check if symbol is available on Hyperliquid
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) {
      result.error = 'No Hyperliquid service available';
      return result;
    }

    const futuresSymbol = hyperliquid.formatSymbol(signal.token.symbol);
    const isAvailable = await hyperliquid.isSymbolAvailable(futuresSymbol);
    
    if (!isAvailable) {
      result.error = `Symbol ${futuresSymbol} not available on Hyperliquid`;
      return result;
    }

    // 2. Check max concurrent positions
    const positions = await futuresAgentsService.getAgentPositions(agent.id);
    if (positions.length >= agent.max_concurrent_positions) {
      result.error = `Max concurrent positions reached (${agent.max_concurrent_positions})`;
      return result;
    }

    // 3. For custom agents, evaluate prompt
    if (agent.type === 'custom' && agent.custom_prompt) {
      const evaluation = await this.evaluateAgentPrompt(agent, signal);
      
      if (!evaluation.shouldTrade) {
        result.error = `Agent prompt evaluation: ${evaluation.reason}`;
        return result;
      }
    }

    // 4. Execute the trade
    try {
      // Use direction from signal (LONG or SHORT), with fallback to price-based detection
      const direction: 'LONG' | 'SHORT' = signal.direction || 
        (signal.target_price > signal.entry_price ? 'LONG' : 'SHORT');
      
      // Calculate prices
      const entryPrice = signal.entry_price;
      const takeProfitPrice = signal.target_price;
      const stopLossPrice = signal.stop_loss;
      
      // Determine order type (market or limit)
      const orderType = signal.order_type || 'market';
      
      // Get max leverage for this specific asset from Hyperliquid
      const assetMaxLeverage = await hyperliquid.getMaxLeverage(futuresSymbol);
      
      // Apply agent's max leverage, capped by the asset's max leverage
      const signalRiskPercent = Math.abs((stopLossPrice - entryPrice) / entryPrice) * 100;
      const maxLeverageFromRisk = Math.floor(100 / signalRiskPercent);
      const leverage = Math.min(agent.max_leverage, maxLeverageFromRisk, assetMaxLeverage);
      
      logger.info(`Leverage for ${futuresSymbol}: ${leverage}x (agent: ${agent.max_leverage}x, risk-based: ${maxLeverageFromRisk}x, asset max: ${assetMaxLeverage}x)`);
      logger.info(`Order type for ${futuresSymbol}: ${orderType}${orderType === 'limit' ? ` @ $${entryPrice}` : ''}`);

      const tradeResult = await hyperliquid.openBracketPosition({
        symbol: futuresSymbol,
        side: direction,
        riskPercent: agent.risk_per_trade,
        leverage,
        takeProfitPrice,
        stopLossPrice,
        entryPrice: orderType === 'limit' ? entryPrice : undefined,
        orderType,
        clientOrderIdPrefix: `ROGUE_${agent.id.slice(0, 8)}`,
      });

      // Extract order IDs from Hyperliquid response
      const entryOid = tradeResult.entryOrder?.response?.data?.statuses?.[0]?.filled?.oid || 
                       tradeResult.entryOrder?.response?.data?.statuses?.[0]?.resting?.oid || 0;
      const tpOid = tradeResult.tpOrder?.response?.data?.statuses?.[0]?.resting?.oid || null;
      const slOid = tradeResult.slOrder?.response?.data?.statuses?.[0]?.resting?.oid || null;
      
      // For limit orders that are resting (not filled immediately), store pending TP/SL prices
      // These will be used to place TP/SL orders when the limit entry fills
      const isLimitOrderPending = orderType === 'limit' && 
                                   tradeResult.entryOrder?.response?.data?.statuses?.[0]?.resting && 
                                   !tradeResult.tpOrder && !tradeResult.slOrder;

      // Get network mode for trade recording
      const networkMode = await futuresAgentsService.getNetworkMode(walletAddress);

      // Record the trade
      const trade = await futuresAgentsService.recordTrade({
        agent_id: agent.id,
        user_wallet_address: walletAddress,
        signal_id: signalId,
        symbol: futuresSymbol,
        direction,
        entry_price: entryPrice,
        exit_price: null,
        quantity: tradeResult.position.quantity,
        leverage,
        risk_percent: agent.risk_per_trade,
        pnl_usd: null,
        pnl_percent: null,
        status: isLimitOrderPending ? 'pending' : 'open',
        entry_order_id: entryOid.toString(),
        tp_order_id: tpOid?.toString() || null,
        sl_order_id: slOid?.toString() || null,
        pending_tp_price: isLimitOrderPending ? takeProfitPrice : null,
        pending_sl_price: isLimitOrderPending ? stopLossPrice : null,
        error_message: null,
        network_mode: networkMode,
        opened_at: new Date().toISOString(),
        closed_at: null,
      });
      
      if (isLimitOrderPending) {
        logger.info(`Limit order pending for ${futuresSymbol}. TP/SL will be placed when entry fills. Entry OID: ${entryOid}`);
      }

      result.success = true;
      result.trade = trade || undefined;
      
      logger.info(`Trade executed for agent ${agent.name}: ${direction} ${futuresSymbol} @ ${leverage}x`);
    } catch (error: any) {
      result.error = error.message;
      logger.error(`Trade execution failed for agent ${agent.name}`, error);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LLM PROMPT EVALUATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Evaluate a custom agent's prompt against a signal
   */
  async evaluateAgentPrompt(
    agent: FuturesAgent,
    signal: SignalContent
  ): Promise<AgentEvaluationResult> {
    const result: AgentEvaluationResult = {
      agentId: agent.id,
      agentName: agent.name,
      shouldTrade: false,
      reason: '',
      confidence: 0,
    };

    if (!agent.custom_prompt) {
      result.shouldTrade = true;
      result.reason = 'No custom prompt, accepting all signals';
      result.confidence = 100;
      return result;
    }

    const systemPrompt = `You are a trading agent decision evaluator. You must decide whether a given crypto signal matches the user's trading criteria.

IMPORTANT: You must respond with ONLY a valid JSON object, no other text.

Response format:
{
  "shouldTrade": boolean,
  "reason": "brief explanation",
  "confidence": number (0-100)
}`;

    const userPrompt = `AGENT TRADING RULES:
${agent.custom_prompt}

SIGNAL DETAILS:
- Token: ${signal.token.symbol} (${signal.token.name})
- Direction: ${signal.target_price > signal.entry_price ? 'LONG' : 'SHORT'}
- Entry Price: $${signal.entry_price.toFixed(4)}
- Target Price: $${signal.target_price.toFixed(4)}
- Stop Loss: $${signal.stop_loss.toFixed(4)}
- Confidence Score: ${signal.confidence}/10
- Trigger Event: ${signal.trigger_event.type}${signal.trigger_event.kol_handle ? ` (${signal.trigger_event.kol_handle})` : ''}
- Analysis: ${signal.analysis.substring(0, 500)}

Does this signal match the agent's trading rules? Respond with JSON only.`;

    try {
      const response = await axios.post(
        `${this.llmBaseUrl}/chat/completions`,
        {
          model: this.llmModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 200,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.llmApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.shouldTrade = !!parsed.shouldTrade;
        result.reason = parsed.reason || 'No reason provided';
        result.confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 50;
      } else {
        result.reason = 'Failed to parse LLM response';
      }
    } catch (error: any) {
      logger.error('LLM evaluation error', error);
      result.reason = `LLM error: ${error.message}`;
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION MONITORING (Called periodically)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check for closed positions and update trades
   */
  async syncAllPositions(): Promise<void> {
    const diamondUsers = await futuresAgentsService.getDiamondUsersWithActiveAgents();
    
    for (const user of diamondUsers) {
      try {
        await futuresAgentsService.syncPositions(user.walletAddress);
        
        // Also monitor pending limit orders and place TP/SL when they fill
        await this.monitorPendingLimitOrders(user.walletAddress);
      } catch (error) {
        logger.error(`Error syncing positions for ${user.walletAddress}`, error);
      }
    }
  }

  /**
   * Update trade statuses based on Hyperliquid order fills
   */
  async updateTradeStatuses(walletAddress: string): Promise<void> {
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) return;

    // Get open trades from database
    const trades = await futuresAgentsService.getUserTrades(walletAddress, 100);
    // Filter for open trades that are NOT pending limit orders (those are handled by monitorPendingLimitOrders)
    const openTrades = trades.filter(t => 
      t.status === 'open' && 
      !(t.pending_tp_price !== null && t.pending_sl_price !== null)
    );

    if (openTrades.length === 0) return;

    // Get all fills once (more efficient)
    const fills = await hyperliquid.getFills(100);
    
    for (const trade of openTrades) {
      try {
        // Check if position is still open
        const position = await hyperliquid.getPosition(trade.symbol);
        
        if (!position || parseFloat(position.szi) === 0) {
          // Position is closed - get the actual close price from fills
          // Normalize symbol for comparison (fills may use ETH-PERP or just ETH)
          const tradeSymbol = trade.symbol.toUpperCase().replace(/-PERP$/, '');
          
          // Find fills for this symbol that happened after the trade opened
          const relevantFills = fills.filter((f: any) => {
            const fillSymbol = (f.coin || '').toUpperCase().replace(/-PERP$/, '');
            const fillTime = f.time ? new Date(f.time).getTime() : 0;
            const tradeTime = new Date(trade.opened_at).getTime();
            return fillSymbol === tradeSymbol && fillTime > tradeTime;
          });
          
          logger.info(`Trade ${trade.id} (${trade.symbol}): Found ${relevantFills.length} relevant fills after ${trade.opened_at}`);
          
          let closePrice: number;
          if (relevantFills.length > 0) {
            // Sort by time and get the latest fill
            relevantFills.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
            closePrice = parseFloat(relevantFills[0].px);
            logger.info(`Using fill price: ${closePrice} from ${relevantFills[0].time}`);
          } else {
            // No fills found - try to get current price as fallback
            try {
              closePrice = await hyperliquid.getPrice(trade.symbol);
              logger.warn(`No fills found for ${trade.symbol}, using current price: ${closePrice}`);
            } catch {
              closePrice = trade.entry_price;
              logger.warn(`No fills and no price for ${trade.symbol}, using entry price: ${closePrice}`);
            }
          }
          
          // Calculate PnL
          // pnlPercent is the leveraged return percentage (what the user sees as ROI)
          const pnlPercent = trade.direction === 'LONG'
            ? ((closePrice - trade.entry_price) / trade.entry_price) * 100 * trade.leverage
            : ((trade.entry_price - closePrice) / trade.entry_price) * 100 * trade.leverage;
          
          // Calculate USD PnL based on actual position value (notional)
          // positionValue is the notional size (entry_price * quantity)
          // pnlUsd = price change percentage (unleveraged) * notional value
          const positionValue = trade.entry_price * trade.quantity;
          const priceChangePercent = trade.direction === 'LONG'
            ? ((closePrice - trade.entry_price) / trade.entry_price) * 100
            : ((trade.entry_price - closePrice) / trade.entry_price) * 100;
          const pnlUsd = (priceChangePercent / 100) * positionValue;
          
          const status: 'tp_hit' | 'sl_hit' = pnlPercent > 0 ? 'tp_hit' : 'sl_hit';
          
          // Update the trade in database
          await futuresAgentsService.updateTrade(trade.id, {
            exit_price: closePrice,
            pnl_usd: pnlUsd,
            pnl_percent: pnlPercent,
            status,
            closed_at: new Date().toISOString(),
          });
          
          logger.info(`Trade ${trade.id} closed: ${status} at ${closePrice}, PnL: ${pnlPercent.toFixed(2)}% ($${pnlUsd.toFixed(2)})`);
        }
      } catch (error) {
        logger.error(`Error updating trade ${trade.id}`, error);
      }
    }
  }

  /**
   * Monitor pending limit orders and place TP/SL when they fill
   * This handles the case where a limit entry order is placed but hasn't filled yet
   * When the limit order fills, we need to place the TP and SL orders
   */
  async monitorPendingLimitOrders(walletAddress: string): Promise<{ processed: number; bracketPlaced: number; errors: string[] }> {
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) return { processed: 0, bracketPlaced: 0, errors: ['No Hyperliquid service available'] };

    // Get open trades that have pending TP/SL prices (limit orders waiting for fill)
    const trades = await futuresAgentsService.getUserTrades(walletAddress, 100);
    const pendingLimitTrades = trades.filter(t => 
      t.status === 'pending' && 
      t.pending_tp_price !== null && 
      t.pending_sl_price !== null &&
      t.tp_order_id === null && 
      t.sl_order_id === null
    );

    if (pendingLimitTrades.length === 0) {
      return { processed: 0, bracketPlaced: 0, errors: [] };
    }

    logger.info(`Monitoring ${pendingLimitTrades.length} pending limit orders for ${walletAddress}`);

    // Get all open orders and positions
    const openOrders = await hyperliquid.getOpenOrders();
    const fills = await hyperliquid.getFills(100);
    
    let processed = 0;
    let bracketPlaced = 0;
    const errors: string[] = [];

    for (const trade of pendingLimitTrades) {
      processed++;
      try {
        const tradeSymbol = trade.symbol.toUpperCase().replace(/-PERP$/, '');
        const entryOrderId = parseInt(trade.entry_order_id);
        
        // Check if the entry order is still resting (not filled)
        const isOrderStillOpen = openOrders.some((order: any) => {
          const orderSymbol = (order.coin || '').toUpperCase().replace(/-PERP$/, '');
          return orderSymbol === tradeSymbol && order.oid === entryOrderId;
        });

        if (isOrderStillOpen) {
          // Entry order still pending, skip for now
          logger.debug(`Trade ${trade.id} (${trade.symbol}): Limit order ${entryOrderId} still pending`);
          continue;
        }

        // Entry order is no longer in open orders - check if it was filled or cancelled
        // Look for fills for this symbol after the trade was opened
        const relevantFills = fills.filter((f: any) => {
          const fillSymbol = (f.coin || '').toUpperCase().replace(/-PERP$/, '');
          const fillTime = f.time ? new Date(f.time).getTime() : 0;
          const tradeTime = new Date(trade.opened_at).getTime();
          return fillSymbol === tradeSymbol && fillTime >= tradeTime;
        });

        // Check if we have an entry fill
        const entryFill = relevantFills.find((f: any) => {
          // Entry fill should be buy for LONG, sell for SHORT
          const isBuyFill = f.side === 'B' || f.side === 'buy';
          const isLong = trade.direction === 'LONG';
          return (isLong && isBuyFill) || (!isLong && !isBuyFill);
        });

        if (!entryFill) {
          // Order was cancelled or not filled - mark trade as error
          logger.warn(`Trade ${trade.id}: Limit order ${entryOrderId} not found and no fill detected. May have been cancelled.`);
          await futuresAgentsService.updateTrade(trade.id, {
            status: 'error',
            error_message: 'Limit order cancelled or expired without fill',
            pending_tp_price: null,
            pending_sl_price: null,
          });
          errors.push(`Trade ${trade.id}: Limit order cancelled or expired`);
          continue;
        }

        // Entry order was filled! Now place TP and SL orders
        logger.info(`Trade ${trade.id} (${trade.symbol}): Limit order filled! Placing TP/SL brackets...`);

        // Verify position actually exists before placing brackets
        const position = await hyperliquid.getPosition(trade.symbol);
        if (!position || parseFloat(position.szi) === 0) {
          logger.warn(`Trade ${trade.id}: Entry filled but no position found. Position may have been closed.`);
          await futuresAgentsService.updateTrade(trade.id, {
            pending_tp_price: null,
            pending_sl_price: null,
          });
          continue;
        }

        const actualQuantity = Math.abs(parseFloat(position.szi)) || parseFloat(entryFill.sz) || trade.quantity;
        const actualEntryPrice = parseFloat(position.entryPx) || parseFloat(entryFill.px) || trade.entry_price;
        const isBuy = trade.direction === 'LONG';

        // Place Take Profit order (limit, reduce-only)
        let tpOid: string | null = null;
        try {
          const tpOrder = await hyperliquid.placeOrder({
            symbol: trade.symbol,
            isBuy: !isBuy, // Opposite side
            size: actualQuantity,
            price: trade.pending_tp_price!,
            reduceOnly: true,
            orderType: 'limit',
            timeInForce: 'Gtc',
          });
          tpOid = tpOrder.response?.data?.statuses?.[0]?.resting?.oid?.toString() || null;
          logger.info(`TP order placed for ${trade.symbol} at $${trade.pending_tp_price}, OID: ${tpOid}`);
        } catch (tpError: any) {
          logger.error(`Failed to place TP order for trade ${trade.id}`, tpError);
          errors.push(`Trade ${trade.id}: TP order failed - ${tpError.message}`);
        }

        // Place Stop Loss order (trigger order, reduce-only)
        let slOid: string | null = null;
        try {
          const slOrder = await hyperliquid.placeTriggerOrder({
            symbol: trade.symbol,
            isBuy: !isBuy, // Opposite side
            size: actualQuantity,
            triggerPrice: trade.pending_sl_price!,
            reduceOnly: true,
            triggerType: 'sl',
          });
          slOid = slOrder.response?.data?.statuses?.[0]?.resting?.oid?.toString() || null;
          logger.info(`SL trigger order placed for ${trade.symbol} at $${trade.pending_sl_price}, OID: ${slOid}`);
        } catch (slError: any) {
          logger.error(`Failed to place SL order for trade ${trade.id}`, slError);
          errors.push(`Trade ${trade.id}: SL order failed - ${slError.message}`);
        }

        // Update the trade with the new order IDs and clear pending prices
        // Also change status from 'pending' to 'open' since the entry has filled
        await futuresAgentsService.updateTrade(trade.id, {
          status: 'open',
          tp_order_id: tpOid,
          sl_order_id: slOid,
          pending_tp_price: null,
          pending_sl_price: null,
        });

        if (tpOid || slOid) {
          bracketPlaced++;
          logger.info(`Trade ${trade.id}: Bracket orders placed successfully (TP: ${tpOid}, SL: ${slOid})`);
        }

      } catch (error: any) {
        logger.error(`Error processing pending limit order for trade ${trade.id}`, error);
        errors.push(`Trade ${trade.id}: ${error.message}`);
      }
    }

    if (bracketPlaced > 0) {
      logger.info(`Limit order monitoring complete: ${bracketPlaced}/${processed} trades had brackets placed`);
    }

    return { processed, bracketPlaced, errors };
  }

  /**
   * Recalculate PnL for closed trades that have 0 PnL (repair function)
   * This is useful for trades that were closed before the PnL calculation was fixed
   */
  async recalculateClosedTradePnL(walletAddress: string): Promise<{ updated: number; errors: string[] }> {
    const hyperliquid = await futuresAgentsService.getHyperliquidService(walletAddress);
    if (!hyperliquid) return { updated: 0, errors: ['No Hyperliquid service available'] };

    const trades = await futuresAgentsService.getUserTrades(walletAddress, 100);
    // Find closed trades with 0 PnL
    const zeroPlTrades = trades.filter(t => 
      (t.status === 'tp_hit' || t.status === 'sl_hit' || t.status === 'closed') && 
      (t.pnl_usd === 0 || t.pnl_usd === null)
    );

    if (zeroPlTrades.length === 0) {
      logger.info('No closed trades with 0 PnL found');
      return { updated: 0, errors: [] };
    }

    logger.info(`Found ${zeroPlTrades.length} closed trades with 0 PnL to recalculate`);

    // Get all fills
    const fills = await hyperliquid.getFills(500);
    let updated = 0;
    const errors: string[] = [];

    for (const trade of zeroPlTrades) {
      try {
        const tradeSymbol = trade.symbol.toUpperCase().replace(/-PERP$/, '');
        
        // Find fills for this symbol around the trade time
        const relevantFills = fills.filter((f: any) => {
          const fillSymbol = (f.coin || '').toUpperCase().replace(/-PERP$/, '');
          const fillTime = f.time ? new Date(f.time).getTime() : 0;
          const tradeOpenTime = new Date(trade.opened_at).getTime();
          // Look for fills within 24 hours of trade opening
          return fillSymbol === tradeSymbol && fillTime > tradeOpenTime;
        });

        let closePrice: number;
        if (relevantFills.length > 0) {
          // Sort by time and get the latest fill (closing fill)
          relevantFills.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
          closePrice = parseFloat(relevantFills[0].px);
        } else if (trade.exit_price && trade.exit_price !== trade.entry_price) {
          // Use existing exit price if available
          closePrice = trade.exit_price;
        } else {
          // Can't determine close price
          errors.push(`Trade ${trade.id}: No fills found and no exit price`);
          continue;
        }

        // Calculate PnL
        // pnlPercent is the leveraged return percentage (what the user sees as ROI)
        const pnlPercent = trade.direction === 'LONG'
          ? ((closePrice - trade.entry_price) / trade.entry_price) * 100 * trade.leverage
          : ((trade.entry_price - closePrice) / trade.entry_price) * 100 * trade.leverage;
        
        // Calculate USD PnL based on actual position value (notional)
        // positionValue is the notional size (entry_price * quantity)
        // pnlUsd = price change percentage (unleveraged) * notional value
        const positionValue = trade.entry_price * trade.quantity;
        const priceChangePercent = trade.direction === 'LONG'
          ? ((closePrice - trade.entry_price) / trade.entry_price) * 100
          : ((trade.entry_price - closePrice) / trade.entry_price) * 100;
        const pnlUsd = (priceChangePercent / 100) * positionValue;

        // Update the trade
        await futuresAgentsService.updateTrade(trade.id, {
          exit_price: closePrice,
          pnl_usd: pnlUsd,
          pnl_percent: pnlPercent,
        });

        logger.info(`Recalculated trade ${trade.id}: exit=${closePrice}, PnL=${pnlPercent.toFixed(2)}% ($${pnlUsd.toFixed(2)})`);
        updated++;
      } catch (error: any) {
        errors.push(`Trade ${trade.id}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKGROUND JOB PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  private isProcessingJobs = false;

  /**
   * Process pending signal jobs (called periodically)
   * This handles the LLM evaluation and trade execution for custom agents
   */
  async processBackgroundJobs(): Promise<{ processed: number; executed: number; failed: number }> {
    if (this.isProcessingJobs) {
      logger.debug('Job processor already running, skipping');
      return { processed: 0, executed: 0, failed: 0 };
    }

    this.isProcessingJobs = true;
    let processed = 0;
    let executed = 0;
    let failed = 0;

    try {
      // Reset any stale jobs first
      await signalJobsService.resetStaleJobs();

      // Get pending jobs
      const jobs = await signalJobsService.getPendingJobs(5);
      
      if (jobs.length === 0) {
        return { processed: 0, executed: 0, failed: 0 };
      }

      logger.info(`Processing ${jobs.length} pending signal jobs`);

      for (const job of jobs) {
        try {
          processed++;
          await signalJobsService.markProcessing(job.id);

          // Get the agent
          const agents = await futuresAgentsService.getUserAgents(job.user_wallet_address);
          const agent = agents.find(a => a.id === job.agent_id);

          if (!agent) {
            await signalJobsService.markFailed(job.id, 'Agent not found');
            failed++;
            continue;
          }

          // Check if agent is still active
          if (!agent.is_active) {
            await signalJobsService.markCompleted(job.id, {
              shouldTrade: false,
              reason: 'Agent is no longer active',
              confidence: 0,
            });
            continue;
          }

          // Evaluate the prompt
          const evaluation = await this.evaluateAgentPrompt(agent, job.signal_data);
          
          if (!evaluation.shouldTrade) {
            await signalJobsService.markCompleted(job.id, {
              shouldTrade: false,
              reason: evaluation.reason,
              confidence: evaluation.confidence,
            });
            continue;
          }

          // Execute the trade
          const tradeResult = await this.processAgentSignal(
            job.user_wallet_address,
            agent,
            job.signal_id,
            job.signal_data
          );

          if (tradeResult.success && tradeResult.trade?.id) {
            await signalJobsService.markCompleted(job.id, {
              shouldTrade: true,
              reason: evaluation.reason,
              confidence: evaluation.confidence,
              tradeId: tradeResult.trade.id as string,
            });
            executed++;
          } else {
            await signalJobsService.markCompleted(job.id, {
              shouldTrade: true,
              reason: evaluation.reason,
              confidence: evaluation.confidence,
              tradeError: tradeResult.error,
            });
          }
        } catch (error: any) {
          logger.error(`Error processing job ${job.id}`, error);
          await signalJobsService.markFailed(job.id, error.message);
          failed++;
        }
      }

      logger.info(`Job processing complete: ${processed} processed, ${executed} executed, ${failed} failed`);
    } finally {
      this.isProcessingJobs = false;
    }

    return { processed, executed, failed };
  }

  /**
   * Start the background job processor (runs every 5 seconds)
   */
  private jobProcessorInterval: NodeJS.Timeout | null = null;

  startJobProcessor(): void {
    if (this.jobProcessorInterval) {
      logger.warn('Job processor already started');
      return;
    }

    logger.info('Starting signal job processor (5s interval)');
    this.jobProcessorInterval = setInterval(() => {
      this.processBackgroundJobs().catch(err => {
        logger.error('Job processor error', err);
      });
    }, 5000);

    // Run immediately on start
    this.processBackgroundJobs().catch(err => {
      logger.error('Initial job processing error', err);
    });
  }

  stopJobProcessor(): void {
    if (this.jobProcessorInterval) {
      clearInterval(this.jobProcessorInterval);
      this.jobProcessorInterval = null;
      logger.info('Signal job processor stopped');
    }
  }
}

export const signalExecutorService = new SignalExecutorService();
