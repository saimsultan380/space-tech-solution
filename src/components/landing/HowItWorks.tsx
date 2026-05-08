"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { 
  LogIn, 
  PenLine, 
  CheckSquare, 
  RefreshCcw, 
  Monitor 
} from "lucide-react";

const steps = [
  {
    num: "01",
    icon: LogIn,
    title: "Agent Logs In",
    description: "Secure login with role-based access for every team member"
  },
  {
    num: "02",
    icon: PenLine,
    title: "Records Sale",
    description: "Agent records customer sale instantly into the system"
  },
  {
    num: "03",
    icon: CheckSquare,
    title: "Bill Verified",
    description: "Processor reviews, verifies, and processes the billing entry"
  },
  {
    num: "04",
    icon: RefreshCcw,
    title: "Status Updated",
    description: "Bill status updates in real-time across the entire platform"
  },
  {
    num: "05",
    icon: Monitor,
    title: "Manager Reviews",
    description: "Manager monitors all activity from the central dashboard"
  }
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);

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

      if (stepsContainerRef.current) {
        const stepElements = stepsContainerRef.current.querySelectorAll('.step-item');
        const lines = stepsContainerRef.current.querySelectorAll('.step-line-fill');
        const badges = stepsContainerRef.current.querySelectorAll('.step-badge');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stepsContainerRef.current,
            start: "top 70%"
          }
        });

        stepElements.forEach((step, i) => {
          // Animate the step container in
          tl.from(step, { y: 30, opacity: 0, duration: 0.4, ease: "power2.out" }, i * 0.4);
          
          // Bounce the badge
          tl.from(badges[i], { scale: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" }, "<");

          // Animate the lines within this step
          const stepLines = step.querySelectorAll('.step-line-fill');
          stepLines.forEach(line => {
            const isMobileLine = line.closest('.lg\\:hidden');
            if (isMobileLine) {
              tl.to(line, { height: "100%", duration: 0.4, ease: "none" }, "-=0.2");
            } else {
              tl.to(line, { width: "100%", duration: 0.4, ease: "none" }, "-=0.2");
            }
          });
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="w-full py-24 px-8 bg-[var(--bg-primary)] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        
        <div ref={headerRef} className="flex flex-col items-center text-center mb-24 section-heading">
          <div className="tag mb-4">WORKFLOW</div>
          <h2 className="text-[var(--accent-white)]">How It Works</h2>
        </div>

        <div ref={stepsContainerRef} className="grid grid-cols-2 lg:flex lg:flex-row items-start justify-between relative gap-y-12 lg:gap-0">
          
          {steps.map((item, i) => (
            <div key={i} className="step-item flex flex-col items-center lg:items-start text-center lg:text-left relative flex-1 px-2 sm:px-4">
              
              <div className="flex items-center justify-center w-full lg:justify-start relative z-10 mb-6">
                <div className="step-badge w-14 h-14 rounded-full border border-[var(--accent-cyan)] bg-[var(--bg-primary)] flex items-center justify-center shadow-[var(--glow-subtle)] relative">
                  <span className="text-[var(--accent-cyan)] text-lg font-bold" style={{ fontFamily: "var(--font-poppins)" }}>{item.num}</span>
                  
                  {/* Icon floating above badge */}
                  <div className="absolute -top-4 -right-2 bg-[var(--bg-card)] rounded p-1 border border-[var(--accent-border)]">
                    <item.icon className="w-4 h-4 text-[var(--accent-white)]" />
                  </div>
                </div>

                {/* Connecting Line (Only on desktop, hidden on last item) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute left-[3.5rem] top-1/2 -translate-y-1/2 w-[calc(100%-3.5rem)] h-[1px] bg-[var(--accent-border)] z-[-1] ml-4 overflow-hidden">
                    <div className="step-line-fill h-full w-0 bg-[var(--accent-cyan)] shadow-[0_0_8px_var(--accent-cyan)]"></div>
                  </div>
                )}
              </div>

              <h3 className="text-[var(--accent-white)] text-sm sm:text-lg mb-3 relative z-10" style={{ fontFamily: "var(--font-poppins)" }}>{item.title}</h3>
              <p className="body-text text-[var(--accent-dim)] text-[10px] sm:text-sm max-w-[200px] leading-relaxed mx-auto lg:mx-0 relative z-10">
                {item.description}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
