import * as React from 'react';

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

// Simple context for tooltip delay
const TooltipContext = React.createContext({ delayDuration: 300 });

function TooltipProvider({ children, delayDuration = 300 }: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

interface TooltipProps {
  children: React.ReactNode;
}

function Tooltip({ children }: TooltipProps) {
  return <>{children}</>;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
  ({ children, asChild }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return <div ref={ref}>{children}</div>;
  }
);
TooltipTrigger.displayName = 'TooltipTrigger';

interface TooltipContentProps {
  children?: React.ReactNode;
  className?: string;
  sideOffset?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (_props, _ref) => {
    // For now, just render nothing - tooltips are optional
    // This prevents Radix UI issues while keeping the API compatible
    return null;
  }
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
