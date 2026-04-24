"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorDot = useRef<HTMLDivElement>(null);
  const cursorRing = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const dot = cursorDot.current;
    const ring = cursorRing.current;
    if (!dot || !ring) return;

    const mouseX = window.innerWidth / 2;
    const mouseY = window.innerHeight / 2;
    
    // Set initial position immediately to avoid flashing at top left
    gsap.set(dot, { x: mouseX, y: mouseY, xPercent: -50, yPercent: -50 });
    gsap.set(ring, { x: mouseX, y: mouseY, xPercent: -50, yPercent: -50 });

    const xTo = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power2.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power2.out" });
    const ringXTo = gsap.quickTo(ring, "x", { duration: 0.4, ease: "power3.out" });
    const ringYTo = gsap.quickTo(ring, "y", { duration: 0.4, ease: "power3.out" });

    const onMouseMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      ringXTo(e.clientX);
      ringYTo(e.clientY);
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractable = 
        target.tagName.toLowerCase() === "a" ||
        target.tagName.toLowerCase() === "button" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("clickable");
      
      setIsHovering(!!isInteractable);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseover", onMouseOver);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorDot}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-[var(--accent-cyan)] pointer-events-none z-[9999]"
        style={{ mixBlendMode: "difference" }}
      />
      <div
        ref={cursorRing}
        className={`fixed top-0 left-0 rounded-full border border-[var(--accent-cyan)] pointer-events-none z-[9998] transition-all duration-300 ${
          isHovering ? "w-[60px] h-[60px] opacity-50 bg-[var(--accent-cyan)]/10" : "w-[36px] h-[36px] opacity-80"
        }`}
        style={{ mixBlendMode: "difference" }}
      />
    </>
  );
}
