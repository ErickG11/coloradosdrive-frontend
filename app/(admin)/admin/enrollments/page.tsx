"use client";

import { Card } from "@/components/ui";

import { EnrollmentWizard } from "./wizard/EnrollmentWizard";

export default function EnrollmentsPage() {
  return (
    <Card title="Matricular estudiante">
      <EnrollmentWizard />
    </Card>
  );
}
