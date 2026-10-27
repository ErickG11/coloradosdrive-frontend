"use client";

import { useParams } from "next/navigation";

import { Card } from "@/components/ui";

import { CohortEditor } from "../../CohortEditor";

export default function EditCohortPage() {
  const params = useParams<{ id: string }>();
  return (
    <Card title="Editar cohorte" titleAs="h1">
      <CohortEditor id={params.id} />
    </Card>
  );
}
