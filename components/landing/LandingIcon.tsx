import type { ReactNode, SVGProps } from "react";

type IconName =
  | "arrow"
  | "check"
  | "shield"
  | "instructor"
  | "car"
  | "whatsapp"
  | "pin"
  | "menu"
  | "close"
  | "book"
  | "calendar"
  | "certificate";

const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  instructor: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4h5v10h-3M6 21v-4m6 4v-4" />
    </>
  ),
  car: (
    <>
      <path d="m5 7 2-4h10l2 4 2 3v8H3v-8l2-3Zm0 0h14M3 12h18M6 18v3m12-3v3M6 15h2m8 0h2" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20l1.2-4.6a8.5 8.5 0 1 1 16.3-3.9Z" />
      <path d="m8 7 2 3-1 1c.8 1.6 2 2.7 3.7 3.5l1.2-1.2 3 1.8c-.8 2.4-3 2.3-5.8.8S6.6 11.7 7 9l1-2Z" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  book: <path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5" />
    </>
  ),
  certificate: (
    <>
      <path d="M14 20H4V3h16v10M8 7h8M8 11h5" />
      <circle cx="17" cy="16" r="3" />
      <path d="m15 18-1 4 3-1 3 1-1-4" />
    </>
  ),
};

export function LandingIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
