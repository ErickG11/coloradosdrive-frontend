import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Nueva cohorte" };

export default function NewCohortLayout({ children }: { children: ReactNode }) {
  return children;
}
