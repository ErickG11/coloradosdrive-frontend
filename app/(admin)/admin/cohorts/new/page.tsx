"use client";

import { CohortFormShell } from "../CohortVisual";
import { useFetch } from "@/hooks/useFetch";
import type { Course } from "@/types";

import { CohortForm } from "../CohortForm";

export default function NewCohortPage() {
  const { data: courses, isLoading, error } = useFetch<Course[]>("/courses");

  return (
    <CohortFormShell>
      {isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Cargando cursos…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-accent-red">
          {error}
        </p>
      ) : null}
      {courses ? <CohortForm courses={courses} /> : null}
    </CohortFormShell>
  );
}
