import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Jeûnes",
  description: "Enregistre tes jeûnes et tes sujets de prière",
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6d28d9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} font-sans`}>
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col relative">
          {children}
        </div>
      </body>
    </html>
  );
}
