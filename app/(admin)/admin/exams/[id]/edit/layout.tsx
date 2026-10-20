import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Editar examen" };

export default function EditExamLayout({ children }: { children: ReactNode }) {
  return children;
}
