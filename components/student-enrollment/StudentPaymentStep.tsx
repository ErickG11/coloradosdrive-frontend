"use client";
import visual from "@/components/inscripcion/enrollment-surface.module.css";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { studentPaymentApi, paymentError, paymentMoney } from "@/lib/api/studentPayment";
import type { PaymentConfiguration, PaymentQuote } from "@/types/studentPayment";
import type { useStudentPayment } from "./useStudentPayment";
import type { useStudentReservation } from "./useStudentReservation";
const HostedFields = dynamic(
  () => import("./KushkiHostedFields").then((m) => m.KushkiHostedFields),
  { ssr: false },
);
interface Props {
  state: ReturnType<typeof useStudentPayment>;
  reservation: ReturnType<typeof useStudentReservation>;
  onBack: () => void;
}
export function StudentPaymentStep({ state, reservation, onBack }: Props) {
  const [config, setConfig] = useState<PaymentConfiguration | null>(null);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [reload, setReload] = useState(0);
  const attempt = useRef<string | null>(null);
  const mutation = useRef(false);
  const current = state.payment;
  const reservationId = reservation.reservation?.id;
  useEffect(() => {
    let cancelled = false;
    studentPaymentApi
      .config()
      .then((v) => {
        if (!cancelled) setConfig(v);
      })
      .catch((e) => {
        if (!cancelled) setError(paymentError(e));
      });
    if (reservationId && reservation.live)
      studentPaymentApi
        .quote(reservationId)
        .then((v) => {
          if (!cancelled) setQuote(v);
        })
        .catch((e) => {
          if (!cancelled) setError(paymentError(e));
        });
    return () => {
      cancelled = true;
    };
  }, [reservationId, reservation.live, reload]);
  async function start() {
    if (!reservationId || !reservation.live || mutation.current || !state.ready || state.error)
      return;
    mutation.current = true;
    setBusy(true);
    setError(null);
    attempt.current ??= crypto.randomUUID();
    try {
      state.accept(await studentPaymentApi.begin(reservationId, attempt.current));
      reservation.refetch();
    } catch (e) {
      setError(paymentError(e));
      state.refresh();
      reservation.refetch();
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function resolve(result: "aprobado" | "rechazado" | "pendiente") {
    if (!current || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError(null);
    try {
      state.accept(await studentPaymentApi.simulate(current.id, result));
      reservation.refetch();
    } catch (e) {
      setError(paymentError(e));
      state.refresh();
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function charge(token: string) {
    if (!current || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setSent(true);
    setError(null);
    try {
      state.accept(await studentPaymentApi.charge(current.id, token));
      reservation.refetch();
    } catch (e) {
      setError(paymentError(e));
      state.refresh();
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function retry() {
    attempt.current = null;
    setSent(false);
    setError(null);
    void start();
  }
  const amount: PaymentQuote | null = current ?? quote;
  return (
    <Card title="Pago" className={visual.payment} data-payment-state={current?.estado}>
      {current?.estado === "aprobado" ? (
        <div role="status">
          <h3 className="font-semibold text-status-success">
            Pago confirmado. Tu matrícula está activa.
          </h3>
          <p className="mt-2">Ya puedes acceder a tus prácticas y a la plataforma.</p>
          {current.correoEnviado ? <p className="mt-2">Enviamos tu correo de bienvenida.</p> : null}
        </div>
      ) : current?.estado === "revision" ? (
        <div role="alert">
          <h3 className="font-semibold text-status-warning">
            Recibimos tu pago y requiere revisión
          </h3>
          <p className="mt-2">
            Contacta a la escuela con la referencia {current.id}. No realices otro pago.
          </p>
        </div>
      ) : (
        <>
          {amount ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt>Precio de la cohorte</dt>
                <dd className="font-semibold">{paymentMoney(amount.subtotalCentavos)}</dd>
              </div>
              <div>
                <dt>Recargo</dt>
                <dd>{paymentMoney(amount.recargoCentavos)}</dd>
              </div>
              <div>
                <dt>IVA</dt>
                <dd>{paymentMoney(amount.ivaCentavos)}</dd>
              </div>
              <div>
                <dt>Total a pagar</dt>
                <dd className="text-xl font-semibold">{paymentMoney(amount.totalCentavos)}</dd>
              </div>
            </dl>
          ) : (
            <p role="status">Consultando importe…</p>
          )}
          {current?.estado === "rechazado" ? (
            <div role="alert" className="mt-4">
              <p>El pago fue rechazado. Tu matrícula sigue pendiente.</p>
              <Button
                className="mt-3"
                disabled={!reservation.live || busy || !!state.error}
                onClick={retry}
              >
                Crear otro intento
              </Button>
            </div>
          ) : current?.estado === "pendiente" ? (
            <div className="mt-5">
              <p role="status" className="font-semibold">
                Pago pendiente de confirmación
              </p>
              <p className="mt-2">
                No inicies otro pago. Conservamos el intento y consultamos su estado.
              </p>
              <p className="mt-2 break-all text-sm text-text-secondary">Referencia: {current.id}</p>
              {current.proveedor === "simulado" ? (
                <div className="mt-4 rounded-sm border border-border p-4">
                  <h3 className="font-semibold">Checkout simulado · pruebas locales</h3>
                  <p className="mt-2 text-sm">
                    Elige el resultado para probar el flujo. No se cobra dinero ni se usa una
                    tarjeta.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(["aprobado", "rechazado", "pendiente"] as const).map((result) => (
                      <Button
                        key={result}
                        disabled={busy}
                        variant={result === "aprobado" ? "primary" : "secondary"}
                        onClick={() => void resolve(result)}
                      >
                        {result === "aprobado"
                          ? "Aprobar"
                          : result === "rechazado"
                            ? "Rechazar"
                            : "Dejar pendiente"}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : current.proveedor === "kushki" &&
                current.puedeCobrar === true &&
                config?.publicKey &&
                !sent ? (
                <HostedFields
                  key={current.id}
                  payment={current}
                  config={config}
                  onToken={charge}
                  disabled={busy || !reservation.live || !!state.error}
                />
              ) : null}
            </div>
          ) : config?.proveedor === "manual" ? (
            <p className="mt-5">
              Realiza el pago en efectivo en la escuela. Un administrador lo registrará y activará
              tu matrícula.
            </p>
          ) : (
            <Button
              className="mt-5"
              isLoading={busy}
              disabled={
                !amount || !config || !reservation.live || !state.ready || !!state.error || !!error
              }
              onClick={() => void start()}
            >
              Iniciar pago
            </Button>
          )}
        </>
      )}
      {error || state.error ? (
        <div className="mt-4">
          <p role="alert">{error ?? state.error}</p>
          <Button
            className="mt-3"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setError(null);
              setReload((v) => v + 1);
              state.refresh();
              reservation.refetch();
            }}
          >
            Consultar estado
          </Button>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy} onClick={onBack}>
          Revisar horario
        </Button>
        {current ? (
          <Button variant="secondary" disabled={busy} onClick={state.refresh}>
            Actualizar pago
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
