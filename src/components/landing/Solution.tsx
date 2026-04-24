"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Solution() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          scrollTrigger: { trigger: headerRef.current, start: "top 80%" },
          y: 40,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out"
        });
      }

      if (diagramRef.current) {
        gsap.from(diagramRef.current.children, {
          scrollTrigger: { trigger: diagramRef.current, start: "top 75%" },
          scale: 0.9,
          opacity: 0,
          stagger: 0.2,
          duration: 0.6,
          ease: "back.out(1.7)"
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="solution" className="w-full py-24 px-8 bg-[var(--bg-primary)] overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        
        <div ref={headerRef} className="flex flex-col items-center text-center mb-20 section-heading">
          <div className="tag mb-4">THE SOLUTION</div>
          <h2 className="text-[var(--accent-white)] mb-6">
            One Platform.<br />Total Control.
          </h2>
          <p className="body-text text-[var(--accent-dim)] max-w-2xl">
            Our system is built specifically for call centers handling
            Xfinity & utility billing in the USA. It centralizes your
            entire workflow so your team can work faster, smarter,
            and with full transparency.
          </p>
        </div>

        {/* Animated Flow Diagram */}
        <div ref={diagramRef} className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative">
          
          <style>{`
            .flow-line {
              position: relative;
              flex: 1;
              height: 2px;
              background: var(--accent-border);
              margin: 0 16px;
              min-width: 40px;
            }
            @media (max-width: 768px) {
              .flow-line {
                width: 2px;
                height: 40px;
                min-height: 40px;
                margin: 16px 0;
              }
            }
            .flow-dot {
              position: absolute;
              top: -3px;
              left: 0;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--accent-cyan);
              box-shadow: 0 0 10px var(--accent-cyan);
              animation: travel 2s infinite linear;
            }
            @media (max-width: 768px) {
              .flow-dot {
                top: 0;
                left: -3px;
                animation: travel-y 2s infinite linear;
              }
            }
            @keyframes travel {
              0% { left: 0; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { left: 100%; opacity: 0; }
            }
            @keyframes travel-y {
              0% { top: 0; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            .node {
              background: var(--bg-card);
              padding: 16px 24px;
              border-radius: 8px;
              border: 1px solid;
              font-family: var(--font-poppins);
              font-weight: 600;
              font-size: 14px;
              text-align: center;
              white-space: nowrap;
              position: relative;
              z-index: 2;
            }
          `}</style>

          {/* Node 1 */}
          <div className="node text-[var(--accent-white)] border-[var(--accent-cyan)] shadow-[0_0_15px_rgba(0,212,255,0.1)]">
            Agent
          </div>

          <div className="flow-line"><div className="flow-dot"></div></div>

          {/* Node 2 */}
          <div className="node text-[var(--accent-white)] border-[var(--accent-green)] shadow-[0_0_15px_rgba(0,230,118,0.1)]">
            Sales Log
          </div>

          <div className="flow-line"><div className="flow-dot" style={{ animationDelay: "0.5s" }}></div></div>

          {/* Node 3 */}
          <div className="node text-[var(--accent-white)] border-[var(--accent-yellow)] shadow-[0_0_15px_rgba(255,214,0,0.1)]">
            Processor
          </div>

          <div className="flow-line"><div className="flow-dot" style={{ animationDelay: "1s" }}></div></div>

          {/* Node 4 */}
          <div className="node text-[var(--accent-cyan)] border-[var(--accent-cyan)] shadow-[0_0_20px_rgba(0,212,255,0.2)]">
            Manager Dashboard
          </div>

        </div>
      </div>
    </section>
  );
}
