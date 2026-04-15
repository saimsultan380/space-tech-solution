import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RouteLoadingProvider } from "@/components/providers/route-loading-provider";

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
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RouteLoadingProvider>{children}</RouteLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
