import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kineticAI",
  description: "Static images to production video."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
