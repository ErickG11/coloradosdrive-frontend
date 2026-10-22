import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Horarios de práctica" };

export default function PracticeSlotsLayout({ children }: { children: ReactNode }) {
  return children;
}
