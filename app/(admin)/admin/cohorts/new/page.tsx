"use client";

import { Card } from "@/components/ui";

import { CohortCreator } from "../CohortEditor";

export default function NewCohortPage() {
  return (
    <Card title="Nueva cohorte" titleAs="h1">
      <CohortCreator />
    </Card>
  );
}
