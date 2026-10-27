import type { ReactNode, SVGProps } from "react";

type LoginIconName =
  "user" | "lock" | "eye" | "eyeOff" | "arrow" | "back" | "shield" | "people" | "road";

const paths: Record<LoginIconName, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M4.5 21v-3a7.5 7.5 0 0 1 15 0v3H4.5Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 5.1c.5-.1.9-.1 1.4-.1 6.5 0 10 7 10 7a18 18 0 0 1-3.1 3.9M6.5 6.5A20 20 0 0 0 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.4M10 10a3 3 0 0 0 4 4" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  people: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-3a6 6 0 0 1 12 0v3M4 4a3 3 0 0 0 0 6m16-6a3 3 0 0 1 0 6M2 20v-3c0-2 1-4 3-5m17 8v-3c0-2-1-4-3-5" />
    </>
  ),
  road: (
    <>
      <path d="m8 3-5 18h18L16 3M12 3v3m0 4v3m0 4v4" />
    </>
  ),
};

export function LoginIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: LoginIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
