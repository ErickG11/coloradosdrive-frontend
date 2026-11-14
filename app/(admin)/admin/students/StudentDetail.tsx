"use client";
import { StudentAbsences } from "./StudentAbsences";
import { EnrollmentAdminControls } from "@/components/student-enrollment/EnrollmentAdminControls";
import Link from "next/link";
import { AdminPlanChangePanel } from "@/components/student-enrollment/AdminPlanChangePanel";
import { StudentEnrollmentAccess } from "./StudentEnrollmentAccess";
import { AdminPaymentActions } from "@/components/student-enrollment/AdminPaymentActions";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Modal, buttonClassName } from "@/components/ui";
import { StudentIdentityConfirmation } from "./StudentIdentityConfirmation";
import { Toast } from "@/components/inscripcion/Toast";
import { StudentEditForm } from "./StudentEditForm";
import { useFetch } from "@/hooks/useFetch";
import { readStudentFilters, studentListHref } from "@/lib/api/students";
import type { StudentDetail as Detail } from "@/types";
import { SidePanel } from "@/components/ui/SidePanel";
import type { StudentView } from "./StudentDrawer";
import type { IndividualEnrollmentAccess } from "@/types/individualEnrollmentAccess";
import { ActiveBadge, StudentBadge } from "./StudentBadge";
import { StudentActions } from "./StudentActions";
import { StudentSchedule } from "./StudentSchedule";
import { StudentGraduation } from "./StudentGraduation";
import { StudentAvatar } from "./StudentVisual";
import { studentActionError } from "@/lib/api/studentActions";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/utils/money";
import { StudentCohortTransfer } from "./StudentCohortTransfer";
import { StudentCohortAssignment } from "./StudentCohortAssignment";
import type { StudentEnrollment } from "@/types/student";
import styles from "./students.module.css";

