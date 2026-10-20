import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Cohortes" };

export default function CohortsLayout({ children }: { children: ReactNode }) {
  return children;
}
