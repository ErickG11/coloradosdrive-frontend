import Link from "next/link";
import {
  Button,
  DataTable,
  EmptyState,
  StatusBadge,
  buttonClassName,
  type DataColumn,
} from "@/components/ui";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { AdminStudent, Cohort, MatchingEnrollment } from "@/types";

function displayName(name: string): string {
  return (
    name
      .trim()
      .toLocaleLowerCase("es")
      .replace(/(^|\s)\S/gu, (value) => value.toLocaleUpperCase("es")) || "Nombre no informado"
  );
}
function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toLocaleUpperCase("es") || "AL"
  );
}
function cohortLabel(enrollment: MatchingEnrollment, cohorts: Cohort[]): string | null {
  if (!enrollment.cohortId) return null;
  const name = cohorts.find((cohort) => cohort.id === enrollment.cohortId)?.nombre;
  return name ? (/^cohorte\b/iu.test(name) ? name : `Cohorte ${name}`) : "Cohorte no disponible";
}
export function StudentTable({
  students,
  cohorts,
  filterQuery,
  isLoading = false,
  error,
  onRetry,
  filtered = false,
  onClear,
}: {
  students: AdminStudent[];
  cohorts: Cohort[];
  filterQuery: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  filtered?: boolean;
  onClear?: () => void;
}) {
  const columns: DataColumn<AdminStudent>[] = [
    {
      key: "student",
      header: "Alumno",
      className: "data-table__identity md:min-w-56",
      render: (student) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-sunken text-xs font-semibold text-text-secondary"
          >
            {initials(student.nombreCompleto)}
          </span>
          <div className="min-w-0">
            <p className="break-words font-medium text-text-primary">
              {displayName(student.nombreCompleto)}
            </p>
            <p className="mt-1 text-xs font-normal tabular-nums text-text-secondary">
              {student.cedula}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Teléfono",
      className: "data-table__phone whitespace-nowrap tabular-nums",
      render: (student) => student.telefono ?? "—",
    },
    {
      key: "course",
      header: "Curso y cohorte",
      className: "data-table__course md:min-w-52",
      render: (student) => {
        const enrollment = student.matchingEnrollments[0];
        if (!enrollment) return <span>Sin matrículas coincidentes</span>;
        const cohort = cohortLabel(enrollment, cohorts);
        const extra = student.matchingEnrollments.length - 1;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text-primary">
              <span>Tipo {enrollment.courseType}</span>
              {cohort ? (
                <>
                  {" "}
                  · <span>{cohort}</span>
                </>
              ) : null}
            </span>
            {!cohort ? <StatusBadge status="pendiente_cohorte">Sin cohorte</StatusBadge> : null}
            {extra > 0 ? (
              <span
                className="rounded-sm bg-bg-sunken px-2 py-1 text-xs font-medium tabular-nums text-text-secondary"
                aria-label={`${extra} matrícula${extra === 1 ? "" : "s"} más`}
              >
                +{extra}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "account",
      header: "Estado de la cuenta",
      className: "whitespace-nowrap",
      render: (student) => <StatusBadge status={student.activo ? "activo" : "inactivo"} />,
    },
    {
      key: "pending",
      header: "Pendientes",
      className: "whitespace-nowrap",
      render: () => (
        <span className="text-xs" title="Consulta los documentos del alumno en su ficha">
          No informado
        </span>
      ),
    },
    {
      key: "open",
      header: "Abrir ficha",
      screenReaderHeader: true,
      mobileLabel: false,
      className: "data-table__chevron w-8",
      render: () => <ChevronRightIcon className="h-4 w-4" />,
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={students}
      getRowKey={(student) => student.id}
      caption="Listado de alumnos"
      mobileCards
      rowHref={(student) => `/admin/students/${student.id}?${filterQuery}`}
      rowLabel={(student) => `Ver ficha de ${student.nombreCompleto}`}
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
