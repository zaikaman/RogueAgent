export interface TokenInfo {
  symbol: string;
  name: string;
  contract_address: string;
}

export interface TriggerEvent {
  type: 'kol_mention' | 'whale_movement' | 'volume_spike' | 'sentiment_surge' | 'day_trade_setup' | 'swing_trade_setup' | 'orderflow_confluence' | 'long_setup' | 'short_setup';
  kol_handle?: string;
  tweet_url?: string;
  whale_wallets?: string[];
  description?: string;
}

export type TradingStyle = 'day_trade' | 'swing_trade';

export interface SignalContent {
  token: TokenInfo;
  direction: 'LONG' | 'SHORT'; // Trading direction for perpetuals
  entry_price: number;
  target_price: number;
  stop_loss: number;
  confidence: number; // 1-100
  trigger_event: TriggerEvent;
  analysis: string;
  formatted_tweet?: string; // Optional because pending signals don't have it yet
  status?: 'pending' | 'active' | 'tp_hit' | 'sl_hit' | 'closed';
  order_type?: 'market' | 'limit';
  trading_style?: TradingStyle; // day_trade (4-24h) or swing_trade (2-5 days)
  expected_duration?: string; // e.g. "8-16 hours" or "2-3 days"
  current_price?: number;
  pnl_percent?: number;
  closed_at?: string;
}

export interface SignalRun {
  id: string;
  type: 'signal';
  content: SignalContent;
  public_posted_at: string | null;
  telegram_delivered_at: string | null;
  confidence_score: number;
  cycle_started_at: string;
  cycle_completed_at: string | null;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}
