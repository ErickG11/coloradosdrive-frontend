import { Suspense } from "react";
import { StudentsList } from "../page";

export default function StudentPage() {
  return (
    <Suspense fallback={<p role="status">Cargando ficha…</p>}>
      <StudentsList />
    </Suspense>
  );
}
