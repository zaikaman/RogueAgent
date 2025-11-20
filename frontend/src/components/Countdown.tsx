import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface CountdownProps {
  lastRunTime: string | null;
}

export function Countdown({ lastRunTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!lastRunTime) return;

    const CYCLE_DURATION = 60 * 60 * 1000; // 60 minutes
    
    const interval = setInterval(() => {
      const lastRun = new Date(lastRunTime).getTime();
      const nextRun = lastRun + CYCLE_DURATION;
      const now = Date.now();
      const diff = nextRun - now;

      if (diff <= 0) {
        setTimeLeft('SCANNING...');
        setProgress(100);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        const elapsed = now - lastRun;
        setProgress(Math.min((elapsed / CYCLE_DURATION) * 100, 100));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRunTime]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500">
        <Timer className="w-3 h-3" />
        Next Scan
      </div>
      <div className="font-mono text-2xl font-bold text-cyan-400">
        {timeLeft}
      </div>
      <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-cyan-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
