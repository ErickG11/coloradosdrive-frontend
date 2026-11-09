import type { Metadata } from "next";
import { ContentWorkspace } from "@/components/content-admin/ContentWorkspace";
export const metadata: Metadata = { title: "Contenido" };
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; exam?: string }>;
}) {
  const params = await searchParams;
  const exam = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(params.exam ?? "")
    ? params.exam
    : "";
  const view = params.view === "resultados" || params.view === "progreso" ? params.view : "temario";
  return <ContentWorkspace initialExam={exam} initialView={view} />;
}
