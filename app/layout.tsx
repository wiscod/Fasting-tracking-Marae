import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jeûnes",
  description: "Enregistre tes jeûnes et tes sujets de prière",
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
    <html lang="fr">
      <body>
        <div className="mx-auto flex min-h-screen max-w-md flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
