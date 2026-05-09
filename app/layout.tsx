import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Video Agent Runtime",
  description: "Agentic workflow for product video shotlists, Miro review, and video creation."
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
