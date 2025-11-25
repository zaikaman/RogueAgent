import { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Signal } from '../../hooks/useSignals';

interface PnLChartProps {
  signals: Signal[];
}

export function PnLChart({ signals }: PnLChartProps) {
  const data = useMemo(() => {
    return signals
      .filter(s => s.content.status === 'tp_hit' || s.content.status === 'sl_hit' || s.content.status === 'closed')
      .filter(s => s.content.pnl_percent !== undefined)
      .map(s => ({
        name: s.content.token.symbol,
        pnl: s.content.pnl_percent,
        date: new Date(s.created_at).toLocaleDateString(),
        status: s.content.status
      }))
      .reverse(); // Show oldest to newest
  }, [signals]);

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No PnL data available
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
          <YAxis stroke="#9ca3af" fontSize={12} unit="R" />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
            cursor={{ fill: '#374151', opacity: 0.2 }}
            formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}R`, 'Return (1% Risk)']}
          />
          <ReferenceLine y={0} stroke="#6b7280" />
          <Bar dataKey="pnl" fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.pnl && entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

