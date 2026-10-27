import type { AdminStudent } from "@/types";
import styles from "./students.module.css";

const paths = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  document: "M14 2H6v20h12V6l-4-4Zm0 0v5h5M9 12h6m-6 4h4",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  edit: "m14 4 6 6M3 21l5-1L21 7l-6-6L2 14l1 7Z",
  back: "m15 6-6 6 6 6",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  car: "m3 12 2-7h14l2 7M3 12h18v7h-3v-2H6v2H3v-7Zm3 2h2m8 0h2",
  motorcycle:
    "M7 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm16 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 17l6-9 4 9H3m6-9h7l3 9m-7-13h4l1 4",
};
export function StudentIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="-2 0 28 24"
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
export function studentDisplayName(name: string) {
  return (
    name
      .trim()
      .toLocaleLowerCase("es")
      .replace(/(^|\s)\S/gu, (v) => v.toLocaleUpperCase("es")) || "Nombre no informado"
  );
}
export function StudentAvatar({
  student,
}: {
  student: Pick<AdminStudent, "cedula" | "nombreCompleto">;
}) {
  const hash = Array.from(student.cedula).reduce(
    (v, c) => (Math.imul(v, 31) + c.charCodeAt(0)) >>> 0,
    0,
  );
  const initials =
    student.nombreCompleto
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((p) => p[0] ?? "")
      .join("")
      .toLocaleUpperCase("es") || "AL";
  return (
    <span aria-hidden="true" className={`${styles.avatar} student-avatar--${hash % 6}`}>
      {initials}
    </span>
  );
}
