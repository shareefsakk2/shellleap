import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "ShellLeap",
  description: "Advanced SSH & SFTP Client",
};

const ShellLayout = dynamic(() => import("@/components/ShellLayout").then(mod => mod.ShellLayout), {
  ssr: false,
});

// System font stack that includes Inter if installed, otherwise clean sans-serif
const systemFonts = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden"
        style={{ fontFamily: systemFonts }}
      >
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
