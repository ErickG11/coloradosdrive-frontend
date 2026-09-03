"use client";

import { Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Cohort } from "@/types";

import { EnrollmentForm } from "./EnrollmentForm";

export default function EnrollmentsPage() {
  const { data: cohorts, isLoading, error } = useFetch<Cohort[]>("/cohorts");

  return (
    <Card title="Matricular estudiante">
      {isLoading ? <p className="text-sm text-zinc-600">Cargando cohortes…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {cohorts ? <EnrollmentForm cohorts={cohorts} /> : null}
    </Card>
  );
}
