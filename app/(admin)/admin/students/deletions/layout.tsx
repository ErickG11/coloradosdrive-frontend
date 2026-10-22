import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Eliminaciones pendientes" };

export default function StudentDeletionsLayout({ children }: { children: ReactNode }) {
  return children;
}
