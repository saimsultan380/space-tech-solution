"use client";

import { useEffect, useState } from "react";

export default function Particles() {
  const [particles, setParticles] = useState<Array<{ id: number; left: string; top: string; size: number; delay: string; duration: string; opacity: number }>>([]);

  useEffect(() => {
    // Generate particles on client side to avoid hydration mismatch
    const generated = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 2, // 2-4px
      delay: `${Math.random() * 10}s`,
      duration: `${Math.random() * 20 + 20}s`, // 20-40s slow drift
      opacity: Math.random() * 0.2 + 0.2, // 20-40% opacity
    }));
    setParticles(generated);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <style>{`
        @keyframes drift-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-100vh); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[var(--accent-cyan)]"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `drift-up ${p.duration} linear ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
