import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./enrollment-visual.module.css";

const paths = {
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
