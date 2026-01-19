import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

// Native SelectItem - just a wrapper for option data
interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function SelectItem({ value, children, disabled }: SelectItemProps) {
  return (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  );
}

// Simple native select wrapper
interface SimpleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function SimpleSelect({
  value,
  onValueChange,
  children,
  placeholder,
  disabled,
  className,
}: SimpleSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange(e.target.value);
  };

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-ink-600',
          'bg-ink-800 px-3 py-2 text-sm text-parchment-100',
          'focus:outline-none focus:ring-1 focus:ring-parchment-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'appearance-none cursor-pointer pr-8'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
    </div>
  );
}

// Legacy exports for compatibility (not actually used with native select)
const Select = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectValue = () => null;
const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SimpleSelect as default,
};
export { SimpleSelect };
