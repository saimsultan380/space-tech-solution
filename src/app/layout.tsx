import type { Metadata } from "next";
import { Poppins, Quicksand, Space_Mono } from "next/font/google";
import "./globals.css";
import "./landing.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RouteLoadingProvider } from "@/components/providers/route-loading-provider";
import { QueryProvider } from "@/components/providers/query-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Space Tech Solution",
  description: "Space Tech Solution - ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${quicksand.variable} ${spaceMono.variable} antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <RouteLoadingProvider>{children}</RouteLoadingProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
