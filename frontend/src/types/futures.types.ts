// ═══════════════════════════════════════════════════════════════════════════════
// FUTURES AGENTS TYPES
// TypeScript interfaces for Diamond-tier automated trading
// ═══════════════════════════════════════════════════════════════════════════════

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
  status: 'open' | 'tp_hit' | 'sl_hit' | 'closed' | 'error';
  entry_order_id: string;
  tp_order_id: string | null;
  sl_order_id: string | null;
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
