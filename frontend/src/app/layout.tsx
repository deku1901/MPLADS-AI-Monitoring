import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MPLADS AI Monitoring Platform",
  description:
    "AI-powered closed-loop oversight for MPLADS project execution: automated risk detection, financial firebreaks, and intervention tracking.",
  keywords: ["MPLADS", "AI monitoring", "government", "intervention", "eSAKSHI"],
};

import { AuthProvider } from "@/lib/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
