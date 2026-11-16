import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "Asistencias" };
export default function AttendanceLayout({ children }: { children: ReactNode }) {
  return children;
}
