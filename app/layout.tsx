import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono, Silkscreen } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
});

const pixel = Silkscreen({
  weight: ["400", "700"],
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reps",
  description:
    "The daily loop, verified. A character-driven operating system for becoming a real software engineer.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f0c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${jbMono.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-fg font-sans">
        {children}
      </body>
    </html>
  );
}
