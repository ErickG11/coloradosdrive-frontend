import type { Metadata } from "next";
import { RecentPracticeAbsences } from "@/components/admin-dashboard/RecentPracticeAbsences";

import { AdminDashboard } from "@/components/admin-dashboard/AdminDashboard";
import { ReportExport } from "@/components/reports/ReportExport";

export const metadata: Metadata = { title: "Panel de administrador" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const month =
    typeof params.month === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) &&
    params.month >= "2000-01" &&
    params.month <= today.slice(0, 7)
      ? params.month
      : today.slice(0, 7);
  const validDay =
    typeof params.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.day) &&
    params.day.startsWith(`${month}-`) &&
    !Number.isNaN(Date.parse(`${params.day}T12:00:00Z`)) &&
    new Date(`${params.day}T12:00:00Z`).toISOString().slice(0, 10) === params.day;
  const day =
    validDay && params.day ? params.day : month === today.slice(0, 7) ? today : `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDayOfMonth = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
  return (
    <>
      <AdminDashboard month={month} day={day} today={today} />
      {/* RF-08: exporta los reportes del mes que se está viendo; el periodo se puede cambiar. */}
      <ReportExport
        key={month}
        className="mt-6"
        today={today}
        defaultDesde={`${month}-01`}
        defaultHasta={month === today.slice(0, 7) ? today : lastDayOfMonth}
      />
      <RecentPracticeAbsences />
    </>
  );
}
