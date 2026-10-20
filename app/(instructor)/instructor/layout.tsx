import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Mi agenda" };

export default function InstructorAgendaLayout({ children }: { children: ReactNode }) {
  return children;
}
