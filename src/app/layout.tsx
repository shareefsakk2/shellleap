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
  title: "ShellLeap",
  description: "Advanced SSH & SFTP Client",
};

import { Sidebar } from "@/components/Sidebar";
import { TitleBar } from "@/components/TitleBar";

import { ShellLayout } from "@/components/ShellLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden`}
      >
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
