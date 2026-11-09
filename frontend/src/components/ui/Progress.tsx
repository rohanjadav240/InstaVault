import { cn } from '../../utils/cn';

export interface ProgressProps {
  value: number; // 0 to 100
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
}

export function Progress({
  value,
  className,
  indicatorClassName,
  showLabel = false,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full space-y-1">
      <div
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-[#202030]',
          className
        )}
      >
        <div
          className={cn(
            'h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-300 ease-out',
            indicatorClassName
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>{clampedValue.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

