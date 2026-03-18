"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_0.15s_ease-out]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-50 my-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-card p-6 shadow-2xl animate-[scale-in_0.2s_ease-out] sm:p-6",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-md bg-muted/50 p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 sm:right-4 sm:top-4 sm:bg-transparent sm:p-1.5"
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5 text-left", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-bold leading-none tracking-tight", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-5", className)}>
      {children}
    </div>
  );
}
