"use client";
import Link from "next/link";
import { usePracticeAbsences } from "@/hooks/usePracticeAbsences";
import type { MouseEvent } from "react";
import { Button, DataTable, EmptyState, StatusBadge, type DataColumn } from "@/components/ui";
import { buttonClassName } from "@/components/ui/buttonStyles";
import type { AdminStudent, Cohort } from "@/types";
import { ActiveBadge, StudentBadge } from "./StudentBadge";
import { StudentAvatar, StudentIcon } from "./StudentVisual";
import { StudentRowMenu } from "./StudentRowMenu";
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
  selectedId = null,
}: {
  compact?: boolean;
  selectedId?: string | null;
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
  const absences = usePracticeAbsences();
  const absenceCounts = new Map(
    absences.data?.map((student) => [student.studentId, student.count]) ?? [],
  );
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
  const paymentLabel = (student: AdminStudent) =>
    student.paymentStatus === undefined
      ? null
      : ({
          pagado: "Pagado",
          pendiente: "Pendiente",
          revision: "En revisión",
          sin_pago: "Sin pago",
        }[student.paymentStatus] ?? null);
  const courseName = (type: "A" | "B") => (type === "A" ? "Motocicletas" : "Vehículos livianos");
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
            {(absenceCounts.get(student.id) ?? 0) > 0 ? (
              <span className="mt-1 inline-flex rounded-full bg-bg-sunken px-2 py-0.5 text-xs font-semibold text-accent-red">
                Faltas: {absenceCounts.get(student.id)}
              </span>
            ) : null}
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
      render: (student) => <ActiveBadge active={student.activo} className={styles.chip} />,
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
                  className={`${styles.courseBadge} ${styles.chip}`}
                  status={`course_type_${enrollment.courseType}`}
                  tone={enrollment.courseType === "A" ? "warning" : "info"}
                >
                  <StudentIcon name={enrollment.courseType === "A" ? "motorcycle" : "car"} />
                  <span
                    className={styles.chipText}
                    title={`Tipo ${enrollment.courseType} · ${courseName(enrollment.courseType)}`}
                  >
                    Tipo {enrollment.courseType} · {courseName(enrollment.courseType)}
                  </span>
                </StatusBadge>
                <div>
                  <StatusBadge
                    className={styles.chip}
                    status={enrollment.cohortId ? "cohort" : "pendiente_cohorte"}
                    tone={enrollment.cohortId ? "neutral" : "warning"}
                  >
                    <span
                      className={styles.chipText}
                      title={enrollment.cohortId ? cohortLabel(enrollment.cohortId) : undefined}
                    >
                      {enrollment.cohortId ? cohortLabel(enrollment.cohortId) : "Sin cohorte"}
                    </span>
                  </StatusBadge>
                  {enrollment.etapa && enrollment.etapa !== "activa" ? (
                    <StatusBadge
                      className={styles.chip}
                      status={enrollment.etapa}
                      tone="warning"
                      label={enrollment.etapa === "por_agendar" ? "Por agendar" : "Reservado"}
                    />
                  ) : (
                    <StudentBadge status={enrollment.status} className={styles.chip} />
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
  if (compact && !isLoading && !error && students.length > 0)
    return (
      <ul className={styles.compactList} aria-label="Alumnos y matrículas coincidentes">
        {students.map((student) => {
          const pay = paymentLabel(student);
          return (
            <li
              key={student.id}
              className={styles.compactRow}
              data-selected={student.id === selectedId || undefined}
            >
              <div className={styles.compactMain}>
                <div className={styles.compactTop}>
                  <StudentAvatar student={student} />
                  <Link
                    href={href(student)}
                    onClick={(event) => onOpen?.(event, student.id)}
                    className={styles.compactName}
                    title={student.nombreCompleto}
                  >
                    {student.nombreCompleto}
                  </Link>
                  <span className={styles.compactChips}>
                    <ActiveBadge active={student.activo} className={styles.chip} />
                    {pay ? (
                      <StatusBadge
                        className={styles.chip}
                        status={`pago_${student.paymentStatus}`}
                        tone={
                          student.paymentStatus === "pagado"
                            ? "success"
                            : student.paymentStatus === "sin_pago"
                              ? "neutral"
                              : "warning"
                        }
                        label={pay}
                      />
                    ) : null}
                    {(absenceCounts.get(student.id) ?? 0) > 0 ? (
                      <span className={`${styles.chip} ${styles.absenceChip}`}>
                        Faltas: {absenceCounts.get(student.id)}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className={styles.compactEnrollments}>
                  {student.matchingEnrollments.length === 0 ? (
                    <span className={styles.compactMuted}>Sin matrículas coincidentes</span>
                  ) : (
                    student.matchingEnrollments.map((enrollment) => (
                      <span key={enrollment.id} className={styles.compactGroup}>
                        <StatusBadge
                          className={`${styles.courseBadge} ${styles.chip}`}
                          status={`course_type_${enrollment.courseType}`}
                          tone={enrollment.courseType === "A" ? "warning" : "info"}
                        >
                          <StudentIcon
                            name={enrollment.courseType === "A" ? "motorcycle" : "car"}
                          />
                          <span
                            title={`Tipo ${enrollment.courseType} · ${courseName(enrollment.courseType)}`}
                          >
                            Tipo {enrollment.courseType}
                          </span>
                        </StatusBadge>
                        <StatusBadge
                          className={styles.chip}
                          status={enrollment.cohortId ? "cohort" : "pendiente_cohorte"}
                          tone={enrollment.cohortId ? "neutral" : "warning"}
                        >
                          <span
                            className={styles.chipText}
                            title={
                              enrollment.cohortId ? cohortLabel(enrollment.cohortId) : undefined
                            }
                          >
                            {enrollment.cohortId ? cohortLabel(enrollment.cohortId) : "Sin cohorte"}
                          </span>
                        </StatusBadge>
                        {enrollment.etapa && enrollment.etapa !== "activa" ? (
                          <StatusBadge
                            className={styles.chip}
                            status={enrollment.etapa}
                            tone="warning"
                            label={enrollment.etapa === "por_agendar" ? "Por agendar" : "Reservado"}
                          />
                        ) : (
                          <StudentBadge status={enrollment.status} className={styles.chip} />
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <StudentRowMenu
                name={student.nombreCompleto}
                href={(view) => href(student, view)}
                onOpen={(event, view) => onOpen?.(event, student.id, view)}
              />
            </li>
          );
        })}
      </ul>
    );
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
