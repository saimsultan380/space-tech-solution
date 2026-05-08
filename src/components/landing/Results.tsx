"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { 
  Zap, 
  TrendingDown, 
  PieChart, 
  Users, 
  Timer 
} from "lucide-react";

const results = [
  { icon: Zap, value: 3, prefix: "", suffix: "× Faster", label: "Operations Speed", isNumber: true },
  { icon: TrendingDown, value: 67, prefix: "", suffix: "% Less", label: "Chargeback Rate", isNumber: true },
  { icon: PieChart, value: 100, prefix: "", suffix: "%", label: "Business Visibility", isNumber: true },
  { icon: Users, value: "Full", prefix: "", suffix: "", label: "Team Control", isNumber: false },
  { icon: Timer, value: 8, prefix: "", suffix: " hrs/week", label: "Time Saved", isNumber: true }
];

export default function Results() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(headerRef.current,
          { y: 30, opacity: 0 },
          {
            scrollTrigger: { trigger: headerRef.current, start: "top 85%" },
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power2.out"
          }
        );
      }

      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.result-card');
        const counters = gridRef.current.querySelectorAll('.counter-val');

        gsap.fromTo(cards,
          { y: 40, opacity: 0 },
          {
            scrollTrigger: { 
              trigger: gridRef.current, 
              start: "top 80%",
              toggleActions: "play none none none"
            },
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out",
            onStart: () => {
              // Start counter animations when cards start appearing
              counters.forEach((counter: Element, i) => {
                const dataVal = counter.getAttribute('data-val');
                if (dataVal !== null) {
                  const targetVal = parseFloat(dataVal);
                  const obj = { val: 0 };
                  gsap.to(obj, {
                    val: targetVal,
                    duration: 2,
                    ease: "power3.out",
                    delay: i * 0.1 + 0.3,
                    onUpdate: () => {
                      counter.innerHTML = Math.floor(obj.val).toString();
                    }
                  });
                }
              });
            }
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="results" className="w-full py-24 px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto">
        
        <div ref={headerRef} className="flex flex-col items-center text-center mb-16 section-heading">
          <div className="tag mb-4">RESULTS</div>
          <h2 className="text-[var(--accent-white)]">What You Gain</h2>
        </div>

        <div ref={gridRef} className="flex flex-wrap justify-center gap-6">
          {results.map((item, i) => (
            <div key={i} className="result-card bg-[var(--bg-card)] border border-[var(--accent-border)] rounded-lg p-6 flex flex-col items-center text-center flex-1 min-w-[200px] hover:shadow-[var(--glow-cyan)] hover:border-[var(--accent-cyan)] transition-all duration-300">
              <item.icon className="w-8 h-8 text-[var(--accent-cyan)] mb-4" />
              
              <div className="text-4xl font-semibold text-[var(--accent-cyan)] mb-2 whitespace-nowrap" style={{ fontFamily: "var(--font-poppins)" }}>
                {item.prefix}
                {item.isNumber ? (
                  <span className="counter-val" data-val={item.value}>0</span>
                ) : (
                  <span>{item.value}</span>
                )}
                {item.suffix}
              </div>
              
              <div className="text-[var(--accent-dim)] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
