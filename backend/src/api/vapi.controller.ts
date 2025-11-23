import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
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
  }
};
