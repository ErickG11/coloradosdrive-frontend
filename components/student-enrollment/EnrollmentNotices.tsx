import type { StudentEnrollmentState } from "@/types/studentEnrollment";
import { EnrollmentIcon } from "./EnrollmentVisual";
import styles from "./enrollment-overview.module.css";
const date = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const formatter = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Guayaquil",
});
function label(value: string | null | undefined) {
  const parsed = date(value);
  return parsed ? formatter.format(parsed) : "No disponible";
}
function range(start: string, end: string | null | undefined) {
  const first = date(start),
    last = date(end);
  return first && last && first <= last
    ? formatter.formatRange(first, last)
    : `${label(start)} – ${label(end)}`;
}
export function EnrollmentNotices({ state }: { state: StudentEnrollmentState }) {
  const dates = state.individualDates;
  const documents = Boolean(
    state.fechaLimite && state.documentosFisicos.some((d) => d.estado === "pendiente"),
  );
  if (!dates?.practiceStartDate && !documents) return null;
  return (
    <div className={styles.notices} aria-label="Avisos de tu inscripción">
      {dates?.practiceStartDate ? (
        <p className={styles.noticeChip}>
          <EnrollmentIcon kind="calendar" />
          <span>
            Prácticas: {range(dates.practiceStartDate, dates.practiceEndDate)}. Acceso hasta{" "}
            {label(dates.accessEndDate)}.
          </span>
        </p>
      ) : null}
      {documents ? (
        <p className={styles.noticeChip}>
          <EnrollmentIcon kind="document" />
          <span>
            Te quedan {Math.max(0, state.diasRestantes ?? 0)} días para llevar tus documentos.
          </span>
        </p>
      ) : null}
    </div>
  );
}
