import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter, Mail } from "@/components/ui/icons";

export default function Footer() {
  return (
    <footer className="w-full bg-[var(--bg-primary)] pt-20 pb-8 px-8 border-t border-[var(--accent-border)]">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">

          {/* Column 1 - Brand */}
          <div className="col-span-1 md:col-span-6 flex flex-col items-start">
            <Link href="/" className="mb-6">
              <Image
                src="/space-tech-logo.png"
                alt="Space Tech Solution"
                width={260}
                height={85}
                className="h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-[var(--accent-white)] text-lg mb-4 leading-relaxed" style={{ fontFamily: "var(--font-poppins)" }}>
              &quot;Run your call center smarter,<br />faster, and with zero chaos.&quot;
            </p>
            <p className="body-text text-[var(--accent-dim)] text-sm">
              Engineered for high-volume operations.
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div className="col-span-1 md:col-span-3 flex flex-col">
            <div className="text-[var(--accent-white)] text-xs font-bold tracking-widest uppercase mb-6" style={{ fontFamily: "var(--font-space-mono)" }}>
              PLATFORM
            </div>
            <div className="flex flex-col gap-4 body-text text-[var(--accent-dim)] text-sm">
              <Link href="#features" className="hover:text-[var(--accent-cyan)] transition-colors">Features</Link>
              <Link href="#how-it-works" className="hover:text-[var(--accent-cyan)] transition-colors">How It Works</Link>
              <Link href="#pricing" className="hover:text-[var(--accent-cyan)] transition-colors">Pricing</Link>
              <Link href="/docs" className="hover:text-[var(--accent-cyan)] transition-colors">Documentation</Link>
            </div>
          </div>

          {/* Column 3 - Contact */}
          <div className="col-span-1 md:col-span-3 flex flex-col">
            <div className="text-[var(--accent-white)] text-xs font-bold tracking-widest uppercase mb-6" style={{ fontFamily: "var(--font-space-mono)" }}>
              CONTACT
            </div>
            <div className="flex flex-col gap-4 body-text text-[var(--accent-dim)] text-sm mb-8">
              <Link href="/demo" className="hover:text-[var(--accent-cyan)] transition-colors">Book a Demo</Link>
              <Link href="/sales" className="hover:text-[var(--accent-cyan)] transition-colors">Contact Sales</Link>
              <Link href="/support" className="hover:text-[var(--accent-cyan)] transition-colors">Support</Link>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-dim)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-dim)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-dim)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--accent-border)] pt-8 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 body-text text-xs text-[var(--accent-dim)]">
          <p>© 2026 Space Tech Solution · All rights reserved</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[var(--accent-white)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--accent-white)] transition-colors">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
