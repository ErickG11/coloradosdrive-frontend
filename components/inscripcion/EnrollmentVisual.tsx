import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./enrollment-visual.module.css";

const paths = {
  mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8",
  key: "M14 8a5 5 0 1 1-4-5M10 12l-7 9m3-4 3 3",
  shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-5 10 3 3 7-7",
  study: "m2 8 10-5 10 5-10 5L2 8Zm4 3v6c4 3 8 3 12 0v-6",
  car: "m3 12 2-7h14l2 7H3Zm0 0v7h3v-2h12v2h3v-7M6 14h2m8 0h2",
  moto: "M8 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm16 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 17l6-10 5 10H4m6-10h8l2 10m-7-14h4l1 4",

  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  document: "M14 2H6v20h12V6l-4-4Zm0 0v5h5M9 12h6m-6 4h4",
  clock: "M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  check: "m5 12 4 4L19 6",
};
export function EnrollmentBrand() {
  return (
    <Image
      unoptimized
      src="/images/landing/logo.webp"
      width={512}
      height={256}
      alt="Colorados Drive"
      className={styles.brand}
    />
  );
}
export function EnrollmentIcon({ name }: { name: keyof typeof paths }) {
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
export function EnrollmentAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toLocaleUpperCase("es");
  return (
    <span aria-hidden="true" className={styles.avatar} data-large={large}>
      {initials}
    </span>
  );
}
export function EnrollmentMetric({
  label,
  value,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  icon: keyof typeof paths;
  tone?: "brand" | "success" | "warning" | "neutral";
}) {
  return (
    <article className={styles.metric} data-tone={tone}>
      <span className={styles.metricIcon}>
        <EnrollmentIcon name={icon} />
      </span>
      <div>
        <strong data-label={typeof value === "string" && value.length > 3}>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}
