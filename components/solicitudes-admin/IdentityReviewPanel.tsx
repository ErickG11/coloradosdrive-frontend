"use client";
import { useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { RequestReviewState } from "@/types/requestReview";
import type { SolicitudAdminDetalle } from "@/types/inscripcion";
import { ETIQUETA_METODO } from "./catalogo";
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
  const [type, setType] = useState("identidad"),
    [method, setMethod] = useState("registro_civil_portal"),
    [mode, setMode] = useState("web"),
    [result, setResult] = useState("verificado"),
    [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [reason, setReason] = useState(""),
    [revokeConfirm, setRevokeConfirm] = useState(false);
  async function claim() {
    setBusy(true);
    setMessage("");
    try {
      await api.post(`${root}/revision/reclamar`, {});
      review.refetch();
      onChanged();
      setMessage("Revisión reclamada. Renueva antes del vencimiento para continuar.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo reclamar.");
      review.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (!review.data?.token || !note.trim()) {
      setMessage("Reclama la revisión y escribe la observación.");
      return;
    }
    if (mode === "presencial" && !file) {
      setMessage("Adjunta el escaneo presencial.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      for (const [key, value] of Object.entries({
        token: review.data.token,
        tipo: type,
        metodo: method,
        resultado: result,
        nota: note.trim(),
        mode,
      }))
        data.append(key, value);
      if (mode === "presencial" && file) data.append("archivo", file);
      await api.post(`${root}/revision/verificar`, data, { signal: AbortSignal.timeout(30_000) });
      setMessage("Verificación registrada con trazabilidad.");
      setNote("");
      setFile(null);
      review.refetch();
      onChanged();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "No se pudo confirmar el resultado. Recarga antes de repetir.",
      );
    } finally {
      setBusy(false);
    }
  }
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
  if (!review.data) return <p role="status">Consultando revisión…</p>;
  return (
    <section
      className="my-4 grid gap-3 rounded-sm border p-4"
      aria-label="Revisión exclusiva y archivo"
    >
      <h3 className="font-medium">Revisión y trazabilidad</h3>
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
      {detail.estado === "enviada" ? (
        <>
          <p>
            {review.data.owned
              ? "Tienes la revisión temporal."
              : "Reclama la revisión para verificar y decidir. Otro revisor no puede decidir mientras esté vigente."}
            {review.data.until
              ? ` Vence: ${new Date(review.data.until).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })} (Guayaquil).`
              : ""}
          </p>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void claim()}>
            {review.data.owned ? "Renovar revisión" : "Reclamar revisión"}
          </Button>
          <fieldset className="grid gap-3" disabled={!review.data.owned || busy}>
            <Select
              label="Tipo de verificación"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="identidad">Identidad</option>
              <option value="estudios">Estudios</option>
            </Select>
            <Select
              label="Modo de verificación"
              value={mode}
              onChange={(e) => {
                const next = e.target.value;
                setMode(next);
                setFile(null);
                setMethod(
                  next === "presencial"
                    ? "original_presencial"
                    : next === "documento_homologado"
                      ? "revision_visual"
                      : "registro_civil_portal",
                );
              }}
            >
              <option value="web">Web</option>
              <option value="presencial">Presencial con escaneo</option>
              <option value="documento_homologado">Documento homologado</option>
            </Select>
            <Select
              label="Método utilizado"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {Object.entries(ETIQUETA_METODO)
                .filter(
                  ([key]) =>
                    key !== "registro_civil_web_service" &&
                    (mode === "presencial"
                      ? key === "original_presencial"
                      : key !== "original_presencial"),
                )
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </Select>
            <Select label="Resultado" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="verificado">Verificado</option>
              <option value="no_coincide">No coincide</option>
              <option value="no_encontrado">No encontrado</option>
            </Select>
            <Textarea
              label="Observación obligatoria"
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {mode === "presencial" ? (
              <Input
                label="Escaneo presencial (PDF, JPG o PNG, hasta 2 MiB)"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            ) : null}
            <Button
              type="button"
              disabled={!note.trim() || (mode === "presencial" && !file)}
              onClick={() => void verify()}
            >
              Registrar verificación
            </Button>
          </fieldset>
        </>
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
