import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PracticeBlockProvider } from "@/components/practice-blocks/PracticeBlockProvider";

export const metadata: Metadata = { title: "Mis prácticas" };

export default function StudentScheduleLayout({ children }: { children: ReactNode }) {
  return <PracticeBlockProvider enabled>{children}</PracticeBlockProvider>;
}
