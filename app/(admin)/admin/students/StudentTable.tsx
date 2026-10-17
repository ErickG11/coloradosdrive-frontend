import Link from "next/link";
import { buttonClassName } from "@/components/ui";
import type { AdminStudent, Cohort } from "@/types";
import { ActiveBadge, StudentBadge } from "./StudentBadge";

export function StudentTable({
  students,
  cohorts,
  filterQuery,
}: {
  students: AdminStudent[];
  cohorts: Cohort[];
  filterQuery: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-bg-surface backdrop-blur-md">
      <table className="min-w-full divide-y divide-border text-sm">
        <caption className="sr-only">Alumnos y matrículas coincidentes</caption>
        <thead className="bg-bg-sunken">
          <tr>
            {[
              "Nombre",
              "Cédula",
              "Teléfono",
              "Estado",
              "Matrículas coincidentes",
              "Requisitos",
              "Ficha",
            ].map((title) => (
              <th
                key={title}
                scope="col"
                className="px-4 py-3 text-left font-medium text-text-secondary"
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {students.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                No hay alumnos con esos filtros
              </td>
            </tr>
          ) : (
            students.map((student) => (
              <tr key={student.id}>
                <th scope="row" className="px-4 py-3 text-left font-medium text-text-primary">
                  {student.nombreCompleto}
                </th>
                <td className="px-4 py-3 text-text-secondary">{student.cedula}</td>
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {student.telefono ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <ActiveBadge active={student.activo} />
                </td>
                <td className="min-w-64 px-4 py-3">
                  <ul className="space-y-2">
                    {student.matchingEnrollments.map((enrollment) => (
                      <li
                        key={enrollment.id}
                        className="flex flex-wrap items-center gap-2 text-text-secondary"
                      >
                        <span>Tipo {enrollment.courseType}</span>
                        <StudentBadge status={enrollment.status} />
                        <span>
                          {enrollment.cohortId
                            ? (cohorts.find((cohort) => cohort.id === enrollment.cohortId)
                                ?.nombre ?? "Cohorte no disponible")
                            : "Sin cohorte"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {student.matchingEnrollments.length === 0 && (
                    <span className="text-text-secondary">Sin matrículas coincidentes</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {student.requirements ? (
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
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    className={buttonClassName("secondary", "sm")}
                    href={`/admin/students/${student.id}?${filterQuery}`}
                    aria-label={`Ver ficha de ${student.nombreCompleto}`}
                  >
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