export function studentMoney(value: number | null) {
  return formatMoney(value);
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

type Section = "information" | "enrollments" | "documents" | "practices";
function StudentEnrollmentDates({
  studentId,
  enrollmentId,
}: {
  studentId: string;
  enrollmentId: string;
}) {
  const state = useFetch<IndividualEnrollmentAccess>(
    `/admin/estudiantes/${studentId}/matriculas/acceso`,
  );
  const dates = state.data?.enrollments?.find((e) => e.id === enrollmentId);
  if (!dates?.practiceStartDate) return null;
  return (
    <p>
      Prácticas: {date(dates.practiceStartDate)} al {date(dates.practiceEndDate)}
      {dates.accessEndDate ? ` · Acceso hasta ${date(dates.accessEndDate)}` : ""}.
    </p>
  );
}

export function StudentProfile({
  student,
  onAssignCohort,
  assignmentDisabled = false,
  actions,
  section = "all",
  hideHeading = false,
  onAttendanceChanged,
  onAttendanceBusyChange,
  onPaymentChanged,
}: {
  student: Detail;
  onAssignCohort?: (enrollment: StudentEnrollment) => void;
  assignmentDisabled?: boolean;
  actions?: ReactNode;
  section?: "all" | Section;
  hideHeading?: boolean;
  onEdit?: () => void;
  editDisabled?: boolean;
  onAttendanceChanged?: (slotId: string) => void;
  onAttendanceBusyChange?: (busy: boolean) => void;
  onPaymentChanged?: () => void;
}) {
  const show = (name: Section) => section === "all" || section === name;
  return (
    <div className="grid min-w-0 gap-6">
      {!hideHeading ? (
        <div className={styles.profileHeading}>
          <StudentAvatar student={student} />
          <h1>{student.nombreCompleto}</h1>
          <ActiveBadge active={student.activo} />
        </div>
      ) : null}
      {show("information") ? (
        <>
          <Card title="Contacto">
            <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
              {[
                [
                  student.document?.type === "pasaporte"
                    ? "Pasaporte"
                    : student.document?.type === "otro"
                      ? "Otro documento"
                      : "Cédula",
                  student.document?.number ?? student.cedula,
                ],
                ["Teléfono", student.telefono],
                ["Correo", student.correoDisponible ? student.correo : "No disponible"],
                ["Fecha de nacimiento", date(student.fechaNacimiento)],
                ["Tipo de sangre", student.tipoSangre],
                ["Género", student.genero],
                ["Ciudadanía", student.ciudadania],
                ["Dirección", student.direccion],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={
                    label === "Correo" || label === "Dirección" ? "sm:col-span-2" : undefined
                  }
                >
                  <dt className="text-text-secondary">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Cuenta y acceso">
            <dl className="grid gap-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt>Estado de acceso</dt>
                <dd>
                  <ActiveBadge active={student.activo} />
                </dd>
              </div>
              {student.status ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt>Estado de la cuenta</dt>
                  <dd>
                    <StudentBadge status={student.status} />
                  </dd>
                </div>
              ) : null}
              {student.identidadPresencial?.origenSolicitud ? (
                <div>
                  <dt className="text-text-secondary">Identidad presencial</dt>
                  <dd className="mt-1">
                    {student.identidadPresencial.confirmada ? "Confirmada" : "Pendiente"}
                    {student.identidadPresencial.confirmadaAt
                      ? ` · ${studentTimestamp(student.identidadPresencial.confirmadaAt)}`
                      : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
            {actions ? <div className="mt-4">{actions}</div> : null}
          </Card>
          <StudentGraduation graduation={student.graduation} />
        </>
      ) : null}
      {show("practices") ? (
        <>
          <StudentAbsences studentId={student.id} />
          <StudentSchedule
            key={student.id}
            schedule={student.practiceSchedule}
            onAttendanceChanged={onAttendanceChanged}
            onBusyChange={onAttendanceBusyChange}
          />
        </>
      ) : null}
      {show("enrollments") || show("documents") ? (
        <>
          {student.enrollments.length === 0 ? (
            <p className="text-sm text-text-secondary">El alumno no tiene matrículas.</p>
          ) : null}
          {student.enrollments.map((enrollment) => {
            const hours = student.graduation.enrollments
              .find((e) => e.enrollmentId === enrollment.enrollmentId)
              ?.checks.find((check) => check.key === "practice");
            return (
              <Card
                key={enrollment.enrollmentId}
                title={
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {enrollment.curso?.nombre ?? "Curso no disponible"} · Tipo{" "}
                      {enrollment.courseType}
                    </span>
                    <StudentBadge
                      status={
                        enrollment.etapa && enrollment.etapa !== "activa"
                          ? enrollment.etapa
                          : enrollment.status
                      }
                    />
                  </span>
                }
              >
                {show("enrollments") ? (
                  <div className="grid gap-4 text-sm">
                    <p
                      className={
                        enrollment.cohorte
                          ? "font-medium"
                          : "w-fit rounded-sm bg-status-warning-bg px-3 py-2 text-status-warning"
                      }
                    >
                      {enrollment.cohorte?.nombre ?? "Sin cohorte"}
                    </p>
                    <p className="text-text-secondary">
                      Inscripción: {studentTimestamp(enrollment.fechaInscripcion)}
                    </p>
                    {student.financialRestricted ? (
                      <p>Información reservada al permiso de pagos y facturas.</p>
                    ) : (
                      <div className="rounded-sm bg-bg-sunken p-3">
                        <p className="font-medium">
                          {enrollment.montoAbonado > 0
                            ? `Pagado ${studentMoney(enrollment.montoAbonado)} de ${studentMoney(enrollment.montoTotal)}`
                            : "Sin pago"}
                        </p>
                        {enrollment.saldo !== null && enrollment.saldo > 0 ? (
                          <p className="mt-1 text-text-secondary">
                            Saldo: {studentMoney(enrollment.saldo)}
                          </p>
                        ) : null}
                      </div>
                    )}
                    <StudentEnrollmentDates
                      studentId={student.id}
                      enrollmentId={enrollment.enrollmentId}
                    />
                    {hours ? (
                      <p className="text-text-secondary">
                        {hours.label}: {hours.detail}
                      </p>
                    ) : null}
                    {!student.financialRestricted &&
                    onAssignCohort &&
                    (enrollment.status === "pendiente_cohorte" ||
                      (enrollment.cohorte && enrollment.status === "activo")) ? (
                      <Button
                        id={`cohort-action-${enrollment.enrollmentId}`}
                        variant="secondary"
                        className="justify-self-start"
                        disabled={
                          assignmentDisabled ||
                          !student.activo ||
                          (enrollment.origen === "solicitud" && enrollment.etapa !== "activa")
                        }
                        onClick={() => onAssignCohort(enrollment)}
                      >
                        {enrollment.status === "pendiente_cohorte"
                          ? "Asignar cohorte"
                          : "Cambiar de cohorte"}
                      </Button>
                    ) : null}
                    {!student.activo && enrollment.status === "pendiente_cohorte" ? (
                      <p className="text-text-secondary">
                        Reactiva al alumno primero para asignar cohorte.
                      </p>
                    ) : null}
                    {enrollment.status === "activo" ? (
                      <AdminPlanChangePanel
                        studentId={student.id}
                        enrollmentId={enrollment.enrollmentId}
                        courseType={enrollment.courseType}
                        onChanged={onPaymentChanged}
                      />
                    ) : null}
                  </div>
                ) : null}
                {show("documents") ? (
                  <div>
                    <p className="mb-3 text-sm font-medium text-text-secondary">
                      {enrollment.documentosPendientes} pendientes
                    </p>
                    <EnrollmentAdminControls
                      studentId={student.id}
                      enrollment={enrollment}
                      onChanged={onPaymentChanged}
                    />
                  </div>
                ) : null}
              </Card>
            );
          })}
          {show("enrollments") ? (
            <>
              {!student.financialRestricted &&
              student.enrollments.some((e) => e.origen === "solicitud") ? (
                <AdminPaymentActions
                  studentId={student.id}
                  active={student.activo}
                  onChanged={onPaymentChanged}
                />
              ) : null}
              <StudentEnrollmentAccess
                studentId={student.id}
                labels={Object.fromEntries(
                  student.enrollments.map((e) => [
                    e.enrollmentId,
                    `${e.curso?.nombre ?? `Tipo ${e.courseType}`} · ${e.cohorte?.nombre ?? "Sin cohorte"}`,
                  ]),
                )}
                onChanged={onPaymentChanged}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function StudentDetail({
  id,
  embedded = false,
  onChanged,
  onBusyChange,
  view = "ficha",
  onClose,
}: {
  id: string;
  view?: StudentView;
  onClose?: () => void;
  /** Dentro del panel lateral: vistas independientes y acciones en el encabezado. */
  embedded?: boolean;
  onChanged?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [section, setSection] = useState<Section>("information");
  const [editing, setEditing] = useState(false);
  const [confirmingIdentity, setConfirmingIdentity] = useState(false);
  const [identityNotice, setIdentityNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [cohortBusy, setCohortBusy] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const attendanceFocus = useRef<string | null>(null);
  const cohortFocus = useRef<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [deletionPending, setDeletionPending] = useState(false);
  const [assigning, setAssigning] = useState<StudentEnrollment | null>(null);
  // El panel no se cierra con Escape mientras hay una operación en curso.
  useEffect(() => {
    onBusyChange?.(
      editing || saving || actionBusy || assigning !== null || attendanceBusy || confirmingIdentity,
    );
    return () => onBusyChange?.(false);
  }, [editing, saving, actionBusy, assigning, attendanceBusy, confirmingIdentity, onBusyChange]);
  const params = useSearchParams();
  const { data, isLoading, error, errorStatus, errorCode, refetch } = useFetch<Detail>(
    `/admin/estudiantes/${id}`,
  );
  useEffect(() => {
    if (!isLoading && !error && attendanceFocus.current) {
      document.getElementById(`attendance-correct-${attendanceFocus.current}`)?.focus();
      attendanceFocus.current = null;
    }
  }, [data, isLoading, error]);
  useEffect(() => {
    if (!assigning && !isLoading && !error && cohortFocus.current) {
      document.getElementById(`cohort-action-${cohortFocus.current}`)?.focus();
      cohortFocus.current = null;
    }
  }, [assigning, isLoading, error, data]);
  const accountActions = data ? (
    <>
      <StudentActions
        student={data}
        disabled={editing || saving || assigning !== null || confirmingIdentity}
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
    </>
  ) : null;
  const identityAction = data ? (
    <>
      {data.identidadPresencial?.origenSolicitud && !data.identidadPresencial.confirmada && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={
            editing ||
            saving ||
            actionBusy ||
            attendanceBusy ||
            deletionPending ||
            assigning !== null ||
            confirmingIdentity
          }
          onClick={() => setConfirmingIdentity(true)}
        >
          Confirmar identidad manualmente
        </Button>
      )}
    </>
  ) : null;
  const content = (
    <div className={assigning && embedded ? "h-full min-h-0" : "flex min-h-0 flex-col gap-6"}>
      {!embedded && (
        <Link
          className={buttonClassName("secondary", "sm", "self-start")}
          href={studentListHref(readStudentFilters(params))}
        >
          Volver a Alumnos
        </Link>
      )}
      {!assigning && identityNotice && (
        <Toast message={identityNotice} onDismiss={() => setIdentityNotice("")} />
      )}
      {!assigning && success && (
        <p role="status" className="text-sm text-accent-blue">
          Los datos del alumno se guardaron correctamente.
        </p>
      )}
      {isLoading && !data ? (
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
          {!embedded ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={actionBusy || deletionPending || assigning !== null || confirmingIdentity}
                onClick={() => setEditing(true)}
              >
                Editar
              </Button>
              {accountActions}
            </div>
          ) : null}
          {!assigning && actionNotice && (
            <p role="status" className="text-sm text-accent-blue">
              {actionNotice}
            </p>
          )}
          {embedded && view === "ficha" && !assigning ? (
            <div
              role="tablist"
              aria-label="Ficha del alumno"
              className="flex gap-2 border-b border-border"
            >
              {(
                [
                  ["information", "Información"],
                  ["practices", "Prácticas"],
                ] as const
              ).map(([key, label], index) => (
                <button
                  key={key}
                  id={`student-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={section === key}
                  aria-controls="student-profile-panel"
                  tabIndex={section === key ? 0 : -1}
                  className="min-h-11 border-b-2 border-transparent px-3 text-sm aria-selected:border-brand-primary aria-selected:font-semibold"
                  onClick={() => setSection(key)}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? "information"
                        : event.key === "End"
                          ? "practices"
                          : index === 0
                            ? "practices"
                            : "information";
                    setSection(next);
                    document.getElementById(`student-tab-${next}`)?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {!assigning && view === "editar" ? (
            <div className="grid gap-6">
              <StudentEditForm
                student={data}
                onBusyChange={setSaving}
                onDeletionPending={() => setDeletionPending(true)}
                onCancel={() => onClose?.()}
                onReload={refetch}
                onSaved={() => {
                  setSuccess(true);
                  refetch();
                  onChanged?.();
                }}
              />
              {accountActions}
            </div>
          ) : null}
          {!assigning && view !== "editar" ? (
            <div
              id="student-profile-panel"
              role={view === "ficha" ? "tabpanel" : undefined}
              aria-labelledby={view === "ficha" ? `student-tab-${section}` : undefined}
            >
              <StudentProfile
                actions={identityAction}
                student={data}
                onPaymentChanged={() => {
                  refetch();
                  onChanged?.();
                }}
                onAttendanceBusyChange={setAttendanceBusy}
                onAttendanceChanged={(slotId) => {
                  attendanceFocus.current = slotId;
                  setActionNotice("La asistencia se guardó correctamente.");
                  refetch();
                  onChanged?.();
                }}
                hideHeading={embedded}
                section={
                  !embedded
                    ? "all"
                    : view === "documentos"
                      ? "documents"
                      : view === "matriculas"
                        ? "enrollments"
                        : section
                }
                onEdit={
                  embedded
                    ? () => {
                        setSuccess(false);
                        setEditing(true);
                      }
                    : undefined
                }
                editDisabled={
                  actionBusy || deletionPending || assigning !== null || confirmingIdentity
                }
                onAssignCohort={(enrollment) => {
                  cohortFocus.current = enrollment.enrollmentId;
                  setAssigning(enrollment);
                }}
                assignmentDisabled={
                  editing ||
                  saving ||
                  actionBusy ||
                  deletionPending ||
                  assigning !== null ||
                  confirmingIdentity
                }
              />
            </div>
          ) : null}
          {assigning && assigning.cohorte ? (
            <StudentCohortTransfer
              embedded={embedded}
              onBusyChange={setCohortBusy}
              key={assigning.enrollmentId}
              studentId={id}
              enrollment={assigning}
              onClose={() => setAssigning(null)}
              onChanged={() => {
                setAssigning(null);
                setActionNotice("La cohorte se cambió correctamente.");
                refetch();
                onChanged?.();
              }}
            />
          ) : (
            assigning && (
              <StudentCohortAssignment
                embedded={embedded}
                onBusyChange={setCohortBusy}
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
            )
          )}
          {confirmingIdentity && (
            <StudentIdentityConfirmation
              key={id}
              studentId={id}
              onClose={() => setConfirmingIdentity(false)}
              onReload={() => {
                setConfirmingIdentity(false);
                refetch();
              }}
              onSaved={() => {
                setConfirmingIdentity(false);
                setIdentityNotice("La identidad presencial se confirmó correctamente.");
                refetch();
                onChanged?.();
              }}
            />
          )}
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
  if (!embedded) return content;
  return (
    <SidePanel
      context={
        view === "editar"
          ? "EDITAR ALUMNO"
          : view === "matriculas"
            ? "MATRÍCULAS"
            : view === "documentos"
              ? "DOCUMENTOS"
              : "FICHA DEL ALUMNO"
      }
      className={styles.page}
      title={data?.nombreCompleto ?? "Alumno"}
      avatar={data ? <StudentAvatar student={data} /> : undefined}
      subtitle={
        data ? (
          <>
            <p>Documento: {data.document?.number ?? data.cedula}</p>
            <p>Registrado el {studentTimestamp(data.createdAt)}</p>
          </>
        ) : undefined
      }
      header={
        data ? (
          <>
            <ActiveBadge active={data.activo} />
            {data.status ? <StudentBadge status={data.status} /> : null}
          </>
        ) : undefined
      }
      closeDisabled={
        editing || saving || actionBusy || attendanceBusy || confirmingIdentity || cohortBusy
      }
      headerScrolls={!assigning && view !== "editar"}
      bodyClassName={assigning ? "!overflow-hidden !p-0" : undefined}
      onClose={() => {
        if (assigning) setAssigning(null);
        else onClose?.();
      }}
    >
      {content}
    </SidePanel>
  );
}
