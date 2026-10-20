import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Horarios de práctica" };

export default function StudentScheduleLayout({ children }: { children: ReactNode }) {
  return children;
}
