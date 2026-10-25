import type { InstructorSummary } from "@/types/instructor";
import styles from "./instructors.module.css";

const paths = {
  instructor:
    "M8 3h8v4H8V3ZM5 5H3v17h18V5h-2M9 13a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-2 7a5 5 0 0 1 10 0",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  check: "m5 12 4 4L19 6",
  inactive: "M5 12h14M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  plus: "M12 5v14M5 12h14",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  edit: "m14 4 6 6M3 21l5-1L21 7l-6-6L2 14l1 7Z",
  key: "m14 10 8-8m-4 4 3 3m-6 0 3 3M14 15a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8",
  phone: "m8 3 2 5-3 2c2 4 3 5 7 7l2-3 5 2v4c-9 2-20-9-18-18h5Z",
};
export function InstructorIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function InstructorAvatar({
  instructor,
}: {
  instructor: Pick<InstructorSummary, "nombreCompleto" | "cedula">;
}) {
  const initials =
    instructor.nombreCompleto
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toLocaleUpperCase("es") || "IN";
  const hash = Array.from(instructor.cedula).reduce(
    (v, c) => (Math.imul(v, 31) + c.charCodeAt(0)) >>> 0,
    0,
  );
  return (
    <span className={`${styles.avatar} student-avatar--${hash % 6}`} aria-hidden="true">
      {initials}
    </span>
  );
}
