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
import { ActiveBadge, StudentBadge } from "./StudentBadge";
import { StudentAvatar, StudentIcon } from "./StudentVisual";
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
}) {
  const href = (student: AdminStudent) => `/admin/students/${student.id}?${filterQuery}`;
  const columns: DataColumn<AdminStudent>[] = [
    {
      key: "name",
      header: "Nombre",
      className: "data-table__identity",
      render: (student) => (
        <div className={styles.studentIdentity}>
          <StudentAvatar student={student} />
          <Link
            href={href(student)}
            onClick={(event) => onOpen?.(event, student.id)}
            className={styles.studentLink}
          >
            {student.nombreCompleto}
          </Link>
        </div>
      ),
    },
    { key: "cedula", header: "Cédula", render: (student) => student.cedula },
    {
      key: "phone",
      header: "Teléfono",
      className: "whitespace-nowrap",
      render: (student) => student.telefono ?? "—",
    },
    {
      key: "account",
      header: "Estado",
      render: (student) => <ActiveBadge active={student.activo} />,
    },
    {
      key: "enrollments",
      header: "Matrículas coincidentes",
      className: "data-table__course",
      render: (student) =>
        student.matchingEnrollments.length === 0 ? (
          <span>Sin matrículas coincidentes</span>
        ) : (
          <ul className="flex flex-col gap-2">
            {student.matchingEnrollments.map((enrollment) => (
              <li key={enrollment.id} className={styles.courseBadges}>
                <StatusBadge
                  className={styles.courseBadge}
                  status={`course_type_${enrollment.courseType}`}
                  tone={enrollment.courseType === "A" ? "warning" : "info"}
                >
                  <StudentIcon name={enrollment.courseType === "A" ? "motorcycle" : "car"} />
                  <span>Tipo {enrollment.courseType}</span>
                </StatusBadge>
                <StudentBadge status={enrollment.status} />
                <StatusBadge
                  status={enrollment.cohortId ? "cohort" : "pendiente_cohorte"}
                  tone={enrollment.cohortId ? "neutral" : "warning"}
                >
                  {enrollment.cohortId
                    ? (cohorts.find((cohort) => cohort.id === enrollment.cohortId)?.nombre ??
                      "Cohorte no disponible")
                    : "Sin cohorte"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: "requirements",
      header: "Requisitos",
      render: (student) =>
        student.requirements ? (
          <details>
            <summary className="cursor-pointer">
              {student.requirements.pending.length > 0
                ? student.requirements.pending.length + " pendientes"
                : student.requirements.unavailable.length === 0
                  ? "Completo"
                  : "Sin pendientes verificables"}
              {student.requirements.unavailable.length > 0 && (
                <span className="block">
                  {student.requirements.unavailable.length} sin verificar
                </span>
              )}
            </summary>
            <ul className="mt-2 space-y-1">
              {student.requirements.pending.map((item) => (
                <li key={item}>{item}: pendiente</li>
              ))}
              {student.requirements.unavailable.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ) : (
          "No disponible"
        ),
    },
    {
      key: "open",
      header: "Ficha",
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
      caption="Alumnos y matrículas coincidentes"
      mobileCards
      isLoading={isLoading}
      loadingLabel="Cargando alumnos…"
      error={error}
      onRetry={onRetry}
      empty={
        filtered ? (
          <EmptyState
            title="No hay alumnos con esos filtros"
            description="Prueba con otra búsqueda o elimina alguno de los filtros."
            action={
              <Button variant="secondary" onClick={onClear}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No hay alumnos con esos filtros"
            description="Matricula a un estudiante para comenzar a gestionar su curso y su cuenta."
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
