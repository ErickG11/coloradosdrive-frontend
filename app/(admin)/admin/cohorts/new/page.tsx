"use client";

import { Card } from "@/components/ui";

import { CohortCreator } from "../CohortEditor";
import styles from "../cohorts.module.css";

export default function NewCohortPage() {
  return (
    <Card title="Nueva cohorte" titleAs="h1" className={styles.formScope}>
      <CohortCreator />
    </Card>
  );
}
