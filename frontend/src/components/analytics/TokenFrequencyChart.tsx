import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Signal } from '../../hooks/useSignals';

interface Props {
  signals: Signal[];
}

export function TokenFrequencyChart({ signals }: Props) {
  const data = useMemo(() => {
    if (!signals || signals.length === 0) {
      // Mock data
      return [
        { symbol: 'SOL', count: 45 },
        { symbol: 'ETH', count: 32 },
        { symbol: 'BTC', count: 28 },
        { symbol: 'LINK', count: 19 },
        { symbol: 'ARB', count: 15 },
        { symbol: 'TIA', count: 12 },
        { symbol: 'INJ', count: 8 },
        { symbol: 'OP', count: 6 },
        { symbol: 'SUI', count: 5 },
        { symbol: 'SEI', count: 4 },
      ];
    }

    const counts: Record<string, number> = {};
    signals.forEach(s => {
      // Access symbol from content.token object
      const symbol = s.content?.token?.symbol;
      if (symbol) {
        counts[symbol] = (counts[symbol] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [signals]);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} opacity={0.3} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="symbol" 
            type="category" 
            stroke="#9ca3af"
            tick={{ fill: '#e5e7eb', fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{ 
              backgroundColor: '#111827', 
              border: '1px solid #374151', 
              borderRadius: '8px'
            }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
             {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={index < 3 ? '#c084fc' : '#7c3aed'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
