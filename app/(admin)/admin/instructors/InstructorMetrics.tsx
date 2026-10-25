"use client";
import { useFetch } from "@/hooks/useFetch";
import type { InstructorList } from "@/types";
import { InstructorIcon } from "./InstructorVisual";
import styles from "./instructors.module.css";

function Metric({
  label,
  query,
  tone,
}: {
  label: string;
  query: string;
  tone: "brand" | "success" | "neutral";
}) {
  const result = useFetch<InstructorList>(`/admin/instructores?page=1&pageSize=1${query}`);
  return (
    <article className={styles.metric} data-tone={tone}>
      <span className={styles.metricIcon}>
        <InstructorIcon
          name={tone === "brand" ? "instructor" : tone === "success" ? "check" : "inactive"}
        />
      </span>
      <div>
        <p>{label}</p>
        <strong
          aria-live="polite"
          aria-label={`${label}: ${result.isLoading ? "cargando" : result.error ? "no disponible" : (result.data?.total ?? "no disponible")}`}
        >
          {result.isLoading
            ? "…"
            : result.error || !result.data
              ? "—"
              : new Intl.NumberFormat("es-EC").format(result.data.total)}
        </strong>
      </div>
      {result.error && (
        <button className={styles.retry} onClick={result.refetch}>
          Reintentar
        </button>
      )}
    </article>
  );
}
export function InstructorMetrics({ version }: { version: number }) {
  return (
    <section key={version} className={styles.metrics} aria-label="Resumen de instructores">
      <Metric label="Total de instructores" query="" tone="brand" />
      <Metric label="Instructores activos" query="&activo=true" tone="success" />
      <Metric label="Instructores inactivos" query="&activo=false" tone="neutral" />
    </section>
  );
}
