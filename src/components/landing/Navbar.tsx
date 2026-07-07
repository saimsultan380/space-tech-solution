"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial load animation
      gsap.from(navRef.current, { y: -60, opacity: 0, duration: 0.6, ease: "power2.out" });
    });

    // Scroll effect
    const handleScroll = () => {
      if (window.scrollY > 50) {
        navRef.current?.classList.add("scrolled");
      } else {
        navRef.current?.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      ctx.revert();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 border-b border-[var(--accent-border)] bg-white"
    >
      <style>{`
        nav.scrolled {
          box-shadow: 0 2px 40px rgba(0,212,255,0.12);
        }
        .nav-link {
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          text-transform: uppercase;
          color: var(--accent-dim);
          position: relative;
          transition: color 0.2s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0%;
          height: 2px;
          background-color: var(--accent-cyan);
          transition: width 0.3s ease;
        }
        .nav-link:hover {
          color: var(--accent-cyan);
        }
        .nav-link:hover::after {
          width: 100%;
        }
      `}</style>

      {/* Logo */}
      <Link href="/" className="flex items-center">
        <Image
          src="/space-tech-logo.png"
          alt="Space Tech Solution"
          width={220}
          height={72}
          className="h-14 w-auto object-contain"
          priority
        />
      </Link>

      {/* Center Links (Hidden on mobile) */}
      <div className="hidden md:flex items-center gap-8">
        <Link href="#features" className="nav-link">Features</Link>
        <Link href="#how-it-works" className="nav-link">How It Works</Link>
        <Link href="#pricing" className="nav-link">Pricing</Link>
        <Link href="#contact" className="nav-link">Contact</Link>
      </div>

      {/* CTA Buttons */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/login"
          className="hidden sm:inline-flex px-4 py-2 text-sm font-bold border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white transition-colors duration-300"
          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          Get Demo
        </Link>
        <Link
          href="/login"
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-[var(--accent-cyan)] text-white hover:opacity-90 transition-opacity duration-300"
          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          Start Free Trial →
        </Link>
      </div>
    </nav>
  );
}
