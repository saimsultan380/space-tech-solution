"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Loader2 } from "@/components/ui/icons";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <Loader2 className={cn("h-6 w-6 animate-spin text-primary/80", className)} />
      <div className={cn("absolute h-6 w-6 rounded-full border-2 border-primary/10", className)} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(145deg, #f8faff 0%, #ffffff 55%, #f0f4ff 100%)" }}
    >
      <style>{`
        @keyframes sts-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sts-logo-breathe {
          0%, 100% { filter: drop-shadow(0 2px 12px rgba(30,58,138,0.06)); transform: scale(1); }
          50%       { filter: drop-shadow(0 4px 24px rgba(30,58,138,0.18)); transform: scale(1.03); }
        }
        @keyframes sts-bar {
          0%   { left: -45%; }
          100% { left: 120%; }
        }
        @keyframes sts-dot {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40%            { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* Logo */}
      <div
        style={{
          animation: "sts-fade-up 0.5s cubic-bezier(.22,.68,0,1.2) both, sts-logo-breathe 2.8s ease-in-out 0.5s infinite",
          marginBottom: "36px",
        }}
      >
        <Image
          src="/space-tech-logo.png"
          alt="Space Tech Solution"
          width={260}
          height={85}
          style={{ width: "200px", height: "auto" }}
          priority
        />
      </div>

      {/* Progress track */}
      <div
        style={{
          position: "relative",
          width: "180px",
          height: "3px",
          borderRadius: "9999px",
          background: "#e4eaf6",
          overflow: "hidden",
          marginBottom: "22px",
          animation: "sts-fade-up 0.5s 0.15s cubic-bezier(.22,.68,0,1.2) both",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            width: "45%",
            height: "100%",
            borderRadius: "9999px",
            background: "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 60%, #93c5fd 100%)",
            animation: "sts-bar 1.1s ease-in-out infinite",
          }}
        />
      </div>

      {/* Bouncing dots */}
      <div
        style={{
          display: "flex",
          gap: "7px",
          alignItems: "center",
          animation: "sts-fade-up 0.5s 0.25s cubic-bezier(.22,.68,0,1.2) both",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#1e3a8a",
              animation: `sts-dot 1.1s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
