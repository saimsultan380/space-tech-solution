"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { 
  PhoneCall, 
  Zap, 
  Headphones, 
  Gauge 
} from "lucide-react";

const audiences = [
  {
    icon: PhoneCall,
    title: "Call Centers",
    description: "Handling Xfinity sales and high-volume inbound/outbound calls"
  },
  {
    icon: Zap,
    title: "Utility Billing Companies",
    description: "Managing complex utility billing workflows across multiple accounts"
  },
  {
    icon: Headphones,
    title: "Sales Teams",
    description: "Teams managing high call volume needing real-time performance data"
  },
  {
    icon: Gauge,
    title: "Operations Managers",
    description: "Leaders who demand full visibility and control over every process"
  }
];

export default function TargetAudience() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (textRef.current) {
        gsap.fromTo(textRef.current, 
          { x: -40, opacity: 0 },
          {
            scrollTrigger: { trigger: textRef.current, start: "top 85%" },
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
          }
        );
      }

      if (gridRef.current) {
        gsap.fromTo(gridRef.current.children,
          { y: 30, opacity: 0 },
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
            clearProps: "all"
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="audience" className="w-full py-24 px-8 bg-[var(--bg-primary)] overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Content */}
        <div ref={textRef} className="col-span-1 lg:col-span-5 flex flex-col items-start z-10">
          <div className="tag mb-4">BUILT FOR</div>
          <h2 className="text-[var(--accent-white)] mb-6">
            Built For People<br />Who Mean Business
          </h2>
          <p className="body-text text-[var(--accent-dim)] mb-10">
            Our platform isn&apos;t a generic CRM. It&apos;s engineered specifically for high-velocity teams managing complex billing operations and high call volumes.
          </p>
        </div>

        {/* Right Content */}
        <div ref={gridRef} className="col-span-1 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          {audiences.map((item, i) => (
            <div key={i} className="feature-card flex flex-col items-start text-left bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--accent-border)] relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--accent-cyan)]/10 mb-5">
                <item.icon className="w-5 h-5 text-[var(--accent-cyan)]" />
              </div>
              <h3 className="text-[var(--accent-white)] text-lg mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                {item.title}
              </h3>
              <p className="body-text text-[var(--accent-dim)] text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
