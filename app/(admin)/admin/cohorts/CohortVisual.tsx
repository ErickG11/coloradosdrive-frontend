import type { Course } from "@/types";
import styles from "./cohorts.module.css";
const paths = {
  car: "m3 12 2-7h14l2 7M3 12h18v7h-3v-2H6v2H3v-7Zm3 2h2m8 0h2",
  motorcycle:
    "M7 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm16 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 17l6-9 4 9H3m6-9h7l3 9m-7-13h4l1 4M6 8h4",
  layers: "m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  document: "M14 2H6v20h12V6l-4-4Zm0 0v5h5M9 12h6m-6 4h4",
  back: "M20 12H4m6-6-6 6 6 6",
  close: "m6 6 12 12M6 18 18 6",
  money: "M12 2v20m5-16H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6",
  refresh: "M20 7v5h-5M4 17v-5h5m10-5a8 8 0 0 0-14-2m0 14a8 8 0 0 0 14-2",
  students:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  graduation: "m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7m4-2v9",
};
export function CohortIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-2 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function CourseIdentity({ course }: { course?: Course }) {
  if (!course) return <span className={styles.muted}>Curso no disponible</span>;
  return (
    <div className={styles.courseIdentity} title={`${course.nombre} (Tipo ${course.tipo})`}>
      <span className={styles.courseIcon} data-course-type={course.tipo}>
        <CohortIcon name={course.tipo === "A" ? "motorcycle" : "car"} />
      </span>
      <div>
        <strong>
          <span className="sr-only">{course.nombre}</span>
          <span aria-hidden="true">{course.nombre.split(" (")[0]}</span>
        </strong>
        <small>(Tipo {course.tipo})</small>
      </div>
    </div>
  );
}
