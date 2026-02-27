import * as React from 'react';
import { cn } from '@/utils';

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

const TooltipContext = React.createContext({ delayDuration: 300 });

function TooltipProvider({ children, delayDuration = 300 }: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

interface TooltipState {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const TooltipStateContext = React.createContext<TooltipState | null>(null);

interface TooltipProps {
  children: React.ReactNode;
}

function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <TooltipStateContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </TooltipStateContext.Provider>
  );
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
  ({ children, asChild }, ref) => {
    const ctx = React.useContext(TooltipStateContext);
    const { delayDuration } = React.useContext(TooltipContext);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEnter = React.useCallback(() => {
      timeoutRef.current = setTimeout(() => {
        ctx?.setOpen(true);
      }, delayDuration);
    }, [ctx, delayDuration]);

    const handleLeave = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      ctx?.setOpen(false);
    }, [ctx]);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const props = {
      onMouseEnter: handleEnter,
      onMouseLeave: handleLeave,
      onFocus: handleEnter,
      onBlur: handleLeave,
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        ...props,
        ref: (node: HTMLElement | null) => {
          if (ctx) ctx.triggerRef.current = node;
          if (typeof ref === 'function') ref(node as HTMLDivElement);
          else if (ref) ref.current = node as HTMLDivElement;
        },
      });
    }

    return (
      <div ref={(node) => {
        if (ctx) ctx.triggerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }} {...props}>
        {children}
      </div>
    );
  }
);
TooltipTrigger.displayName = 'TooltipTrigger';

interface TooltipContentProps {
  children?: React.ReactNode;
  className?: string;
  sideOffset?: number;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, className, sideOffset = 4 }, ref) => {
    const ctx = React.useContext(TooltipStateContext);
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

    React.useEffect(() => {
      if (!ctx?.open || !ctx.triggerRef.current) {
        setPosition(null);
        return;
      }

      const rect = ctx.triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + sideOffset,
        left: rect.left + rect.width / 2,
      });
    }, [ctx?.open, sideOffset]);

    if (!ctx?.open || !position || !children) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed z-50 px-2.5 py-1.5 text-xs rounded-md shadow-md',
          'bg-ink-800 text-parchment-200 border border-ink-600',
          'animate-in fade-in-0 zoom-in-95 pointer-events-none',
          className
        )}
        style={{
          top: position.top,
          left: position.left,
          transform: 'translateX(-50%)',
        }}
      >
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
