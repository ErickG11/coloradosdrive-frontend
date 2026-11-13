"use client";
import { EnrollmentFlowFrame } from "@/components/inscripcion/EnrollmentFlowFrame";
import { EnrollmentIcon } from "@/components/inscripcion/EnrollmentVisual";
import { StudentEmptyState } from "@/components/student-shared/StudentEmptyState";
import flowStyles from "./student-enrollment-flow.module.css";
import { WaitlistPreferences } from "./WaitlistControl";
import { useEffect } from "react";
import visual from "@/components/inscripcion/enrollment-surface.module.css";

import type { IndividualEnrollmentAccess } from "@/types/individualEnrollmentAccess";
import { EnrollmentWorkspace } from "./EnrollmentWorkspace";
import { useRouter } from "next/navigation";
import { useStudentPayment } from "./useStudentPayment";
import { BillingPanel } from "./BillingPanel";
import { StudentPaymentStep } from "./StudentPaymentStep";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFetch } from "@/hooks/useFetch";
import type { StudentEnrollmentState } from "@/types/studentEnrollment";

import { useStudentReservation } from "./useStudentReservation";
import { ReservationBanner } from "./ReservationBanner";
import { StudentSchedulePicker } from "./StudentSchedulePicker";
const STEPS = ["Tus documentos", "Elige tu horario", "Pago"];
export function StudentEnrollmentWizard() {
  const choices = useFetch<IndividualEnrollmentAccess>("/estudiantes/inscripcion/matriculas");
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useFetch<StudentEnrollmentState>(
    selectedEnrollment
      ? `/estudiantes/estado-inscripcion/${selectedEnrollment}`
      : "/estudiantes/estado-inscripcion",
  );
  const selector =
    choices.data?.active &&
    choices.data.enrollments.filter((e) =>
      ["activo", "pendiente_cohorte", "finalizado"].includes(e.status),
    ).length > 1 ? (
      <fieldset className="mb-4 flex flex-wrap gap-2">
        <legend>Selecciona tu inscripción</legend>
        {choices.data.enrollments
          .filter((e) => ["activo", "pendiente_cohorte", "finalizado"].includes(e.status))
          .map((e) => (
            <Button
              type="button"
              variant="secondary"
              key={e.id}
              aria-pressed={(selectedEnrollment ?? data?.enrollmentId) === e.id}
              onClick={() => setSelectedEnrollment(e.id)}
            >
              Tipo {e.type} · {e.status}
            </Button>
          ))}
      </fieldset>
    ) : null;
  const [waiting, setWaiting] = useState<{ id: string; value: boolean } | null>(null);
  const onWaiting = useCallback(
    (value: boolean) => {
      if (data?.enrollmentId) setWaiting({ id: data.enrollmentId, value });
    },
    [data?.enrollmentId],
  );
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("paso") === "2") setSelected(1);
  }, []);
  const closed = useCallback(() => {
    setSelected(1);
    refetch();
  }, [refetch]);
  const reservation = useStudentReservation(closed, data?.enrollmentId ?? undefined);
  const router = useRouter();
  const paid = useCallback(() => {
    refetch();
    router.refresh();
  }, [refetch, router]);
  const payment = useStudentPayment(data?.enrollmentId, paid);
  const paymentOpen =
    !!payment.payment && ["pendiente", "revision", "aprobado"].includes(payment.payment.estado);
  if (data?.accesoCompleto)
    return (
      <EnrollmentFlowFrame companion={false} student step={3} total={3}>
        {selector}
        <WaitlistPreferences />
        <EnrollmentWorkspace
          state={data}
          refreshStatus={refetch}
          statusError={Boolean(error)}
          payment={payment.payment}
          reservation={reservation.reservation}
        />
      </EnrollmentFlowFrame>
    );
  if (isLoading)
    return (
      <EnrollmentFlowFrame companion={false} student total={3}>
        <div className={visual.surface}>
          {selector}
          <ReservationBanner state={reservation} />
          <div
            role="status"
            aria-label="Cargando tu inscripción"
            className="grid gap-4 motion-safe:animate-pulse"
          >
            <span className="h-10 w-2/3 rounded-sm bg-bg-sunken" />
            <span className="h-48 rounded-md bg-bg-sunken" />
          </div>
        </div>
      </EnrollmentFlowFrame>
    );
  if (error || !data)
    return (
      <EnrollmentFlowFrame companion={false} student total={3}>
        <div className={visual.surface}>
          {selector}
          <ReservationBanner state={reservation} />
          <Card title="Mi inscripción" className={`${visual.surface} ${visual.active}`}>
            <p role="alert">No pudimos consultar tu inscripción.</p>
            <Button className="mt-4" onClick={refetch}>
              Reintentar
            </Button>
          </Card>
        </div>
      </EnrollmentFlowFrame>
    );
  const desiredStep = selected ?? (reservation.held ? 2 : 0);
  const step = desiredStep === 2 && !reservation.live && !paymentOpen ? 1 : desiredStep;
  return (
    <EnrollmentFlowFrame companion={false} student total={3} step={step + 1}>
      <section className={`${visual.surface} ${flowStyles.flow}`}>
        <BillingPanel />
        <WaitlistPreferences />
        {waiting?.id === data.enrollmentId && waiting.value && !reservation.held && !paymentOpen ? (
          <StudentEmptyState
            title="Esperando curso"
            description="Te avisaremos cuando haya un curso disponible para que elijas tu horario."
            actions={
              <Button variant="secondary" onClick={() => setSelected(1)}>
                Consultar horarios
              </Button>
            }
          />
        ) : null}
        {selector}
        {data.individualDates?.practiceStartDate ? (
          <p>
            Prácticas: {data.individualDates.practiceStartDate} —{" "}
            {data.individualDates.practiceEndDate}. Acceso hasta{" "}
            {data.individualDates.accessEndDate}.
          </p>
        ) : null}
        <header>
          <h1 className="font-display text-2xl font-bold">Mi inscripción</h1>
          <p className="mt-2 text-text-secondary">
            Revisa tus documentos, elige tu horario y completa el pago para activar tu matrícula.
          </p>
        </header>
        <ReservationBanner state={reservation} />
        {paymentOpen && step !== 2 ? (
          <div role="status" className="rounded-sm border border-border p-4">
            <p>
              Tienes un pago{" "}
              {payment.payment?.estado === "revision" ? "en revisión" : "pendiente o recibido"}.
              Consulta su estado antes de pagar otra vez.
            </p>
            <Button className="mt-3" variant="secondary" onClick={() => setSelected(2)}>
              Consultar pago
            </Button>
          </div>
        ) : null}
        <nav aria-label="Pasos de la inscripción" className={visual.stepper}>
          <ol className="grid grid-cols-3 gap-2">
            {STEPS.filter(
              (_, index) =>
                index !== 2 ||
                !(
                  waiting?.id === data.enrollmentId &&
                  waiting.value &&
                  !reservation.held &&
                  !paymentOpen
                ),
            ).map((label, index) => (
              <li key={label} data-current={step === index}>
                <Button
                  className="min-h-11 w-full"
                  variant={step === index ? "primary" : "secondary"}
                  aria-current={step === index ? "step" : undefined}
                  disabled={
                    (index > 0 && !data.requisitosVerificados) ||
                    (index === 2 &&
                      !paymentOpen &&
                      (!reservation.live || !!reservation.error || reservation.checking))
                  }
                  onClick={() => setSelected(index)}
                >
                  <span className="h-5 w-5 shrink-0">
                    <EnrollmentIcon
                      name={
                        index < step
                          ? "check"
                          : index === 0
                            ? "document"
                            : index === 1
                              ? "calendar"
                              : "payment"
                      }
                    />
                  </span>
                  <span>{label}</span>
                </Button>
              </li>
            ))}
          </ol>
          <div className={flowStyles.progress} aria-hidden="true">
            <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
          </div>
        </nav>
        {step === 0 ? (
          <>
            <Card title="Verificaciones de la escuela">
              <ul className={`grid gap-3 ${visual.requirements}`}>
                <li>
                  Identidad:{" "}
                  {data.verificaciones.identidad
                    ? "verificada por la escuela"
                    : "pendiente de verificación"}
                </li>
                <li>
                  Estudios:{" "}
                  {data.verificaciones.estudios
                    ? "verificados por la escuela"
                    : "pendientes de verificación"}
                </li>
                <li>
                  Tipo de sangre declarado:{" "}
                  {data.verificaciones.tipoSangreDeclarado === "no_sabe"
                    ? "No lo sé"
                    : (data.verificaciones.tipoSangreDeclarado ?? "Sin declarar")}
                </li>
              </ul>
              {data.verificaciones.tipoSangreDeclarado === "no_sabe" ? (
                <p className="mt-4 text-status-warning">
                  Presenta el carné de tipo de sangre de la Cruz Roja para completar este dato.
                </p>
              ) : null}
            </Card>
            <Card title="Documentos para llevar">
              {data.fechaLimite && data.documentosFisicos.some((d) => d.estado === "pendiente") ? (
                <p>
                  Te quedan {Math.max(0, data.diasRestantes ?? 0)} días para llevar tus documentos.
                </p>
              ) : null}
              <p className="mb-4 text-text-secondary">
                Llévalos a la escuela; no necesitas subirlos aquí. Los pendientes no impiden elegir
                tu horario.
              </p>
              <ul className={`grid gap-3 sm:grid-cols-2 ${visual.documents}`}>
                {data.documentosFisicos.map((doc) => (
                  <li key={doc.tipo} className="rounded-sm border border-border p-4">
                    <p className="mb-2 font-medium">{doc.label ?? doc.tipo}</p>
                    <StatusBadge
                      status={doc.estado}
                      label={
                        doc.estado === "exento"
                          ? "Exento"
                          : doc.estado === "entregado"
                            ? "Entregado"
                            : "Pendiente"
                      }
                    />
                    {doc.tipo === "papeleta_votacion" && doc.exento ? (
                      <p className="mt-2 text-sm text-text-secondary">
                        Exento desde los 65 años cumplidos.
                      </p>
                    ) : null}
                    {doc.destacado ? (
                      <p className="mt-2 text-sm text-status-warning">
                        Necesario para completar tu tipo de sangre.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-text-secondary">
                El instructor cotejará tu cédula original y, si corresponde, el certificado de
                estudios en persona.
              </p>
            </Card>
            <Button
              className="justify-self-end"
              disabled={!data.requisitosVerificados}
              onClick={() => setSelected(1)}
            >
              Siguiente
            </Button>
          </>
        ) : step === 1 ? (
          data.enrollmentId ? (
            <StudentSchedulePicker
              key={data.enrollmentId}
              enrollmentId={data.enrollmentId}
              state={reservation}
              onWaiting={onWaiting}
              onReserved={(result) => {
                reservation.reserved(result);
                setSelected(2);
                refetch();
              }}
              onBack={() => setSelected(0)}
              onNext={() => setSelected(2)}
            />
          ) : (
            <p role="alert">No encontramos una matrícula disponible para reservar.</p>
          )
        ) : (
          <StudentPaymentStep
            state={payment}
            reservation={reservation}
            courseLabel={
              choices.data?.enrollments.find((entry) => entry.id === data.enrollmentId)?.type
            }
            onBack={() => setSelected(1)}
          />
        )}
      </section>
    </EnrollmentFlowFrame>
  );
}
