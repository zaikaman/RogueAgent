import { futuresAgentsService, FuturesAgent, FuturesTrade } from './futures-agents.service';
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
   */
  async processSignal(payload: SignalPayload): Promise<{
    processed: number;
    executed: number;
    results: TradeExecutionResult[];
  }> {
    const { signalId, signal } = payload;
    
    logger.info(`Processing signal ${signalId} for ${signal.token.symbol}`);

    // Get all Diamond users with active agents
    const diamondUsers = await futuresAgentsService.getDiamondUsersWithActiveAgents();
    
    if (diamondUsers.length === 0) {
      logger.info('No Diamond users with active agents');
      return { processed: 0, executed: 0, results: [] };
    }

    const results: TradeExecutionResult[] = [];
    let processed = 0;
    let executed = 0;

    // Process each user's agents
    for (const user of diamondUsers) {
      for (const agent of user.agents) {
        processed++;
        
        try {
          const result = await this.processAgentSignal(
            user.walletAddress,
            agent,
            signalId,
            signal
          );
          
          results.push(result);
          if (result.success) executed++;
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

    logger.info(`Signal ${signalId} processed: ${processed} agents, ${executed} trades executed`);
    return { processed, executed, results };
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
      
      // Apply agent's max leverage (cap at 50x for Hyperliquid)
      const signalRiskPercent = Math.abs((stopLossPrice - entryPrice) / entryPrice) * 100;
      const maxLeverageFromRisk = Math.floor(100 / signalRiskPercent);
      const leverage = Math.min(agent.max_leverage, maxLeverageFromRisk, 50); // Hyperliquid max is 50x

      const tradeResult = await hyperliquid.openBracketPosition({
        symbol: futuresSymbol,
        side: direction,
        riskPercent: agent.risk_per_trade,
        leverage,
        takeProfitPrice,
        stopLossPrice,
        clientOrderIdPrefix: `ROGUE_${agent.id.slice(0, 8)}`,
      });

      // Extract order IDs from Hyperliquid response
      const entryOid = tradeResult.entryOrder?.response?.data?.statuses?.[0]?.filled?.oid || 
                       tradeResult.entryOrder?.response?.data?.statuses?.[0]?.resting?.oid || 0;
      const tpOid = tradeResult.tpOrder?.response?.data?.statuses?.[0]?.resting?.oid || null;
      const slOid = tradeResult.slOrder?.response?.data?.statuses?.[0]?.resting?.oid || null;

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
        status: 'open',
        entry_order_id: entryOid.toString(),
        tp_order_id: tpOid?.toString() || null,
        sl_order_id: slOid?.toString() || null,
        error_message: null,
        opened_at: new Date().toISOString(),
        closed_at: null,
      });

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
    const openTrades = trades.filter(t => t.status === 'open');

    for (const trade of openTrades) {
      try {
        // Check if position is still open
        const position = await hyperliquid.getPosition(trade.symbol);
        
        if (!position || parseFloat(position.szi) === 0) {
          // Position is closed - determine if TP or SL hit
          const fills = await hyperliquid.getFills(10);
          const relevantFill = fills.find((f: any) => f.coin === trade.symbol);
          const closePrice = relevantFill ? parseFloat(relevantFill.px) : trade.entry_price;
          
          const pnlPercent = trade.direction === 'LONG'
            ? ((closePrice - trade.entry_price) / trade.entry_price) * 100 * trade.leverage
            : ((trade.entry_price - closePrice) / trade.entry_price) * 100 * trade.leverage;
          
          const status = pnlPercent > 0 ? 'tp_hit' : 'sl_hit';
          
          logger.info(`Trade ${trade.id} closed: ${status} at ${closePrice}`);
        }
      } catch (error) {
        logger.error(`Error updating trade ${trade.id}`, error);
      }
    }
  }
}

export const signalExecutorService = new SignalExecutorService();
