"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui";

import { CohortEditor } from "../../CohortEditor";

function EditCohortContents() {
  const search = useSearchParams();
  const params = useParams<{ id: string }>();
  return (
    <Card title="Editar cohorte" titleAs="h1">
      <CohortEditor
        id={params.id}
        initialSection={search.get("seccion") === "fechas" ? "dates" : "general"}
      />
    </Card>
  );
}

export default function EditCohortPage() {
  return (
    <Suspense fallback={<p>Cargando cohorte…</p>}>
      <EditCohortContents />
    </Suspense>
  );
}
