import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentsList } from "../StudentsWorkspace";

export const metadata: Metadata = { title: "Ficha del alumno" };

// La ficha se muestra en el panel lateral del listado de alumnos.
export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p role="status">Cargando ficha…</p>}>
      <StudentsList key={id} initialSelected={id} />
    </Suspense>
  );
}
