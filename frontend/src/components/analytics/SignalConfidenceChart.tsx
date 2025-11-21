import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Signal } from '../../hooks/useSignals';

interface Props {
  signals: Signal[];
}

export function SignalConfidenceChart({ signals }: Props) {
  const data = useMemo(() => {
    if (!signals || signals.length === 0) {
      // Generate mock distribution (bell curve-ish)
      return Array(10).fill(0).map((_, i) => {
        const score = i + 1;
        // Peak around 7-8
        let count = 0;
        if (score < 5) count = Math.floor(Math.random() * 5) + 2;
        else if (score < 7) count = Math.floor(Math.random() * 10) + 5;
        else if (score < 9) count = Math.floor(Math.random() * 15) + 10;
        else count = Math.floor(Math.random() * 8) + 3;
        
        return { score, count };
      });
    }

    const bins = Array(10).fill(0).map((_, i) => ({
      score: i + 1,
      count: 0
    }));

    signals.forEach(s => {
      // Access confidence from content object
      const confidence = s.content?.confidence || 0;
      const score = Math.round(confidence);
      if (score >= 1 && score <= 10) {
        bins[score - 1].count++;
      }
    });

    return bins;
  }, [signals]);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis 
            dataKey="score" 
            stroke="#9ca3af" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#9ca3af" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{ 
              backgroundColor: '#111827', 
              border: '1px solid #374151', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#9ca3af', marginBottom: '0.5rem' }}
            labelFormatter={(value) => `Confidence Score: ${value}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`hsl(189, 94%, ${30 + (entry.score * 4)}%)`} 
                stroke="none"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
