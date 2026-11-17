import type { ReactNode } from "react";

import { studentAccountAccess } from "@/components/student-enrollment/serverAccess";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const account = await studentAccountAccess();
  return (
    <DashboardShell studentEnrollmentRestricted={account.inscripcionIncompleta}>
      {children}
    </DashboardShell>
  );
}
