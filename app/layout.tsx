import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { DiagramProvider } from "@/contexts/diagram-context";

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
    title: "FlowPilot 智能画布",
    description: "将 draw.io 与对话式 AI 助手结合的智能制图工作台。",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <DiagramProvider>{children}</DiagramProvider>

                <Analytics />
            </body>
        </html>
    );
}
