// ═══════════════════════════════════════════════════════════════════════════════
// FUTURES AGENTS TYPES
// TypeScript interfaces for Diamond-tier automated trading
// ═══════════════════════════════════════════════════════════════════════════════

// Network mode for Hyperliquid (mainnet or testnet)
export type NetworkMode = 'mainnet' | 'testnet';

export interface FuturesAgentStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl_usd: number;
  total_pnl_percent: number;
  max_drawdown_percent: number;
  trades_today: number;
  last_trade_at: string | null;
}

export interface FuturesAgent {
  id: string;
  user_wallet_address: string;
  name: string;
  type: 'classic' | 'custom';
  is_active: boolean;
  risk_per_trade: number;
  max_concurrent_positions: number;
  max_leverage: number;
  custom_prompt: string | null;
  stats: FuturesAgentStats;
  created_at: string;
  updated_at: string;
}

export interface FuturesTrade {
  id: string;
  agent_id: string;
  user_wallet_address: string;
  signal_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  leverage: number;
  risk_percent: number;
  pnl_usd: number | null;
  pnl_percent: number | null;
  status: 'pending' | 'open' | 'tp_hit' | 'sl_hit' | 'closed' | 'error';
  entry_order_id: string;
  tp_order_id: string | null;
  sl_order_id: string | null;
  pending_tp_price: number | null;
  pending_sl_price: number | null;
  error_message: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface FuturesPosition {
  id: string;
  user_wallet_address: string;
  agent_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  current_price: number;
  quantity: number;
  leverage: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  liquidation_price: number;
  tp_price: number | null;
  sl_price: number | null;
  tp_order_id: string | null;
  sl_order_id: string | null;
  margin_type: 'isolated' | 'cross';
  opened_at: string;
  updated_at: string;
}

export interface FuturesAccountInfo {
  balance: number;
  equity: number;
  unrealizedPnl: number;
}

export interface CreateAgentParams {
  walletAddress: string;
  name: string;
  type: 'classic' | 'custom';
  riskPerTrade?: number;
  maxConcurrentPositions?: number;
  maxLeverage?: number;
  customPrompt?: string;
}

export interface UpdateAgentParams {
  walletAddress: string;
  agentId: string;
  name?: string;
  isActive?: boolean;
  riskPerTrade?: number;
  maxConcurrentPositions?: number;
  maxLeverage?: number;
  customPrompt?: string;
}

// Signal job types for background processing
export type SignalJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface SignalJob {
  id: string;
  user_wallet_address: string;
  agent_id: string;
  signal_id: string;
  signal_data: {
    token: {
      symbol: string;
      name: string;
    };
    entry_price: number;
    target_price: number;
    stop_loss: number;
    confidence: number;
  };
  status: SignalJobStatus;
  should_trade: boolean | null;
  evaluation_reason: string | null;
  evaluation_confidence: number | null;
  trade_id: string | null;
  trade_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}
