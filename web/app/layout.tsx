import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Food Trading",
  description: "Full SaaS CRM for food ingredients trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
