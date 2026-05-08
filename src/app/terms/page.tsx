import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Space Tech Solution",
  description: "Read the Terms of Service for using the Space Tech Solution platform.",
};

export default function TermsPage() {
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
            <h1 className="text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>Terms of Service</h1>
            <p className="text-slate-500 text-sm" style={{ fontFamily: "var(--font-space-mono)" }}>Last updated: May 8, 2026</p>
          </div>

          <div className="space-y-10 text-slate-700" style={{ fontFamily: "var(--font-ibm-plex-mono)", lineHeight: "1.8" }}>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>1. Acceptance of Terms</h2>
              <p className="text-sm leading-7">
                By accessing or using Space Tech Solution (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. These terms apply to all users, including administrators, managers, processors, and agents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>2. Description of Service</h2>
              <p className="text-sm leading-7">
                Space Tech Solution provides a call center management platform designed for businesses handling Xfinity and utility billing operations in the USA. The Platform includes tools for sales logging, agent management, billing verification, and real-time performance tracking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>3. Account Registration</h2>
              <p className="text-sm leading-7 mb-3">To use the Platform, you must:</p>
              <ul className="list-disc pl-6 text-sm space-y-2">
                <li>Provide accurate, current, and complete registration information</li>
                <li>Maintain the security of your password and accept all risks of unauthorized access</li>
                <li>Promptly notify us of any unauthorized use of your account</li>
                <li>Be at least 18 years old or have the authority to bind your organization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>4. Acceptable Use</h2>
              <p className="text-sm leading-7 mb-3">You agree not to use the Platform to:</p>
              <ul className="list-disc pl-6 text-sm space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Enter false, misleading, or fraudulent data</li>
                <li>Attempt to gain unauthorized access to other accounts or systems</li>
                <li>Reverse engineer, decompile, or disassemble the Platform</li>
                <li>Use automated scripts to access the Platform in ways that damage or overload our servers</li>
                <li>Share your login credentials with unauthorized users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>5. Subscription & Billing</h2>
              <p className="text-sm leading-7">
                Access to certain features of the Platform requires a paid subscription. Subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as expressly stated in our refund policy. We reserve the right to modify pricing with 30 days notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>6. Intellectual Property</h2>
              <p className="text-sm leading-7">
                The Platform and its original content, features, and functionality are and will remain the exclusive property of Space Tech Solution. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Space Tech Solution.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>7. Data Ownership</h2>
              <p className="text-sm leading-7">
                You retain full ownership of all data you enter into the Platform. By using the Platform, you grant us a limited, non-exclusive license to process your data solely for the purpose of providing the service. We do not claim ownership of your business data and will not use it for any other purpose without your consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>8. Limitation of Liability</h2>
              <p className="text-sm leading-7">
                To the maximum extent permitted by law, Space Tech Solution shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Platform. Our total liability to you for any claim arising from these Terms shall not exceed the amount you paid us in the 3 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>9. Termination</h2>
              <p className="text-sm leading-7">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Platform will cease immediately. You may request an export of your data within 30 days of termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>10. Changes to Terms</h2>
              <p className="text-sm leading-7">
                We reserve the right to modify these Terms at any time. We will provide notice of significant changes by email or through the Platform. Your continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>11. Contact Us</h2>
              <p className="text-sm leading-7">
                If you have any questions about these Terms, please contact us at:{" "}
                <a href="mailto:legal@spacetechsolution.com" className="text-[var(--accent-cyan)] hover:underline">
                  legal@spacetechsolution.com
                </a>
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400" style={{ fontFamily: "var(--font-space-mono)" }}>
            <span>© 2026 Space Tech Solution</span>
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
