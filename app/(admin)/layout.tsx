import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { ContentFeedback } from "@/components/content-admin/ContentFeedback";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <ContentFeedback>{children}</ContentFeedback>
    </DashboardShell>
  );
}
