import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Signal } from '../../hooks/useSignals';

interface WinRateChartProps {
  signals: Signal[];
}

export function WinRateChart({ signals }: WinRateChartProps) {
  const data = useMemo(() => {
    const closedSignals = signals.filter(s => s.content.status === 'tp_hit' || s.content.status === 'sl_hit');
    const wins = closedSignals.filter(s => s.content.status === 'tp_hit').length;
    const losses = closedSignals.filter(s => s.content.status === 'sl_hit').length;

    return [
      { name: 'Wins (TP Hit)', value: wins, color: '#10b981' }, // emerald-500
      { name: 'Losses (SL Hit)', value: losses, color: '#ef4444' }, // red-500
    ];
  }, [signals]);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const winRate = total > 0 ? ((data[0].value / total) * 100).toFixed(1) : 0;

  if (total === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No closed signals to analyze
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{winRate}%</div>
          <div className="text-sm text-gray-400">Win Rate</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
