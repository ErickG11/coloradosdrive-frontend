import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Examen" };

export default function TakeExamLayout({ children }: { children: ReactNode }) {
  return children;
}
