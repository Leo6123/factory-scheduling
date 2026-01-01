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
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

