import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Exámenes" };

export default function StudentExamsLayout({ children }: { children: ReactNode }) {
  return children;
}
