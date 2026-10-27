"use client";
import { useFetch } from "@/hooks/useFetch";
import type { StudentList } from "@/types";
import { StudentIcon } from "./StudentVisual";
import styles from "./students.module.css";

function Metric({
  label,
  query,
  tone,
  documents = false,
}: {
  label: string;
  query: string;
  tone: string;
  documents?: boolean;
}) {
  const result = useFetch<StudentList>(`/admin/estudiantes?page=1&pageSize=1${query}`);
  return (
    <article className={styles.metric} data-tone={tone}>
      <span className={styles.metricIcon}>
        <StudentIcon name={documents ? "document" : "users"} />
      </span>
      <div>
        <strong
          aria-label={`${label}: ${result.isLoading ? "cargando" : result.error ? "no disponible" : (result.data?.total ?? "no disponible")}`}
        >
          {result.isLoading ? "…" : result.error ? "—" : (result.data?.total ?? "—")}
        </strong>
        <p>{label}</p>
        {result.error && (
          <button
            type="button"
            className={styles.retryMetric}
            aria-label={`Reintentar: ${label}`}
            onClick={result.refetch}
          >
            Reintentar
          </button>
        )}
      </div>
    </article>
  );
}
export function StudentMetrics({ version }: { version: number }) {
  return (
    <section aria-label="Resumen de alumnos" className={styles.metrics} key={version}>
      <Metric label="Total de alumnos" query="" tone="brand" />
      <Metric label="Alumnos activos" query="&activo=true" tone="success" />
      <Metric label="Alumnos inactivos" query="&activo=false" tone="neutral" />
      <Metric
        label="Con documentos pendientes"
        query="&documentosPendientes=true"
        tone="warning"
        documents
      />
    </section>
  );
}
