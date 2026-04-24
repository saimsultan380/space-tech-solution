"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Navbar from "./Navbar";
import Hero from "./Hero";
import PainPoints from "./PainPoints";
import Solution from "./Solution";
import Features from "./Features";
import BillingStatus from "./BillingStatus";
import HowItWorks from "./HowItWorks";
import Results from "./Results";
import TargetAudience from "./TargetAudience";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";
import CustomCursor from "./CustomCursor";
import Particles from "./Particles";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  useEffect(() => {
    // Initial load animations are handled in Hero and globally,
    // ScrollTrigger setup is handled in individual components.
    
    // Refresh ScrollTrigger at different intervals to capture layout shifts
    const timers = [
      setTimeout(() => ScrollTrigger.refresh(), 100),
      setTimeout(() => ScrollTrigger.refresh(), 1000),
      setTimeout(() => ScrollTrigger.refresh(), 3000)
    ];

    const handleLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", handleLoad);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", handleLoad);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <main className="landing-page">
      <Particles />
      <CustomCursor />

      <Navbar />

      <div className="landing-content">
        <Hero />
        <PainPoints />
        <Solution />
        <Features />
        <BillingStatus />
        <HowItWorks />
        <Results />
        <TargetAudience />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}
