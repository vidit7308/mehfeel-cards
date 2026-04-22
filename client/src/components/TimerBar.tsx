import { useMatchTimer } from '../hooks/useCountdown';

interface TimerBarProps {
  startedAt: number | null;
  totalMs: number;
}

export function MatchTimerBar({ startedAt, totalMs }: TimerBarProps) {
  const { minutes, secs, pct } = useMatchTimer(startedAt, totalMs);
  const danger = pct > 0.8;
  const warning = pct > 0.6;
  const color = danger ? '#EF4444' : warning ? '#F97316' : '#FF00FF';
  const remaining = 1 - pct;

  return (
    <div className="flex items-center gap-3">
      <div
        className="font-display font-bold text-sm tabular-nums"
        style={{ color, minWidth: 48 }}
      >
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className="timer-bar-track flex-1">
        <div
          className="timer-bar-fill"
          style={{ background: color, width: `${remaining * 100}%`, transition: 'width 1s linear, background 0.5s' }}
        />
      </div>
      <span className="text-xs opacity-40 font-body">Match</span>
    </div>
  );
}
