"use client";

import { Card, FormError } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Course } from "@/types";

import { ExamForm } from "../ExamForm";

export default function NewExamPage() {
  const { data: courses, isLoading, error } = useFetch<Course[]>("/courses");

  return (
    <Card title="Nuevo examen" titleAs="h1">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando cursos…</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      {courses ? <ExamForm courses={courses} /> : null}
    </Card>
  );
}
