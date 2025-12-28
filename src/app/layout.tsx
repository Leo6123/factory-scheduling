import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "工廠排程系統 APS",
  description: "生產排程視覺化管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}

