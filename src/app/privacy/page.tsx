import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Space Tech Solution",
  description: "Learn how Space Tech Solution collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="landing-page min-h-screen bg-[#fafafa]">
      <div className="landing-content">
        {/* Header */}
        <nav className="w-full px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <Link href="/" className="text-[var(--accent-cyan)] font-bold text-xl tracking-wider" style={{ fontFamily: "var(--font-poppins)" }}>
            [ Space Tech Solution ]
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors" style={{ fontFamily: "var(--font-space-mono)" }}>
            ← Back to Home
          </Link>
        </nav>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-8 py-20">
          <div className="mb-12">
            <div className="tag mb-4">LEGAL</div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>Privacy Policy</h1>
            <p className="text-slate-500 text-sm" style={{ fontFamily: "var(--font-space-mono)" }}>Last updated: May 8, 2026</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-10 text-slate-700" style={{ fontFamily: "var(--font-ibm-plex-mono)", lineHeight: "1.8" }}>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>1. Introduction</h2>
              <p className="text-sm leading-7">
                Space Tech Solution (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>2. Information We Collect</h2>
              <p className="text-sm leading-7 mb-3">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-sm space-y-2">
                <li>Name, email address, and contact details when you register an account</li>
                <li>Company name, role, and team information</li>
                <li>Sales, billing, and operational data entered into the platform</li>
                <li>Usage data and activity logs generated through platform interactions</li>
                <li>Device and browser information for security and analytics purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>3. How We Use Your Information</h2>
              <p className="text-sm leading-7 mb-3">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-sm space-y-2">
                <li>Provide, operate, and maintain the Space Tech Solution platform</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative information, updates, and security alerts</li>
                <li>Respond to comments and questions and provide customer support</li>
                <li>Analyze usage data to improve our platform and develop new features</li>
                <li>Comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>4. Data Sharing & Disclosure</h2>
              <p className="text-sm leading-7">
                We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our platform, conducting our business, or servicing you — so long as those parties agree to keep this information confidential. We may also disclose your information when required by law or to protect our rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>5. Data Security</h2>
              <p className="text-sm leading-7">
                We implement industry-standard security measures to protect your data, including encryption at rest and in transit, role-based access controls, and regular security audits. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>6. Data Retention</h2>
              <p className="text-sm leading-7">
                We retain your personal data for as long as your account is active or as needed to provide you services. You may request deletion of your data at any time by contacting us. We will respond to such requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>7. Your Rights</h2>
              <p className="text-sm leading-7 mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-sm space-y-2">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications at any time</li>
                <li>Data portability — receive your data in a structured format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>8. Cookies</h2>
              <p className="text-sm leading-7">
                We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our platform may not function properly without cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>9. Contact Us</h2>
              <p className="text-sm leading-7">
                If you have any questions about this Privacy Policy, please contact us at:{" "}
                <a href="mailto:privacy@spacetechsolution.com" className="text-[var(--accent-cyan)] hover:underline">
                  privacy@spacetechsolution.com
                </a>
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400" style={{ fontFamily: "var(--font-space-mono)" }}>
            <span>© 2026 Space Tech Solution</span>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
