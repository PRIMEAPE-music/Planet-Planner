import * as React from 'react';
import { cn } from '@/utils';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'default' | 'sm' | 'lg';
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      size = 'default',
      pressed,
      defaultPressed = false,
      onPressedChange,
      onClick,
      ...props
    },
    ref
  ) => {
    const [internalPressed, setInternalPressed] = React.useState(defaultPressed);
    const isControlled = pressed !== undefined;
    const isPressed = isControlled ? pressed : internalPressed;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const newValue = !isPressed;
      if (!isControlled) {
        setInternalPressed(newValue);
      }
      onPressedChange?.(newValue);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={isPressed}
        data-state={isPressed ? 'on' : 'off'}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-parchment-400 transition-colors',
          'hover:bg-ink-800 hover:text-parchment-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
          'disabled:pointer-events-none disabled:opacity-50',
          isPressed && 'bg-ink-700 text-parchment-100',
          {
            'h-10 w-10': size === 'default',
            'h-8 w-8': size === 'sm',
            'h-12 w-12': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
