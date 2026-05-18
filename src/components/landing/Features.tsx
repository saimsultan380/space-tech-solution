"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { 
  LayoutDashboard, 
  Activity, 
  Receipt, 
  RefreshCw, 
  TrendingDown, 
  BarChart2, 
  UserCheck, 
  DollarSign 
} from "@/components/ui/icons";

const features = [
  {
    icon: LayoutDashboard,
    title: "Manage Sales & Customers",
    description: "Track every sale and customer in one dashboard — no more switching between tools"
  },
  {
    icon: Activity,
    title: "Real-Time Call Tracking",
    description: "See customer responses instantly and make faster decisions"
  },
  {
    icon: Receipt,
    title: "Accurate Billing Processing",
    description: "Ensure every bill is processed correctly with clear status tracking"
  },
  {
    icon: RefreshCw,
    title: "Smart Bill Status Updates",
    description: "Update and monitor bill status (Paid, Pending, Failed) in one click"
  },
  {
    icon: TrendingDown,
    title: "Chargeback Reduction",
    description: "Minimize chargebacks with better tracking and automated verification"
  },
  {
    icon: BarChart2,
    title: "Agent Performance Monitor",
    description: "Track who is performing and who needs coaching or improvement"
  },
  {
    icon: UserCheck,
    title: "Employee Activity Tracking",
    description: "Know exactly which agent is working, idle, or closing deals"
  },
  {
    icon: DollarSign,
    title: "Salary & Commission Mgmt",
    description: "Easily manage employee payouts based on verified performance data"
  }
];

export default function Features() {
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
            stagger: 0.05,
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
    <section ref={sectionRef} id="features" className="w-full py-24 px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto">
        
        <div ref={headerRef} className="flex flex-col items-center text-center mb-16 section-heading">
          <div className="tag mb-4">CORE FEATURES</div>
          <h2 className="text-[var(--accent-white)]">
            Everything Your Team Needs
          </h2>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 card-grid">
          {features.map((item, i) => (
            <div key={i} className="feature-card flex flex-col items-start text-left">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--accent-cyan)]/10 mb-6">
                <item.icon className="w-6 h-6 text-[var(--accent-cyan)]" />
              </div>
              <h3 className="text-[var(--accent-white)] text-lg mb-3" style={{ fontFamily: "var(--font-poppins)" }}>
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
