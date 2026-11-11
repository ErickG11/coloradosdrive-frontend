import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Mis prácticas" };

export default function StudentScheduleLayout({ children }: { children: ReactNode }) {
  return children;
}
