import type { CourseType } from "@/types/course";
import styles from "./agenda.module.css";

const paths = {
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14v17H5V4Zm3 10h3v3H8v-3Z",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-3a4 4 0 0 1 0 7.8",
  check: "m7 12 3 3 7-7M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  alert: "M12 8v5m0 3h.01M12 3 2 21h20L12 3Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
};
export function InstructorIcon({
  name,
  className,
}: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function StudentAvatar({ name, type }: { name: string | null; type?: CourseType }) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es");
  return (
    <span aria-hidden="true" className={styles.avatar} data-course={type ?? "unknown"}>
      {initials || <InstructorIcon name="calendar" />}
    </span>
  );
}
