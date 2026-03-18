import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, label, error, id, options, placeholder, ...props }, ref) => (
    <div className={cn("space-y-1.5 text-left", containerClassName)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground block text-left">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-3.5 py-2 text-base shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm",
          error && "border-destructive focus:ring-destructive/20",
          className
        )}
        ref={ref}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";

export { Select };
