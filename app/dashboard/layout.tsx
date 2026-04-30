import type { ReactNode } from "react";
import { Syne, DM_Sans } from "next/font/google";
import "./dashboard.css";
import { Sidebar } from "./_components/Sidebar";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "0x01 — Agent Dashboard",
  description: "Manage your 0x01 agent: token, earnings, reputation, activity.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`d-root ${syne.variable} ${dmSans.variable}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Sidebar />
      <div className="d-main">{children}</div>
    </div>
  );
}
