import { useEffect, useState } from 'react';
import { Timer, Clock } from 'lucide-react';

interface XRateLimit {
  is_limited: boolean;
  minutes_until_next_post: number;
  min_interval_minutes: number;
  last_post_time: string | null;
}

interface CountdownProps {
  lastRunTime: string | null;
  intervalMinutes?: number;
  xRateLimit?: XRateLimit | null;
}

export function Countdown({ lastRunTime, intervalMinutes = 60, xRateLimit }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [progress, setProgress] = useState(0);
  const [xCooldown, setXCooldown] = useState<string>('');

  useEffect(() => {
    if (!lastRunTime) return;

    const CYCLE_DURATION = intervalMinutes * 60 * 1000;
    
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

      // Update X cooldown display
      if (xRateLimit?.is_limited && xRateLimit?.last_post_time) {
        const lastPostTime = new Date(xRateLimit.last_post_time).getTime();
        const cooldownEnd = lastPostTime + (xRateLimit.min_interval_minutes * 60 * 1000);
        const cooldownRemaining = cooldownEnd - now;
        if (cooldownRemaining > 0) {
          const mins = Math.ceil(cooldownRemaining / 60000);
          setXCooldown(`${mins}m`);
        } else {
          setXCooldown('Ready');
        }
      } else {
        setXCooldown('Ready');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRunTime, intervalMinutes, xRateLimit]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500">
        <Timer className="w-3 h-3" />
        Next Scan
      </div>
      <div className="font-mono text-2xl font-bold text-cyan-400">
        {timeLeft}
      </div>
      {xRateLimit && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>X: {xRateLimit.is_limited ? xCooldown : 'Ready'}</span>
        </div>
      )}
      <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-cyan-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
