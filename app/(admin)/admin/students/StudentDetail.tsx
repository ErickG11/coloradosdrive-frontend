"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, buttonClassName } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { readStudentFilters, studentListHref } from "@/lib/api/students";
import type { StudentDetail as Detail } from "@/types";
import { DOCUMENTS } from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { ActiveBadge, StudentBadge } from "./StudentBadge";

export function studentMoney(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value);
}
function date(value: string | null) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
}
export function StudentProfile({ student }: { student: Detail }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {student.nombreCompleto}
        </h1>
        <ActiveBadge active={student.activo} />
        {student.status && <StudentBadge status={student.status} />}
      </div>
      <Card title="Datos personales">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Cédula", student.cedula],
            ["Teléfono", student.telefono],
            ["Correo", student.correoDisponible ? student.correo : "No disponible"],
            ["Fecha de nacimiento", date(student.fechaNacimiento)],
            ["Tipo de sangre", student.tipoSangre],
            ["Género", student.genero],
            ["Ciudadanía", student.ciudadania],
            ["Dirección", student.direccion],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-text-secondary">{label}</dt>
              <dd className="mt-1 break-words text-text-primary">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <h2 className="font-display text-xl font-bold text-text-primary">Matrículas</h2>
      {student.enrollments.length === 0 && (
        <p className="text-text-secondary">El alumno no tiene matrículas.</p>
      )}
      {student.enrollments.map((enrollment) => (
        <Card
          key={enrollment.enrollmentId}
          title={`${enrollment.curso?.nombre ?? "Curso no disponible"} · Tipo ${enrollment.courseType}`}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StudentBadge status={enrollment.status} />
            <span className="text-sm text-text-secondary">
              {enrollment.cohorte?.nombre ?? "Sin cohorte"}
            </span>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            {(
              [
                ["Total", enrollment.montoTotal],
                ["Abonado", enrollment.montoAbonado],
                ["Saldo", enrollment.saldo],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-text-secondary">{label}</dt>
                <dd className="mt-1 font-medium text-text-primary">{studentMoney(value)}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 mb-3 font-display font-semibold text-text-primary">
            Documentos · {enrollment.documentosPendientes} pendientes
          </h3>
          {enrollment.documentos.length === 0 ? (
            <p className="text-sm text-text-secondary">No hay documentos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {enrollment.documentos.map((document) => (
                <li
                  key={document.tipo}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm text-text-primary"
                >
                  <span>
                    {DOCUMENTS.find((item) => item.tipo === document.tipo)?.label ?? document.tipo}
                  </span>
                  <StudentBadge status={document.estado} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
export function StudentDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const { data, isLoading, error, errorStatus, refetch } = useFetch<Detail>(
    `/admin/estudiantes/${id}`,
  );
  return (
    <div className="flex flex-col gap-6">
      <Link
        className={buttonClassName("secondary", "sm", "self-start")}
        href={studentListHref(readStudentFilters(params))}
      >
        Volver a Alumnos
      </Link>
      {isLoading ? (
        <p role="status" className="text-text-secondary">
          Cargando ficha…
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-accent-red">
          <span>{errorStatus === 404 ? "Alumno no encontrado" : error}</span>
          <Button variant="secondary" onClick={refetch}>
            Reintentar
          </Button>
        </div>
      ) : data ? (
        <StudentProfile student={data} />
      ) : null}
    </div>
  );
}
