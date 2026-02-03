import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShellLeap",
  description: "Advanced SSH & SFTP Client",
};

const ShellLayout = dynamic(() => import("@/components/ShellLayout").then(mod => mod.ShellLayout), {
  ssr: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased flex flex-col h-screen bg-black text-[#EDEDED] overflow-hidden`}
      >
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
