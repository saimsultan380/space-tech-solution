import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("@/components/landing/LandingPage"), {
  ssr: true,  // Keep SSR for SEO
  loading: () => <div className="min-h-screen bg-background" />
});

export default function Home() {
  return <LandingPage />;
}
