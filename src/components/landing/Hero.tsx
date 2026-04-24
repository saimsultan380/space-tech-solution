"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const typeTargetRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      
      tl.from(".hero-tag", { y: 20, opacity: 0, duration: 0.4 })
        .from(".hero-title-line", { y: 40, opacity: 0, stagger: 0.12, duration: 0.6, ease: "power3.out" }, "-=0.1")
        .from(".hero-sub", { y: 20, opacity: 0, duration: 0.5 }, "-=0.2")
        .from(".hero-btns", { y: 20, opacity: 0, duration: 0.4, scale: 0.95 }, "-=0.2")
        .from(".hero-stats", { opacity: 0, x: -20, duration: 0.4 }, "-=0.1")
        .from(".dashboard-mockup", { rotateY: 90, opacity: 0, duration: 1, ease: "power2.out" }, "-=0.6");
    });

    // Typewriter effect for "Smart System"
    let typeInterval: NodeJS.Timeout;
    if (typeTargetRef.current) {
      const text = "Smart System";
      let i = 0;
      typeTargetRef.current.innerHTML = "";
      typeInterval = setInterval(() => {
        if (typeTargetRef.current) {
          typeTargetRef.current.innerHTML += text.charAt(i);
          i++;
          if (i >= text.length) clearInterval(typeInterval);
        }
      }, 100);
    }

    return () => {
      ctx.revert();
      if (typeInterval) clearInterval(typeInterval);
    };
  }, []);

  return (
    <section ref={containerRef} className="relative w-full min-h-screen flex items-center pt-40 lg:pt-52 pb-12 px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column (60%) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col items-start z-10">
          <div className="hero-tag tag mb-10">
            ENTERPRISE CALL CENTER PLATFORM
          </div>
          
          <h1 className="hero-title text-[var(--accent-white)] mb-10">
            <div className="hero-title-line">Manage Your Entire</div>
            <div className="hero-title-line">Call Center in One</div>
            <div className="hero-title-line text-[var(--accent-cyan)] flex items-center gap-1">
              <span ref={typeTargetRef}></span>
              <span className="w-1 h-12 bg-[var(--accent-cyan)] animate-pulse inline-block"></span>
            </div>
          </h1>
          
          <p className="hero-sub body-text text-[var(--accent-dim)] max-w-xl mb-14">
            Stop juggling Google Sheets, chats, and manual tracking.
            Track sales, customers, agents, and billing —
            all in real time, under one roof.
          </p>
          
          <div className="hero-btns flex flex-wrap items-center gap-6 mb-16">
            <button className="px-8 py-4 font-bold border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white transition-colors duration-300" style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>
              Get Demo
            </button>
            <button className="px-8 py-4 font-bold bg-[var(--accent-cyan)] text-white hover:opacity-90 transition-opacity duration-300" style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>
              Start Free Trial →
            </button>
          </div>
          
          <div className="hero-stats border-t border-b border-[var(--accent-border)] py-4 flex items-center justify-between w-full max-w-lg body-text text-sm">
            <div className="flex flex-col">
              <span className="text-[var(--accent-white)] font-bold">↑ 340+</span>
              <span className="text-[var(--accent-dim)]">Agents Tracked</span>
            </div>
            <div className="w-px h-8 bg-[var(--accent-border)]"></div>
            <div className="flex flex-col">
              <span className="text-[var(--accent-green)] font-bold">↓ 67%</span>
              <span className="text-[var(--accent-dim)]">Chargebacks Reduced</span>
            </div>
            <div className="w-px h-8 bg-[var(--accent-border)]"></div>
            <div className="flex flex-col">
              <span className="text-[var(--accent-cyan)] font-bold">⚡ Real-time</span>
              <span className="text-[var(--accent-dim)]">Always On</span>
            </div>
          </div>
        </div>
        
        {/* Right Column (40%) */}
        <div className="col-span-1 lg:col-span-5 relative mt-12 lg:mt-0 h-[500px] flex justify-center items-center">
          
          {/* Dashboard Mockup */}
          <div className="dashboard-mockup w-full max-w-[450px] aspect-[4/3] p-4 flex flex-col relative z-10">
            {/* Top Bar */}
            <div className="flex items-center gap-2 mb-4 border-b border-[var(--accent-border)] pb-3">
              <div className="w-3 h-3 rounded-full bg-[var(--accent-red)]"></div>
              <div className="w-3 h-3 rounded-full bg-[var(--accent-yellow)]"></div>
              <div className="w-3 h-3 rounded-full bg-[var(--accent-green)]"></div>
              <span className="ml-4 text-xs text-[var(--accent-dim)]" style={{ fontFamily: "var(--font-space-mono)" }}>Call Center Dashboard</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[var(--bg-overlay)] border border-[var(--accent-border)] rounded p-3">
                <div className="text-[10px] text-[var(--accent-dim)] mb-1">Sales This Week</div>
                <div className="flex items-end gap-1 h-10 mt-2">
                  <div className="w-full bg-[var(--accent-cyan)] h-1/3 opacity-50"></div>
                  <div className="w-full bg-[var(--accent-cyan)] h-2/3 opacity-70"></div>
                  <div className="w-full bg-[var(--accent-cyan)] h-full"></div>
                  <div className="w-full bg-[var(--accent-cyan)] h-1/2 opacity-60"></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-[var(--bg-overlay)] border border-[var(--accent-border)] rounded p-3 h-full flex flex-col justify-center">
                  <div className="text-[10px] text-[var(--accent-dim)]">Active Agents</div>
                  <div className="text-xl font-bold text-[var(--accent-white)] mt-1">24</div>
                </div>
                <div className="bg-[var(--bg-overlay)] border border-[var(--accent-border)] rounded p-3 h-full flex flex-col justify-center">
                  <div className="text-[10px] text-[var(--accent-dim)]">Pending Bills</div>
                  <div className="text-xl font-bold text-[var(--accent-yellow)] mt-1">8</div>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--bg-overlay)] border border-[var(--accent-border)] rounded p-3 flex-1">
              <div className="flex justify-between text-[10px] text-[var(--accent-dim)] mb-2 border-b border-[var(--accent-border)] pb-2">
                <span>Agent Name</span>
                <span>Status</span>
                <span>Sales</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--accent-white)] mb-2">
                <span>Alex Mercer</span>
                <span className="text-[var(--accent-green)]">On Call</span>
                <span>12</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--accent-white)] mb-2">
                <span>Sarah Chen</span>
                <span className="text-[var(--accent-yellow)]">Idle</span>
                <span>8</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--accent-white)]">
                <span>Marcus Bell</span>
                <span className="text-[var(--accent-cyan)]">Closing</span>
                <span>15</span>
              </div>
            </div>
          </div>
          
          {/* Floating Chips */}
          <div className="absolute top-10 right-0 lg:-right-10 bg-[var(--bg-card)] border border-[var(--accent-green)] px-3 py-1 rounded-full shadow-[var(--glow-subtle)] flex items-center gap-2 z-20 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></div>
            <span className="text-[10px] font-bold text-[var(--accent-green)] tracking-widest">LIVE</span>
          </div>
          
          <div className="absolute -bottom-6 left-10 bg-[var(--bg-card)] border border-[var(--accent-cyan)] px-4 py-2 rounded shadow-[var(--shadow-deep)] flex items-center gap-3 z-20" style={{ animation: "float3d 5s ease-in-out infinite 1s" }}>
            <span className="text-xs text-[var(--accent-white)]" style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>Agent #12 — Sale Logged</span>
          </div>
          
          <div className="absolute top-1/2 -left-12 bg-[var(--bg-card)] border border-[var(--accent-border)] px-4 py-2 rounded shadow-[var(--shadow-deep)] flex items-center gap-2 z-20" style={{ animation: "float3d 7s ease-in-out infinite 2s" }}>
            <span className="text-xs text-[var(--accent-green)]">Bill Paid ✓</span>
          </div>
          
        </div>
      </div>
    </section>
  );
}
