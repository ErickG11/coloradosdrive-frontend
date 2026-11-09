"use client";
import { Button } from "@/components/ui/Button";
import { LearningProgress } from "@/components/learning/LearningProgress";
import { LearningIcon } from "./CourseVisuals";
import styles from "./student-learning.module.css";

export function StudentProgress(props: { value: number; complete: boolean; label: string }) {
  return <LearningProgress {...props} />;
}
export function StudentLoading() {
  return (
    <div role="status" aria-label="Cargando contenido" className={styles.course} aria-busy="true">
      <span className="sr-only">Cargando contenido…</span>
      <div className={styles.skeletonHero} aria-hidden="true">
        <div className={`${styles.skeletonLine} w-1/3 !h-8`} />
        <div className={`${styles.skeletonLine} w-1/2`} />
        <div className={`${styles.skeletonLine} !mt-24 !h-6`} />
      </div>
      <div className={styles.learningLayout} aria-hidden="true">
        <div className={styles.skeletonContent}>
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className={`${styles.skeletonLine} !h-14 !mb-5`} />
          ))}
        </div>
        <div className={styles.skeletonContent}>
          <div className={`${styles.skeletonLine} w-3/4 !h-8`} />
          <div className={`${styles.skeletonLine} !h-24 !mt-10`} />
          <div className={`${styles.skeletonLine} !h-24`} />
        </div>
      </div>
    </div>
  );
}
export function StudentError({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div role="alert" className={styles.error}>
      <LearningIcon name="senal" />
      <div>
        <p>{error}</p>
        {retry ? (
          <Button variant="secondary" className="mt-3" onClick={retry}>
            Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
