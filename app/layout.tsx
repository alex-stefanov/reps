import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const description =
  "The daily loop, verified. A character-driven operating system for becoming a real software engineer.";

// Absolute base for OG/icon URLs. Vercel provides VERCEL_URL per deployment;
// fall back to localhost in dev so `next build` doesn't warn.
const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Reps",
  description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Reps",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Reps",
    description,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f3f7",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-base text-text font-sans">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
