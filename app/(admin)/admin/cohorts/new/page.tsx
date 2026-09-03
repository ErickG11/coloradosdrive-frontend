"use client";

import { Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Course } from "@/types";

import { CohortForm } from "../CohortForm";

export default function NewCohortPage() {
  const { data: courses, isLoading, error } = useFetch<Course[]>("/courses");

  return (
    <Card title="Nueva cohorte">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando cursos…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {courses ? <CohortForm courses={courses} /> : null}
    </Card>
  );
}
