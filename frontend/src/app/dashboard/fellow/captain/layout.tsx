import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cohort Pulse",
  description: "Read-only cohort health snapshot for cohort captains and assistants.",
};

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return children;
}
