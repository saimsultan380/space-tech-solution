"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { 
  FileSpreadsheet, 
  EyeOff, 
  AlertTriangle, 
  ShieldX, 
  UserX, 
  Clock 
} from "lucide-react";

const painPoints = [
  {
    icon: FileSpreadsheet,
    title: "Scattered Data",
    description: "Sales data scattered across Google Sheets & chats with no single source of truth"
  },
  {
    icon: EyeOff,
    title: "Zero Visibility",
    description: "No real-time visibility on customer responses or live call status"
  },
  {
    icon: AlertTriangle,
    title: "High Chargebacks",
    description: "Poor tracking leads to chargebacks that drain your revenue every month"
  },
  {
    icon: ShieldX,
    title: "Billing Failures",
    description: "Processors struggle to verify and process bills without a clear system"
  },
  {
    icon: UserX,
    title: "Uncontrolled Agents",
    description: "No control over agent performance — you can't manage what you can't see"
  },
  {
    icon: Clock,
    title: "Billing Delays",
    description: "Manual status updates cause delays, confusion, and missed payments"
  }
];

export default function PainPoints() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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
        gsap.fromTo(gridRef.current.children,
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
            duration: 0.5,
            ease: "power2.out",
            clearProps: "all"
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="pain-points" className="w-full py-24 px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto">
        
        <div ref={headerRef} className="flex flex-col items-center text-center mb-16">
          <div className="tag mb-4">THE PROBLEM</div>
          <h2 className="text-[var(--accent-white)] mb-4">
            Why Call Centers Are<br />Losing Time & Money
          </h2>
          <p className="body-text text-[var(--accent-dim)] max-w-xl">
            If your operation feels messy, slow, and risky &mdash; you&apos;re not alone.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <style>{`
            .pain-card {
              transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              position: relative;
            }
            .pain-card:hover {
              transform: translateY(-8px);
              box-shadow: 0 20px 40px rgba(239, 68, 68, 0.08);
              border: 1px solid var(--accent-red) !important;
            }
            .pain-card:hover .pain-icon {
              transform: scale(1.1) rotate(-5deg);
              color: var(--accent-red);
            }
          `}</style>
          {painPoints.map((item, i) => (
            <div 
              key={i} 
              className="pain-card bg-[var(--bg-card)] border border-[var(--accent-border)] p-8 rounded-xl flex flex-col group"
            >
              <item.icon className="pain-icon w-8 h-8 text-[var(--accent-red)]/80 mb-6 transition-all duration-300" />
              <h3 className="text-[var(--accent-white)] text-xl mb-4 group-hover:text-[var(--accent-red)] transition-colors duration-300" style={{ fontFamily: "var(--font-poppins)" }}>
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
