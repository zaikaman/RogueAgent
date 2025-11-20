export interface TokenInfo {
  symbol: string;
  name: string;
  contract_address: string;
}

export interface TriggerEvent {
  type: 'kol_mention' | 'whale_movement' | 'volume_spike' | 'sentiment_surge';
  kol_handle?: string;
  tweet_url?: string;
  whale_wallets?: string[];
  description?: string;
}

export interface SignalContent {
  token: TokenInfo;
  entry_price: number;
  target_price: number;
  stop_loss: number;
  confidence: number; // 1-10
  trigger_event: TriggerEvent;
  analysis: string;
  formatted_tweet: string;
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
