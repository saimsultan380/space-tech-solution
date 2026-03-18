import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-foreground text-left block"
        >
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-3.5 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm",
          error && "border-destructive focus:ring-destructive/20",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export { Input };
