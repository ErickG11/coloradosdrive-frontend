import type { CourseType } from "@/types/course";
import styles from "./agenda.module.css";

export function CourseTypeBadge({ type }: { type?: CourseType }) {
  return (
    <span
      className={`${styles.courseBadge} ${type === "A" ? styles.typeA : type === "B" ? styles.typeB : styles.unknownType}`}
    >
      {type ? `Tipo ${type}` : "Tipo sin información"}
    </span>
  );
}
