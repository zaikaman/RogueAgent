import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MindshareChartProps {
  data: any[];
}

export function MindshareChart({ data }: MindshareChartProps) {
  // Mock data if none provided
  const chartData = (data && data.length > 0) ? data : [
    { time: '10:00', value: 45 },
    { time: '10:20', value: 52 },
    { time: '10:40', value: 48 },
    { time: '11:00', value: 61 },
    { time: '11:20', value: 55 },
    { time: '11:40', value: 67 },
    { time: '12:00', value: 72 },
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            stroke="#4b5563" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="#4b5563" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid #1e293b',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            itemStyle={{ color: '#22d3ee' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#06b6d4" 
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
