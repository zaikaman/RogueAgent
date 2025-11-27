import { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface XRateLimit {
  is_limited: boolean;
  posts_remaining: number;
  posts_used: number;
  max_posts_per_day: number;
  reset_time: string | null;
}

interface CountdownProps {
  lastRunTime: string | null;
  intervalMinutes?: number;
  xRateLimit?: XRateLimit | null;
}

export function Countdown({ lastRunTime, intervalMinutes = 60, xRateLimit }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [progress, setProgress] = useState(0);
  const [rateLimitReset, setRateLimitReset] = useState<string>('');

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

      // Update rate limit countdown if active
      if (xRateLimit?.is_limited && xRateLimit?.reset_time) {
        const resetTime = new Date(xRateLimit.reset_time).getTime();
        const resetDiff = resetTime - now;
        if (resetDiff > 0) {
          const hours = Math.floor(resetDiff / 3600000);
          const mins = Math.floor((resetDiff % 3600000) / 60000);
          setRateLimitReset(`${hours}h ${mins}m`);
        } else {
          setRateLimitReset('Soon');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRunTime, intervalMinutes, xRateLimit]);

  // Show rate limit warning if active
  if (xRateLimit?.is_limited) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-500">
          <AlertTriangle className="w-3 h-3" />
          X Rate Limited
        </div>
        <div className="font-mono text-xl font-bold text-amber-400">
          {rateLimitReset || 'PAUSED'}
        </div>
        <div className="text-xs text-gray-500">
          {xRateLimit.posts_used}/{xRateLimit.max_posts_per_day} posts used
        </div>
        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

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
        <div className="text-xs text-gray-500">
          X: {xRateLimit.posts_remaining}/{xRateLimit.max_posts_per_day} left
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
