import * as React from 'react';
import { cn } from '@/utils';

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      disabled,
      className,
    },
    ref
  ) => {
    const rawValue = value?.[0] ?? defaultValue?.[0] ?? min;
    const currentValue = Math.min(max, Math.max(min, rawValue));
    const percentage = max === min ? 0 : ((currentValue - min) / (max - min)) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Math.min(max, Math.max(min, parseFloat(e.target.value)));
      onValueChange?.([newValue]);
    };

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
        {/* Track background */}
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-ink-800">
          {/* Filled range */}
          <div
            className="absolute h-full bg-parchment-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Native range input overlay */}
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          style={{ margin: 0 }}
        />
        {/* Custom thumb */}
        <div
          className={cn(
            'absolute h-5 w-5 rounded-full border-2 border-parchment-500 bg-parchment-200',
            'ring-offset-ink-900 transition-colors pointer-events-none',
            disabled && 'opacity-50'
          )}
          style={{
            left: `calc(${percentage}% - 10px)`,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
