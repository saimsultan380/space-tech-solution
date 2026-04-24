"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function BillingStatus() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (textRef.current) {
        gsap.fromTo(textRef.current,
          { x: -40, opacity: 0 },
          {
            scrollTrigger: { trigger: textRef.current, start: "top 80%" },
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
          }
        );
      }

      if (panelRef.current) {
        gsap.fromTo(panelRef.current,
          { x: 40, opacity: 0 },
          {
            scrollTrigger: { trigger: panelRef.current, start: "top 80%" },
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
          }
        );
      }

      // Number counter animation
      if (counterRef.current) {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top 75%",
          onEnter: () => {
            const obj = { val: 0 };
            gsap.to(obj, {
              val: 2840,
              duration: 2.5,
              ease: "power3.out",
              onUpdate: () => {
                if (counterRef.current) {
                  counterRef.current.innerText = Math.floor(obj.val).toLocaleString();
                }
              }
            });
          },
          once: true
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="billing" className="w-full py-24 px-8 bg-[var(--bg-primary)] overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Content */}
        <div ref={textRef} className="flex flex-col items-start z-10">
          <div className="tag mb-4">BILLING SYSTEM</div>
          <h2 className="text-[var(--accent-white)] mb-6">
            Simple & Clear<br />Billing Tracking
          </h2>
          <p className="body-text text-[var(--accent-dim)] max-w-lg mb-10">
            No confusion. No missed payments. Everything tracked in one place with our centralized dashboard.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="p-4 border border-[var(--accent-border)] rounded-lg bg-[var(--bg-card)] min-w-[200px]">
              <div className="text-[var(--accent-dim)] text-xs uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-space-mono)" }}>Total Processed</div>
              <div className="text-4xl font-bold text-[var(--accent-cyan)]" style={{ fontFamily: "var(--font-poppins)" }}>
                <span ref={counterRef}>0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: 3D Panel */}
        <div ref={panelRef} className="flex justify-center items-center h-[400px] perspective-container z-10 relative">
          
          <div className="billing-panel w-full max-w-[500px] bg-[var(--bg-card)] border border-[var(--accent-border)] rounded-lg p-6 shadow-[var(--shadow-deep)] flex flex-col gap-4 relative">
            
            <div className="flex justify-between items-center border-b border-[var(--accent-border)] pb-4 mb-2">
              <h3 className="text-[var(--accent-white)] text-sm" style={{ fontFamily: "var(--font-poppins)" }}>BILLING STATUS OVERVIEW</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--accent-green)] tracking-widest">LIVE</span>
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse"></div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-2 border-b border-[var(--bg-overlay)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent-green)]">✓</span>
                  <span className="text-sm text-[var(--accent-white)] body-text">Bill Paid via Card</span>
                </div>
                <div className="px-3 py-1 rounded bg-[rgba(0,230,118,0.12)] border border-[var(--accent-green)] text-[var(--accent-green)] text-[10px] tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>COMPLETED</div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-2 border-b border-[var(--bg-overlay)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent-green)]">✓</span>
                  <span className="text-sm text-[var(--accent-white)] body-text">Bill Paid via Check</span>
                </div>
                <div className="px-3 py-1 rounded bg-[rgba(0,230,118,0.12)] border border-[var(--accent-green)] text-[var(--accent-green)] text-[10px] tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>COMPLETED</div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-2 border-b border-[var(--bg-overlay)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent-green)]">✓</span>
                  <span className="text-sm text-[var(--accent-white)] body-text">Cash Payments Logged</span>
                </div>
                <div className="px-3 py-1 rounded bg-[rgba(0,230,118,0.12)] border border-[var(--accent-green)] text-[var(--accent-green)] text-[10px] tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>COMPLETED</div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between py-2 border-b border-[var(--bg-overlay)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent-yellow)]">⏳</span>
                  <span className="text-sm text-[var(--accent-white)] body-text">Pending Verification</span>
                </div>
                <div className="px-3 py-1 rounded bg-[rgba(255,214,0,0.12)] border border-[var(--accent-yellow)] text-[var(--accent-yellow)] text-[10px] tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>PENDING</div>
              </div>

              {/* Row 5 */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent-red)]">✗</span>
                  <span className="text-sm text-[var(--accent-dim)] body-text">Failed Transaction</span>
                </div>
                <div className="px-3 py-1 rounded bg-[rgba(255,59,59,0.12)] border border-[var(--accent-red)] text-[var(--accent-red)] text-[10px] tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>FAILED</div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
