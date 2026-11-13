import Link from "next/link";
import type { MouseEvent } from "react";
import { Button, DataTable, EmptyState, StatusBadge, type DataColumn } from "@/components/ui";
import { buttonClassName } from "@/components/ui/buttonStyles";
import type { AdminStudent, Cohort } from "@/types";
import { ActiveBadge, StudentBadge } from "./StudentBadge";
import { StudentAvatar, StudentIcon } from "./StudentVisual";
import type { StudentView } from "./StudentDrawer";
import styles from "./students.module.css";

export function StudentTable({
  students,
  cohorts,
  filterQuery,
  waiting = false,
  isLoading = false,
  error,
  onRetry,
  filtered = false,
  onClear,
  onOpen,
  compact = false,
}: {
  compact?: boolean;
  students: AdminStudent[];
  cohorts: Cohort[];
  filterQuery: string;
  waiting?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  filtered?: boolean;
  onClear?: () => void;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>, id: string, view?: StudentView) => void;
}) {
  const href = (student: AdminStudent, view: StudentView = "ficha") => {
    const query = new URLSearchParams(filterQuery);
    query.set("vista", view);
    return `/admin/students/${student.id}?${query}`;
  };
  // Como en el diseño: «Cohorte X» salvo que el nombre ya lo diga.
  function cohortLabel(cohortId: string) {
    const name = cohorts.find((cohort) => cohort.id === cohortId)?.nombre;
    if (!name) return "Cohorte no disponible";
    return /^cohorte\b/iu.test(name) ? name : `Cohorte ${name}`;
  }
  const columns: DataColumn<AdminStudent>[] = [
    ...(students.some((s) => s.paymentStatus !== undefined)
      ? [
          {
            key: "payment",
            header: "Pago",
            render: (student: AdminStudent) =>
              ({
                pagado: "Pagado",
                pendiente: "Pendiente",
                revision: "En revisión",
                sin_pago: "Sin pago",
              })[student.paymentStatus ?? ""] ?? "Sin permiso financiero",
          },
        ]
      : []),
    {
      key: "name",
      header: "Nombre",
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
              {student.nombreCompleto}
            </Link>
            {waiting ? (
              <div>
                <StatusBadge status="esperando_curso" tone="info">
                  Esperando curso
                </StatusBadge>
              </div>
            ) : null}
          </div>
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
      header: "Estado de la cuenta",
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
          <ul className="flex flex-col gap-3">
            {student.matchingEnrollments.map((enrollment) => (
              <li key={enrollment.id} className={styles.courseBadges}>
                <StatusBadge
                  className={styles.courseBadge}
                  status={`course_type_${enrollment.courseType}`}
                  tone={enrollment.courseType === "A" ? "warning" : "info"}
                >
                  <StudentIcon name={enrollment.courseType === "A" ? "motorcycle" : "car"} />
                  <span>Tipo {enrollment.courseType}</span>
                  <span>
                    {" · "}
                    {enrollment.courseType === "A" ? "Motocicletas" : "Vehículos livianos"}
                  </span>
                </StatusBadge>
                <div>
                  <StatusBadge
                    status={enrollment.cohortId ? "cohort" : "pendiente_cohorte"}
                    tone={enrollment.cohortId ? "neutral" : "warning"}
                  >
                    {enrollment.cohortId ? cohortLabel(enrollment.cohortId) : "Sin cohorte"}
                  </StatusBadge>
                  {enrollment.etapa && enrollment.etapa !== "activa" ? (
                    <StatusBadge
                      status={enrollment.etapa}
                      tone="warning"
                      label={enrollment.etapa === "por_agendar" ? "Por agendar" : "Reservado"}
                    />
                  ) : (
                    <StudentBadge status={enrollment.status} />
                  )}
                </div>
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
      header: "Acciones",
      className: "data-table__actions",
      render: (student) => (
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["ficha", "Ficha", "eye"],
              ["matriculas", "Matrículas", "enrollments"],
              ["documentos", "Documentos", "document"],
              ["editar", "Editar", "edit"],
            ] as const
          ).map(([view, label, icon]) => (
            <Link
              key={view}
              href={href(student, view)}
              onClick={(event) => onOpen?.(event, student.id, view)}
              aria-label={`${label} de ${student.nombreCompleto}`}
              title={label}
              className={styles.iconButton}
            >
              <StudentIcon name={icon} />
            </Link>
          ))}
        </div>
      ),
    },
  ];
  return (
    <DataTable
      columns={
        compact
          ? columns.filter((column) => !["cedula", "phone", "requirements"].includes(column.key))
          : columns
      }
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
