import type { SVGProps } from "react";
export type DashboardIconName =
  | "students"
  | "enroll"
  | "car"
  | "money"
  | "arrow"
  | "refresh"
  | "calendar"
  | "book"
  | "chevron"
  | "clock"
  | "check";
const paths: Record<DashboardIconName, string> = {
  students:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  enroll: "M14 2H6v20h12V6l-4-4Zm0 0v5h5M9 12h6m-6 4h4",
  car: "m3 12 2-7h14l2 7M3 12h18v7h-3v-2H6v2H3v-7Zm3 2h2m8 0h2",
  money: "M12 2v20m5-16H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  refresh: "M20 7v5h-5M4 17v-5h5m10-5a8 8 0 0 0-14-2m0 14a8 8 0 0 0 14-2",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  book: "M12 5v16m0-16C9 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-2-10 1Z",
  chevron: "m9 5 7 7-7 7",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  check: "m5 12 4 4L19 6",
};
export function DashboardIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: DashboardIconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
