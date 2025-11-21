import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Signal } from '../../hooks/useSignals';

interface Props {
  signals: Signal[];
}

export function SignalConfidenceChart({ signals }: Props) {
  const data = useMemo(() => {
    if (!signals || signals.length === 0) {
      // Generate mock distribution (bell curve-ish) for 1-100 scale
      // We'll use 10 bins: 1-10, 11-20, ..., 91-100
      return Array(10).fill(0).map((_, i) => {
        const rangeStart = i * 10 + 1;
        const rangeEnd = (i + 1) * 10;
        const label = `${rangeStart}-${rangeEnd}`;
        
        // Peak around 70-80
        let count = 0;
        if (rangeEnd < 50) count = Math.floor(Math.random() * 5) + 2;
        else if (rangeEnd < 70) count = Math.floor(Math.random() * 10) + 5;
        else if (rangeEnd < 90) count = Math.floor(Math.random() * 15) + 10;
        else count = Math.floor(Math.random() * 8) + 3;
        
        return { score: label, count };
      });
    }

    // Create 10 bins for 1-100 range
    const bins = Array(10).fill(0).map((_, i) => ({
      score: `${i * 10 + 1}-${(i + 1) * 10}`,
      min: i * 10 + 1,
      max: (i + 1) * 10,
      count: 0
    }));

    signals.forEach(s => {
      // Access confidence from content object
      const confidence = s.content?.confidence || 0;
      const score = Math.round(confidence);
      
      // Find the right bin
      const binIndex = Math.min(9, Math.max(0, Math.floor((score - 1) / 10)));
      if (score >= 1 && score <= 100) {
        bins[binIndex].count++;
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
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`hsl(189, 94%, ${30 + ((index + 1) * 4)}%)`} 
                stroke="none"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
