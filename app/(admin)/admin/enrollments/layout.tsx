import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Matricular estudiante" };

export default function EnrollmentsLayout({ children }: { children: ReactNode }) {
  return children;
}
