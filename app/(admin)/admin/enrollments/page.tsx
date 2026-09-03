"use client";

import { Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort } from "@/types";

import { EnrollmentForm } from "./EnrollmentForm";

export default function EnrollmentsPage() {
  const { data: cohorts, isLoading, error } = useFetch<Cohort[]>("/cohorts");

  return (
    <Card title="Matricular estudiante">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando cohortes…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {cohorts ? <EnrollmentForm cohorts={cohorts} /> : null}
    </Card>
  );
}
