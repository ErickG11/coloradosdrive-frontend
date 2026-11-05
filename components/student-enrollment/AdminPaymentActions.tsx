"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { adminPaymentApi, paymentError, paymentMoney } from "@/lib/api/studentPayment";
import type { AdminPaymentData } from "@/types/studentPayment";
export function AdminPaymentActions({
  studentId,
  active,
  onChanged,
}: {
  studentId: string;
  active: boolean;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<AdminPaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"efectivo" | "liberar" | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const attempt = useRef<string | null>(null);
  const mutation = useRef(false);
  useEffect(() => {
    let cancelled = false;
    adminPaymentApi
      .get(studentId)
      .then((v) => {
        if (!cancelled) {
          setData(v);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(paymentError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, reload]);
  const reservation = data?.reserva;
  const held = reservation?.estado === "vigente" || reservation?.estado === "pago_en_curso";
  const unresolved = data?.pagos.some((p) => p.estado === "pendiente" || p.estado === "revision");
  async function confirm() {
    if (!reservation || !action || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (action === "efectivo") {
        attempt.current ??= crypto.randomUUID();
        const payment = await adminPaymentApi.cash(
          studentId,
          reservation.id,
          attempt.current,
          receipt,
        );
        setMessage(
          payment.estado === "aprobado"
            ? "Pago en efectivo registrado. La matrícula está activa."
            : payment.estado === "revision"
              ? "Se conservó el pago en revisión. No lo registres otra vez."
              : "El pago sigue pendiente. Consulta el estado antes de repetir.",
        );
      } else {
        await adminPaymentApi.release(reservation.id);
        setMessage("Reserva liberada.");
      }
      setAction(null);
      setReload((v) => v + 1);
      onChanged?.();
    } catch (e) {
      setError(paymentError(e));
      setReload((v) => v + 1);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  return (
    <Card title="Pago y reserva de inscripción">
      {!data && !error ? <p role="status">Consultando pagos…</p> : null}
      {data?.pagos.length ? (
        <ul className="grid gap-3">
          {data.pagos.map((p) => (
            <li key={p.id} className="rounded-sm border border-border p-3">
              <p className="font-semibold">
                {paymentMoney(p.total_centavos)} · {p.proveedor} ·{" "}
                {p.estado === "revision"
                  ? "En revisión"
                  : p.estado === "aprobado"
                    ? "Confirmado"
                    : p.estado === "rechazado"
                      ? "Rechazado"
                      : "Pendiente"}
              </p>
              <p className="break-all text-sm text-text-secondary">{p.id}</p>
              {p.estado === "revision" ? (
                <p className="mt-2 text-status-warning">
                  Dinero recibido: {paymentMoney(p.recibido_centavos ?? 0)}. Revisa el caso antes de
                  otro cobro.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : data ? (
        <p>No hay pagos registrados.</p>
      ) : null}
      {data?.cotizacion ? (
        <p className="mt-4 font-semibold">
          Total a recibir: {paymentMoney(data.cotizacion.totalCentavos)}
        </p>
      ) : null}
      {held && reservation ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={!active || busy || !!unresolved || !data?.cotizacion}
            onClick={() => setAction("efectivo")}
          >
            Registrar pago en efectivo
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !!unresolved}
            onClick={() => setAction("liberar")}
          >
            Liberar reserva
          </Button>
        </div>
      ) : null}
      {action ? (
        <div className="mt-4 rounded-sm border border-border p-4">
          <p>
            {action === "efectivo"
              ? "Confirma que recibiste el importe completo mostrado. Se activarán la cuenta, la matrícula y el horario."
              : "Se liberarán todas las franjas y el cupo; esta acción no anula pagos."}
          </p>
          {action === "efectivo" ? (
            <Input
              label="Referencia del comprobante (opcional)"
              maxLength={160}
              className="mt-3"
              value={receipt}
              disabled={busy}
              onChange={(e) => setReceipt(e.target.value)}
            />
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button isLoading={busy} onClick={() => void confirm()}>
              Confirmar
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="mt-4">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4">
          {error}
        </p>
      ) : null}
      <Button
        className="mt-4"
        variant="secondary"
        disabled={busy}
        onClick={() => setReload((v) => v + 1)}
      >
        Actualizar pagos
      </Button>
    </Card>
  );
}
