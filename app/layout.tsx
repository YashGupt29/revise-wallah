import type { Metadata } from "next";
import { Geist, Caveat } from "next/font/google";
import "./globals.css";
import MixpanelProvider from "@/components/MixpanelProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Revise Wallah — AI Revision System for Video Learning",
  description:
    "Turn any YouTube lecture into structured notes, flashcards, and quizzes in under 30 seconds. Built for Indian students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MixpanelProvider />
        {children}
      </body>
    </html>
  );
}
