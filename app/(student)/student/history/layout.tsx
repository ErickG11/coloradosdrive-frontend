import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Historial de prácticas" };
export default function HistoryLayout({ children }: { children: ReactNode }) {
  return children;
}
