import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TS QUẢN LÝ",
  description: "Phần mềm quản lý hụi — TS QUẢN LÝ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-dvh min-h-full flex-col"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
