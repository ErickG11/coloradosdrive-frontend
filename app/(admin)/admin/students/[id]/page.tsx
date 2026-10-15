import { Suspense } from "react";
import { StudentDetail } from "../StudentDetail";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p role="status">Cargando ficha…</p>}>
      <StudentDetail id={id} />
    </Suspense>
  );
}
