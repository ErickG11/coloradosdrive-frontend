import Link from "next/link";
import type { MouseEvent } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  StatusBadge,
  buttonClassName,
  type DataColumn,
} from "@/components/ui";
import type { AdminStudent, Cohort } from "@/types";
import { StudentAvatar, StudentIcon, studentDisplayName } from "./StudentVisual";
import type { DocumentSummary } from "./useStudentDocuments";
import styles from "./students.module.css";

export function StudentTable({
  students,
  cohorts,
  filterQuery,
  isLoading = false,
  error,
  onRetry,
  filtered = false,
  onClear,
  onOpen,
  documents = {},
}: {
  students: AdminStudent[];
  cohorts: Cohort[];
  filterQuery: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  filtered?: boolean;
  onClear?: () => void;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  documents?: Record<string, DocumentSummary | null>;
}) {
  const href = (student: AdminStudent) => `/admin/students/${student.id}?${filterQuery}`;
  const columns: DataColumn<AdminStudent>[] = [
    {
      key: "student",
      header: "Alumno",
      className: "data-table__identity",
      render: (student) => (
        <div className={styles.studentIdentity}>
          <StudentAvatar student={student} />
          <div>
            <Link
              href={href(student)}
              onClick={(event) => onOpen?.(event, student.id)}
              className={styles.studentLink}
            >
              {studentDisplayName(student.nombreCompleto)}
            </Link>
            <small>{student.cedula}</small>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Teléfono", render: (student) => student.telefono ?? "—" },
    {
      key: "course",
      header: "Curso y cohorte",
      className: "data-table__course",
      render: (student) => {
        const enrollment = student.matchingEnrollments[0];
        if (!enrollment) return <span>Sin matrículas coincidentes</span>;
        const name = cohorts.find((c) => c.id === enrollment.cohortId)?.nombre;
        const label = name
          ? /^cohorte\b/iu.test(name)
            ? name
            : `Cohorte ${name}`
          : "Cohorte no disponible";
        const extra = student.matchingEnrollments.length - 1;
        return (
          <div className={styles.courseBadges}>
            <StatusBadge
              className={styles.courseBadge}
              status={`course_type_${enrollment.courseType}`}
              tone={enrollment.courseType === "A" ? "warning" : "info"}
            >
              <StudentIcon name={enrollment.courseType === "A" ? "motorcycle" : "car"} />
              <span>{`Tipo ${enrollment.courseType} · ${enrollment.courseType === "A" ? "Motocicletas" : "Vehículos livianos"}`}</span>
            </StatusBadge>
            <div>
              <StatusBadge
                status={enrollment.cohortId ? "cohort" : "pendiente_cohorte"}
                tone={enrollment.cohortId ? "neutral" : "warning"}
              >
                {enrollment.cohortId ? label : "Sin cohorte"}
              </StatusBadge>
              {extra > 0 && (
                <span className={styles.extra} aria-label={`${extra} matrículas más`}>
                  +{extra}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "account",
      header: "Estado de la cuenta",
      render: (student) => <StatusBadge status={student.activo ? "activo" : "inactivo"} />,
    },
    {
      key: "documents",
      header: "Documentos",
      render: (student) => {
        const doc = documents[student.id];
        if (doc === undefined) return <span aria-label="Cargando documentos">…</span>;
        if (doc === null) return <span>No disponible</span>;
        if (doc.applicable === 0)
          return (
            <StatusBadge status="no_aplica" tone="neutral">
              {!student.matchingEnrollments.length
                ? "Sin matrícula"
                : doc.registered
                  ? "No aplica"
                  : "Sin documentos"}
            </StatusBadge>
          );
        return (
          <div className={styles.docSummary} data-complete={doc.pending === 0}>
            <span>
              {doc.delivered}/{doc.applicable}
              <span className="sr-only"> documentos entregados</span>
            </span>
            <div
              role="progressbar"
              aria-label={`Documentos de ${student.nombreCompleto}`}
              aria-valuemin={0}
              aria-valuemax={doc.applicable}
              aria-valuenow={doc.delivered}
            >
              <i style={{ transform: `scaleX(${doc.delivered / doc.applicable})` }} />
            </div>
            <small>{doc.pending ? `${doc.pending} pendientes` : "Completos"}</small>
          </div>
        );
      },
    },
    {
      key: "open",
      header: "Acciones",
      className: "data-table__chevron",
      mobileLabel: false,
      render: (student) => (
        <Link
          href={href(student)}
          onClick={(event) => onOpen?.(event, student.id)}
          aria-label={`Ver ficha de ${student.nombreCompleto}`}
          className={styles.iconButton}
        >
          <StudentIcon name="eye" />
        </Link>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={students}
      getRowKey={(student) => student.id}
      caption="Listado de alumnos"
      mobileCards
      isLoading={isLoading}
      loadingLabel="Cargando alumnos…"
      error={error}
      onRetry={onRetry}
      empty={
        filtered ? (
          <EmptyState
            title="No hay resultados"
            description="Prueba con otra búsqueda o elimina alguno de los filtros."
            action={
              <Button variant="secondary" onClick={onClear}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Todavía no hay alumnos"
            description="Matricula al primer estudiante para comenzar a gestionar su curso y su cuenta."
            action={
              <Link href="/admin/enrollments" className={buttonClassName()}>
                Matricular primer estudiante
              </Link>
            }
          />
        )
      }
    />
  );
}
