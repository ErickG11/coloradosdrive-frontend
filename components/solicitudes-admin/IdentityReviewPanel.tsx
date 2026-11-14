"use client";
import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { RequestReviewState } from "@/types/requestReview";
import type { SolicitudAdminDetalle } from "@/types/inscripcion";
export function IdentityReviewPanel({
  detail,
  onChanged,
}: {
  detail: SolicitudAdminDetalle;
  onChanged: () => void;
}) {
  const root = `/admin/solicitudes/${detail.id}`;
  const review = useFetch<RequestReviewState>(`${root}/revision`);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [reason, setReason] = useState(""),
    [revokeConfirm, setRevokeConfirm] = useState(false);
  async function revoke() {
    if (!review.data?.updatedAt || !reason.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const state = await api.post<RequestReviewState>(`${root}/revision/revocar`, {
        updatedAt: review.data.updatedAt,
        reason: reason.trim(),
      });
      setMessage(
        state.paymentReview
          ? "Acceso bloqueado; pago conservado en revisión administrativa. No se ejecutó devolución."
          : "Cuenta desactivada y matrícula anulada. El expediente se conserva.",
      );
      setRevokeConfirm(false);
      review.refetch();
      onChanged();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "No se confirmó la revocación. Recarga antes de reintentar.",
      );
      review.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function scan(id: string) {
    setBusy(true);
    try {
      const data = await api.get<{ url: string }>(`${root}/verificaciones/${id}/escaneo`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo abrir el escaneo.");
    } finally {
      setBusy(false);
    }
  }
  async function retryEmail() {
    if (!reason.trim()) {
      setMessage("Escribe el motivo del reintento.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`${root}/revision/reintentar-correo`, { reason: reason.trim() });
      setMessage("Correo encolado para reintento; aún no consta como entregado.");
      review.refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo encolar el reintento.");
    } finally {
      setBusy(false);
    }
  }
  if (review.data?.active === false) return null;
  if (review.error)
    return (
      <p role="alert">
        {review.error}{" "}
        <Button type="button" onClick={review.refetch}>
          Consultar revisión
        </Button>
      </p>
    );
  if (!review.data) return null;
  const hayContenido =
    Boolean(review.data.archivedAt || review.data.revokedAt) ||
    detail.verificaciones.some((v) => v.scanAvailable) ||
    detail.estado === "aprobada" ||
    detail.estado === "archivada" ||
    (review.data.failedEmails ?? 0) > 0;
  if (!hayContenido) return null;
  return (
    <section
      className="my-4 grid gap-3 rounded-sm border p-4"
      aria-label="Expediente"
    >
      {review.data.archivedAt ? (
        <p>Expediente archivado y enlazado al alumno. Se conserva la solicitud y su evidencia.</p>
      ) : null}
      {review.data.revokedAt ? (
        <p role="status">
          Aprobación revocada.{" "}
          {review.data.paymentReview
            ? "Acceso bloqueado y pago en revisión; no hay devolución automática."
            : "Cuenta desactivada y matrícula anulada."}
        </p>
      ) : null}
      {detail.verificaciones
        .filter((v) => v.scanAvailable)
        .map((v) => (
          <Button
            key={v.id}
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void scan(v.id)}
          >
            Abrir escaneo de {v.tipo} ·{" "}
            {new Date(v.createdAt).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })}
          </Button>
        ))}
      {(detail.estado === "aprobada" || detail.estado === "archivada") && !review.data.revokedAt ? (
        <fieldset className="grid gap-3" disabled={busy}>
          <Textarea
            label="Motivo de revocación"
            maxLength={500}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setRevokeConfirm(false);
            }}
          />
          <p>
            Sin pago: desactiva la cuenta y anula la matrícula. Con pago: bloquea acceso y deja
            revisión administrativa; no devuelve dinero. Se conserva el expediente.
          </p>
          {!revokeConfirm ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!reason.trim()}
              onClick={() => setRevokeConfirm(true)}
            >
              Revisar revocación
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button type="button" variant="danger" onClick={() => void revoke()}>
                Confirmar revocación con motivo
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRevokeConfirm(false)}>
                Volver sin revocar
              </Button>
            </div>
          )}
        </fieldset>
      ) : null}
      {(review.data.failedEmails ?? 0) > 0 ? (
        <div className="grid gap-3">
          <p role="alert">
            Hay correos de estado atascados. Revisa el proveedor antes de reintentar.
          </p>
          <Input
            label="Motivo del reintento de correo"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="button" disabled={busy || !reason.trim()} onClick={() => void retryEmail()}>
            Reintentar correos del expediente
          </Button>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
