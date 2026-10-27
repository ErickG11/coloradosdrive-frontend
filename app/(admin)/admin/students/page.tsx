"use client";
import { Suspense } from "react";
import { StudentsList } from "./StudentsWorkspace";

export default function StudentsPage() {
  return (
    <Suspense fallback={<p role="status">Cargando alumnos…</p>}>
      <StudentsList />
    </Suspense>
  );
}
