"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (contentRef.current) {
        gsap.from(contentRef.current.children, {
          scrollTrigger: { trigger: contentRef.current, start: "top 80%" },
          y: 40,
          opacity: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: "power2.out"
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="cta" className="cta-section relative w-full py-32 px-8 bg-[var(--bg-card)] border-y border-[var(--accent-border)] overflow-hidden">
      <div ref={contentRef} className="max-w-3xl mx-auto flex flex-col items-center text-center relative z-10">
        
        <div className="tag mb-6">GET STARTED</div>
        
        <h2 className="text-[var(--accent-white)] mb-6">
          Ready to Take Control of<br />Your Call Center?
        </h2>
        
        <p className="body-text text-[var(--accent-dim)] max-w-xl mb-12">
          Stop wasting time on manual work and start scaling your operations with confidence.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/login" className="px-8 py-4 font-bold border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white transition-colors duration-300" style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>
            Book a Demo
          </Link>
          <Link href="/contact" className="px-8 py-4 font-bold bg-[var(--accent-cyan)] text-white hover:opacity-90 transition-opacity duration-300" style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>
            Contact Sales
          </Link>
        </div>

      </div>
    </section>
  );
}
