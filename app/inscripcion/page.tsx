import type { Metadata } from "next";

import { InscripcionWizard } from "@/components/inscripcion/InscripcionWizard";

export const metadata: Metadata = {
  title: "Solicitar inscripción",
  robots: { index: false, follow: false },
};

export default async function InscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const params = await searchParams;
  return (
    <InscripcionWizard
      initialCourseId={typeof params.courseId === "string" ? params.courseId : ""}
    />
  );
}
