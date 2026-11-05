"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStudentPayment } from "./useStudentPayment";
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
  const { data, isLoading, error, refetch } = useFetch<StudentEnrollmentState>(
    "/estudiantes/estado-inscripcion",
  );
  const [selected, setSelected] = useState<number | null>(null);
  const closed = useCallback(() => {
    setSelected(1);
    refetch();
  }, [refetch]);
  const reservation = useStudentReservation(closed);
  const router = useRouter();
  const paid = useCallback(() => {
    refetch();
    router.refresh();
  }, [refetch, router]);
  const payment = useStudentPayment(data?.enrollmentId, paid);
  const paymentOpen =
    !!payment.payment && ["pendiente", "revision", "aprobado"].includes(payment.payment.estado);
  if (isLoading)
    return (
      <>
        <ReservationBanner state={reservation} />
        <p role="status">Cargando tu inscripción…</p>
      </>
    );
  if (error || !data)
    return (
      <>
        <ReservationBanner state={reservation} />
        <Card title="Mi inscripción">
          <p role="alert">No pudimos consultar tu inscripción.</p>
          <Button className="mt-4" onClick={refetch}>
            Reintentar
          </Button>
        </Card>
      </>
    );
  if (data.accesoCompleto)
    return (
      <Card title="Mi inscripción">
        <p>Tu cuenta tiene acceso a la plataforma. Tu matrícula está activa.</p>
        <Link className="mt-4 inline-flex min-h-11 items-center underline" href="/student">
          Ir a mi panel
        </Link>
      </Card>
    );
  const desiredStep = selected ?? (reservation.held ? 2 : 0);
  const step = desiredStep === 2 && !reservation.live && !paymentOpen ? 1 : desiredStep;
  return (
    <section className="grid min-w-0 gap-6">
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
      <nav aria-label="Pasos de la inscripción">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((label, index) => (
            <li key={label}>
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
                {index + 1}. {label}
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      {step === 0 ? (
        <>
          <Card title="Verificaciones de la escuela">
            <ul className="grid gap-3">
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
            <p className="mb-4 text-text-secondary">
              Llévalos a la escuela; no necesitas subirlos aquí. Los pendientes no impiden elegir tu
              horario.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
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
            onReserved={(result) => {
              reservation.reserved(result);
              setSelected(2);
              refetch();
            }}
            onNext={() => setSelected(2)}
          />
        ) : (
          <p role="alert">No encontramos una matrícula disponible para reservar.</p>
        )
      ) : (
        <StudentPaymentStep
          state={payment}
          reservation={reservation}
          onBack={() => setSelected(1)}
        />
      )}
    </section>
  );
}
