import type { IconProps } from "@/components/ui/icons";

export type NavigationSection =
  | "panel"
  | "students"
  | "cohorts"
  | "instructors"
  | "enroll"
  | "exams"
  | "schedule"
  | "history"
  | "menu";
const paths: Record<NavigationSection, string> = {
  panel: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  students:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  cohorts: "m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  instructors:
    "M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14M9 5V3h6v2M9 18h6m-1-7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-6 6a4 4 0 0 1 8 0",
  enroll:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm7 1v6m-3-3h6",
  exams: "M9 3H5v18h14V3h-4M9 2h6v4H9V2Zm-1 9h8m-8 4h5",
  schedule:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h3v3H8v-3Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  history: "M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7m2-4v5l3 2",
};
export function NavigationIcon({ section, className }: IconProps & { section: NavigationSection }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[section]} />
    </svg>
  );
}
