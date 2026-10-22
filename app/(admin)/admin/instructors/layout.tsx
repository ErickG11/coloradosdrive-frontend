import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Instructores" };

export default function InstructorsLayout({ children }: { children: ReactNode }) {
  return children;
}
