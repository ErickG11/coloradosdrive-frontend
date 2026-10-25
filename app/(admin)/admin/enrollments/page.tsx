"use client";

import { PageHeader } from "@/components/ui";
import styles from "./wizard/enrollment.module.css";

import { EnrollmentWizard } from "./wizard/EnrollmentWizard";

export default function EnrollmentsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <PageHeader
          title="Matricular estudiante"
          description="Prepara los datos, el curso y las prácticas antes de confirmar la matrícula."
        />
        <EnrollmentWizard />
      </div>
    </div>
  );
}
