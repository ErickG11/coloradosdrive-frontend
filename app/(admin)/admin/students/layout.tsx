import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Alumnos" };

export default function StudentsLayout({ children }: { children: ReactNode }) {
  return children;
}
