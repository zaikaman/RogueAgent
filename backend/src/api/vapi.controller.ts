import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { ChatAgent } from '../agents/chat.agent';
import { logger } from '../utils/logger.util';

export const vapiController = {
  async getRecentSignals(req: Request, res: Response) {
    try {
      const limit = req.body.limit || 5;
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

      // VAPI expects a JSON response. 
      // If this is called as a tool, the result field is usually what's read.
      res.json({ 
        results: formatted,
        count: formatted.length
      });
    } catch (error) {
      logger.error('VAPI Signals Error', error);
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  },

  async getRecentIntel(req: Request, res: Response) {
    try {
      const limit = req.body.limit || 5;
      const intels = await supabaseService.getRecentIntels(limit);
      
      const formatted = intels.map((i: any) => ({
        topic: i.content?.topic,
        insight: i.content?.insight,
        sentiment: i.content?.sentiment,
        date: i.created_at
      }));

      res.json({ 
        results: formatted,
        count: formatted.length
      });
    } catch (error) {
      logger.error('VAPI Intel Error', error);
      res.status(500).json({ error: 'Failed to fetch intel' });
    }
  },

  async getYieldOpportunities(req: Request, res: Response) {
    try {
      const limit = req.body.limit || 5;
      const { opportunities } = await supabaseService.getLatestYieldOpportunities(1, limit);
      
      const formatted = opportunities?.map((o: any) => ({
        protocol: o.protocol,
        chain: o.chain,
        pool: o.pool_id,
        apy: o.apy,
        tvl: o.tvl_usd,
        risk: o.il_risk
      }));

      res.json({ 
        results: formatted,
        count: formatted?.length || 0
      });
    } catch (error) {
      logger.error('VAPI Yield Error', error);
      res.status(500).json({ error: 'Failed to fetch yield' });
    }
  },

  async getAirdrops(req: Request, res: Response) {
    try {
      const limit = req.body.limit || 5;
      const { airdrops } = await supabaseService.getAirdrops(1, limit);
      
      const formatted = airdrops?.map((a: any) => ({
        project: a.ticker,
        chain: a.chain,
        type: a.type,
        potential_value: a.est_value_usd,
        tasks: a.tasks,
        score: a.rogue_score
      }));

      res.json({ 
        results: formatted,
        count: formatted?.length || 0
      });
    } catch (error) {
      logger.error('VAPI Airdrops Error', error);
      res.status(500).json({ error: 'Failed to fetch airdrops' });
    }
  },

  async searchWebAndX(req: Request, res: Response) {
    try {
      logger.info('VAPI Web/X Search Tool called. Body:', JSON.stringify(req.body));
      
      // VAPI sends data in a nested message structure
      let query = req.body.query;
      let toolCallId = req.body.toolCallId;
      
      // If query is not at root level, try to extract from VAPI's message structure
      if (!query && req.body.message?.toolCallList?.[0]?.arguments?.query) {
        query = req.body.message.toolCallList[0].arguments.query;
        toolCallId = req.body.message.toolCallList[0].id;
      }

      if (!query) {
        logger.warn('VAPI Web/X Search: Missing query parameter');
        return res.status(400).json({ error: 'Query is required', received: req.body });
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

