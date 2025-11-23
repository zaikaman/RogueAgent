import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { ChatAgent } from '../agents/chat.agent';
import { logger } from '../utils/logger.util';

export const vapiController = {
  async getRecentSignals(req: Request, res: Response) {
    try {
      // Extract from VAPI's nested structure
      const toolCall = req.body.message?.toolCallList?.[0];
      const toolCallId = toolCall?.id;
      
      // Parse arguments - VAPI sends it as a JSON string
      let limit = 5;
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        limit = args.limit || 5;
      }
      
      const signals = await supabaseService.getRecentSignals(limit);
      
      const formatted = signals.map((s: any) => ({
        symbol: s.content?.token?.symbol,
        action: s.content?.action,
        entry: s.content?.entry_price,
        tp: s.content?.tp_price,
        sl: s.content?.sl_price,
        reasoning: s.content?.reasoning,
        date: s.created_at
      }));

      const resultText = `Found ${formatted.length} recent signals:\n${formatted.map((s, i) => 
        `${i+1}. ${s.action?.toUpperCase()} ${s.symbol} - Entry: ${s.entry}, TP: ${s.tp}, SL: ${s.sl}. ${s.reasoning}`
      ).join('\n')}`;

      res.json({ 
        results: [{
          toolCallId: toolCallId || 'unknown',
          result: resultText
        }]
      });
    } catch (error) {
      logger.error('VAPI Signals Error', error);
      res.status(500).json({ 
        results: [{
          toolCallId: req.body.message?.toolCallList?.[0]?.id || 'unknown',
          result: 'Failed to fetch signals'
        }]
      });
    }
  },

  async getRecentIntel(req: Request, res: Response) {
    try {
      // Extract from VAPI's nested structure
      const toolCall = req.body.message?.toolCallList?.[0];
      const toolCallId = toolCall?.id;
      
      // Parse arguments - VAPI sends it as a JSON string
      let limit = 5;
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        limit = args.limit || 5;
      }
      
      const intels = await supabaseService.getRecentIntels(limit);
      
      const formatted = intels.map((i: any) => ({
        topic: i.content?.topic,
        insight: i.content?.insight,
        sentiment: i.content?.sentiment,
        date: i.created_at
      }));

      const resultText = `Found ${formatted.length} market intelligence reports:\n${formatted.map((i, idx) => 
        `${idx+1}. ${i.topic} - ${i.insight}. Sentiment: ${i.sentiment}`
      ).join('\n')}`;

      res.json({ 
        results: [{
          toolCallId: toolCallId || 'unknown',
          result: resultText
        }]
      });
    } catch (error) {
      logger.error('VAPI Intel Error', error);
      res.status(500).json({ 
        results: [{
          toolCallId: req.body.message?.toolCallList?.[0]?.id || 'unknown',
          result: 'Failed to fetch intel'
        }]
      });
    }
  },

  async getYieldOpportunities(req: Request, res: Response) {
    try {
      // Extract from VAPI's nested structure
      const toolCall = req.body.message?.toolCallList?.[0];
      const toolCallId = toolCall?.id;
      
      // Parse arguments - VAPI sends it as a JSON string
      let limit = 5;
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        limit = args.limit || 5;
      }
      
      const { opportunities } = await supabaseService.getLatestYieldOpportunities(1, limit);
      
      const formatted = opportunities?.map((o: any) => ({
        protocol: o.protocol,
        chain: o.chain,
        pool: o.pool_id,
        apy: o.apy,
        tvl: o.tvl_usd,
        risk: o.il_risk
      }));

      const resultText = `Found ${formatted?.length || 0} yield opportunities:\n${formatted?.map((o, i) => 
        `${i+1}. ${o.protocol} on ${o.chain} - ${o.apy}% APY, TVL: $${o.tvl}, Risk: ${o.risk}`
      ).join('\n') || 'No opportunities available'}`;

      res.json({ 
        results: [{
          toolCallId: toolCallId || 'unknown',
          result: resultText
        }]
      });
    } catch (error) {
      logger.error('VAPI Yield Error', error);
      res.status(500).json({ 
        results: [{
          toolCallId: req.body.message?.toolCallList?.[0]?.id || 'unknown',
          result: 'Failed to fetch yield opportunities'
        }]
      });
    }
  },

  async getAirdrops(req: Request, res: Response) {
    try {
      // Extract from VAPI's nested structure
      const toolCall = req.body.message?.toolCallList?.[0];
      const toolCallId = toolCall?.id;
      
      // Parse arguments - VAPI sends it as a JSON string
      let limit = 5;
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        limit = args.limit || 5;
      }
      
      const { airdrops } = await supabaseService.getAirdrops(1, limit);
      
      const formatted = airdrops?.map((a: any) => ({
        project: a.ticker,
        chain: a.chain,
        type: a.type,
        potential_value: a.est_value_usd,
        tasks: a.tasks,
        score: a.rogue_score
      }));

      const resultText = `Found ${formatted?.length || 0} airdrop opportunities:\n${formatted?.map((a, i) => 
        `${i+1}. ${a.project} on ${a.chain} - Type: ${a.type}, Est. Value: $${a.potential_value}, Rogue Score: ${a.score}/100`
      ).join('\n') || 'No airdrops available'}`;

      res.json({ 
        results: [{
          toolCallId: toolCallId || 'unknown',
          result: resultText
        }]
      });
    } catch (error) {
      logger.error('VAPI Airdrops Error', error);
      res.status(500).json({ 
        results: [{
          toolCallId: req.body.message?.toolCallList?.[0]?.id || 'unknown',
          result: 'Failed to fetch airdrops'
        }]
      });
    }
  },

  async searchWebAndX(req: Request, res: Response) {
    try {
      logger.info('VAPI Web/X Search Tool called. Body:', JSON.stringify(req.body));
      
      // Extract from VAPI's nested structure
      const toolCall = req.body.message?.toolCallList?.[0];
      const toolCallId = toolCall?.id;
      
      // Parse arguments - VAPI sends it as a JSON string
      let query;
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        query = args.query;
      }

      if (!query) {
        logger.warn('VAPI Web/X Search: Missing query parameter');
        return res.status(400).json({ 
          results: [{
            toolCallId: toolCallId || 'unknown',
            result: 'Query is required'
          }]
        });
      }

      logger.info('VAPI Web/X Search Tool query:', query);
      logger.info('VAPI Web/X Search Tool toolCallId:', toolCallId);

      // Call ChatAgent (Grok) with the query
      const grokInput = `USER CONTEXT:
- Source: VAPI Voice Assistant
- Request Type: Web/X Search

USER MESSAGE: ${query}`;

      const grokAgent = await ChatAgent;
      const result: any = await grokAgent.runner.ask(grokInput);

      // Extract text response
      const responseText = typeof result === 'string' ? result : result.message || JSON.stringify(result);

      logger.info('VAPI Web/X Search Tool response length:', responseText.length);

      // Return formatted response for VAPI
      // VAPI expects: { results: [{ toolCallId: "X", result: "Y" }] }
      res.json({
        results: [
          {
            toolCallId: toolCallId,
            result: responseText
          }
        ]
      });
    } catch (error: any) {
      logger.error('VAPI Web/X Search Error', error);
      res.status(500).json({ error: 'Failed to search web/X', message: error.message });
    }
  }
};

