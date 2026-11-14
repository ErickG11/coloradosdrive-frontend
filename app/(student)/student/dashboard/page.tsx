import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/student-dashboard/DashboardWorkspace";

export const metadata: Metadata = { title: "Mi panel" };
export default function DashboardPage() {
  return <DashboardWorkspace />;
}
