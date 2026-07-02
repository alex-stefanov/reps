import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reps",
  description:
    "The daily loop, verified. A character-driven operating system for becoming a real software engineer.",
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
        {children}
      </body>
    </html>
  );
}
