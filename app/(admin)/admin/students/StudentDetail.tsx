"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentAvatar, studentDisplayName } from "./StudentVisual";
import styles from "./students.module.css";
import { useSearchParams } from "next/navigation";
import { Button, Card, Modal, buttonClassName } from "@/components/ui";
import { StudentEditForm } from "./StudentEditForm";
import { useFetch } from "@/hooks/useFetch";
import { readStudentFilters, studentListHref } from "@/lib/api/students";
import type { StudentDetail as Detail } from "@/types";
import { DOCUMENTS } from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { ActiveBadge, StudentBadge } from "./StudentBadge";
import { StudentActions } from "./StudentActions";
import { StudentReservations } from "./StudentReservations";
import { studentActionError } from "@/lib/api/studentActions";
import { ApiError } from "@/lib/api/errors";
import { StudentCohortAssignment } from "./StudentCohortAssignment";
import type { StudentEnrollment } from "@/types/student";

export function studentMoney(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value);
}
function date(value: string | null) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
}
export function studentTimestamp(value: string) {
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-EC", { dateStyle: "long" }).format(parsed);
}
export function StudentProfile({
  student,
  onAssignCohort,
  assignmentDisabled = false,
  section = "all",
  hideHeading = false,
  onEdit,
  editDisabled = false,
}: {
  onEdit?: () => void;
  editDisabled?: boolean;
  hideHeading?: boolean;
  section?: "all" | "information" | "enrollments" | "documents" | "reservations";
  student: Detail;
  onAssignCohort?: (enrollment: StudentEnrollment) => void;
  assignmentDisabled?: boolean;
}) {
  return (
    <div className={styles.profile}>
      {!hideHeading && (
        <>
          <div className={styles.profileHeading}>
            <StudentAvatar student={student} />
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {studentDisplayName(student.nombreCompleto)}
            </h1>
            <ActiveBadge active={student.activo} />
            {student.status && <StudentBadge status={student.status} />}
          </div>
          <p className="text-sm text-text-secondary">
            Registrado el{" "}
            <time dateTime={student.createdAt}>{studentTimestamp(student.createdAt)}</time>
          </p>
        </>
      )}
      {(section === "all" || section === "information") && (
        <Card
          className={styles.personalCard}
          title={
            <span className={styles.sectionTitle}>
              Datos personales
              {onEdit && (
                <Button variant="secondary" size="sm" onClick={onEdit} disabled={editDisabled}>
                  Editar
                </Button>
              )}
            </span>
          }
        >
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Cédula", student.cedula],
              ["Teléfono", student.telefono],
              ["Fecha de nacimiento", date(student.fechaNacimiento)],
              ["Tipo de sangre", student.tipoSangre],
              ["Género", student.genero],
              ["Ciudadanía", student.ciudadania],
              ["Dirección", student.direccion],
              ["Correo", student.correoDisponible ? student.correo : "No disponible"],
            ].map(([label, value]) => (
              <div key={label} className={label === "Correo" ? styles.emailField : undefined}>
                <dt className="text-text-secondary">{label}</dt>
                <dd className="mt-1 break-words text-text-primary">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      {(section === "all" || section === "enrollments" || section === "documents") && (
        <>
          <h2 className="font-display text-xl font-bold text-text-primary">
            {section === "documents" ? "Documentos por matrícula" : "Matrículas"}
          </h2>
          {student.enrollments.length === 0 && (
            <p className="text-text-secondary">El alumno no tiene matrículas.</p>
          )}
          {student.enrollments.map((enrollment) => (
            <div key={enrollment.enrollmentId} className={styles.enrollmentGroup}>
              {section !== "documents" && (
                <Card
                  className={styles.enrollmentCard}
                  title={`${enrollment.curso?.nombre ?? "Curso no disponible"} · Tipo ${enrollment.courseType}`}
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <StudentBadge status={enrollment.status} />
                    <span className="text-sm text-text-secondary">
                      {enrollment.cohorte?.nombre ?? "Sin cohorte"}
                    </span>
                  </div>
                  {enrollment.status === "pendiente_cohorte" && onAssignCohort && (
                    <div className="mb-4 flex flex-col items-start gap-2">
                      <Button
                        variant="secondary"
                        disabled={assignmentDisabled || !student.activo}
                        onClick={() => onAssignCohort(enrollment)}
                      >
                        Asignar cohorte
                      </Button>
                      {!student.activo && (
                        <p className="text-sm text-text-secondary">
                          Reactiva al alumno primero para asignar cohorte.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mb-4 text-sm text-text-secondary">
                    Fecha de inscripción:{" "}
                    <time dateTime={enrollment.fechaInscripcion}>
                      {studentTimestamp(enrollment.fechaInscripcion)}
                    </time>
                  </p>
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
                        <dd className="mt-1 font-medium text-text-primary">
                          {studentMoney(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}
              {(section === "all" || section === "documents") && (
                <Card
                  className={styles.documentCard}
                  title={`Documentos requeridos · ${enrollment.documentosPendientes} pendientes`}
                >
                  {section === "documents" && (
                    <p className="mb-3 text-text-secondary">
                      {enrollment.curso?.nombre ?? "Curso no disponible"} · Tipo{" "}
                      {enrollment.courseType}
                    </p>
                  )}
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
                            {DOCUMENTS.find((item) => item.tipo === document.tipo)?.label ??
                              document.tipo}
                          </span>
                          <StudentBadge status={document.estado} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
export function StudentDetail({
  id,
  embedded = false,
  onChanged,
  onBusyChange,
}: {
  id: string;
  embedded?: boolean;
  onChanged?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [section, setSection] = useState<
    "information" | "enrollments" | "documents" | "reservations"
  >("information");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [deletionPending, setDeletionPending] = useState(false);
  const [assigning, setAssigning] = useState<StudentEnrollment | null>(null);
  useEffect(() => {
    onBusyChange?.(editing || saving || actionBusy || assigning !== null);
    return () => onBusyChange?.(false);
  }, [editing, saving, actionBusy, assigning, onBusyChange]);
  const params = useSearchParams();
  const { data, isLoading, error, errorStatus, errorCode, refetch } = useFetch<Detail>(
    `/admin/estudiantes/${id}`,
  );
  return (
    <div className={styles.detail}>
      {!embedded && (
        <Link
          className={buttonClassName("secondary", "sm", "self-start")}
          href={studentListHref(readStudentFilters(params))}
        >
          Volver a Alumnos
        </Link>
      )}
      {success && (
        <p role="status" className="text-sm text-accent-blue">
          Los datos del alumno se guardaron correctamente.
        </p>
      )}
      {isLoading ? (
        <p role="status" className="text-text-secondary">
          Cargando ficha…
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-accent-red">
          <span>
            {errorStatus === 404
              ? "Alumno no encontrado"
              : errorCode
                ? studentActionError(new ApiError(error, errorStatus ?? 500, { code: errorCode }))
                    .message
                : error}
          </span>
          <Button variant="secondary" onClick={refetch}>
            Reintentar
          </Button>
        </div>
      ) : data ? (
        <>
          {embedded && (
            <header className={styles.profileHeading}>
              <StudentAvatar student={data} />
              <div>
                <h2>{studentDisplayName(data.nombreCompleto)}</h2>
                <p>Cédula: {data.cedula}</p>
                <p>Registrado el {studentTimestamp(data.createdAt)}</p>
              </div>
              <ActiveBadge active={data.activo} />
            </header>
          )}
          {actionNotice && (
            <p role="status" className="text-sm text-accent-blue">
              {actionNotice}
            </p>
          )}
          {embedded && (
            <nav aria-label="Secciones de la ficha" className={styles.tabs}>
              {(
                [
                  ["information", "Información"],
                  ["enrollments", "Matrículas"],
                  ["documents", "Documentos"],
                  ["reservations", "Reservas"],
                ] as const
              ).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  aria-current={section === key ? "page" : undefined}
                  onClick={() => setSection(key)}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
          <StudentProfile
            student={data}
            hideHeading={embedded}
            section={embedded && section !== "information" ? section : "all"}
            onEdit={
              embedded
                ? () => {
                    setSuccess(false);
                    setEditing(true);
                  }
                : undefined
            }
            editDisabled={actionBusy || deletionPending || assigning !== null}
            onAssignCohort={setAssigning}
            assignmentDisabled={
              editing || saving || actionBusy || deletionPending || assigning !== null
            }
          />
          {assigning && (
            <StudentCohortAssignment
              key={assigning.enrollmentId}
              studentId={id}
              enrollment={assigning}
              onClose={() => setAssigning(null)}
              onReload={() => {
                setAssigning(null);
                refetch();
              }}
              onDeletionPending={() => setDeletionPending(true)}
              onSaved={() => {
                setAssigning(null);
                setActionNotice("La cohorte se asignó correctamente.");
                refetch();
                onChanged?.();
              }}
            />
          )}
          {(!embedded || section === "information" || section === "reservations") && (
            <StudentReservations key={String(data.activo)} id={id} />
          )}
          <div className={styles.accountActions}>
            <StudentActions
              student={data}
              disabled={editing || saving || assigning !== null}
              deletionPending={deletionPending}
              onBusyChange={setActionBusy}
              onPending={() => setDeletionPending(true)}
              onReload={refetch}
              onChanged={(message) => {
                setActionNotice(message);
                refetch();
                onChanged?.();
              }}
            />
            <Button
              variant="secondary"
              className="self-start"
              disabled={actionBusy || deletionPending || assigning !== null}
              onClick={() => {
                setSuccess(false);
                setEditing(true);
              }}
            >
              Editar
            </Button>
          </div>
          <Modal
            isOpen={editing}
            onClose={() => {
              if (!saving) setEditing(false);
            }}
            title="Editar alumno"
          >
            {editing && (
              <StudentEditForm
                student={data}
                onBusyChange={setSaving}
                onDeletionPending={() => setDeletionPending(true)}
                onCancel={() => setEditing(false)}
                onReload={() => {
                  setEditing(false);
                  refetch();
                }}
                onSaved={() => {
                  setEditing(false);
                  setSuccess(true);
                  refetch();
                  onChanged?.();
                }}
              />
            )}
          </Modal>
        </>
      ) : null}
    </div>
  );
}
