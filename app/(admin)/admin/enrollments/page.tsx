"use client";

import { Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort, Course } from "@/types";

import { EnrollmentWizard } from "./wizard/EnrollmentWizard";

export default function EnrollmentsPage() {
  const { data: courses, isLoading: isLoadingCourses, error: coursesError } =
    useFetch<Course[]>("/courses");
  const { data: cohorts, isLoading: isLoadingCohorts, error: cohortsError } =
    useFetch<Cohort[]>("/cohorts");

  const isLoading = isLoadingCourses || isLoadingCohorts;
  const error = coursesError ?? cohortsError;

  return (
    <Card title="Matricular estudiante">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {courses && cohorts ? <EnrollmentWizard courses={courses} cohorts={cohorts} /> : null}
    </Card>
  );
}
