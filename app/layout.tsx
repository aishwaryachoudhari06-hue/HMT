import type { Metadata } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Archivo({ subsets: ["latin"], weight: ["800", "900"], variable: "--display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--body" });

export const metadata: Metadata = { title: "HMT | Help Me Trainer", description: "Help Me Trainer. More like a brother." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>;
}
