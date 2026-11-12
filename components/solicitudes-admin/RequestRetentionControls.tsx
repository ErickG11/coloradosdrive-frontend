"use client";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { RequestRetentionPolicy } from "@/types/requestReview";
export function RequestRetentionControls() {
  const state = useFetch<{ active: boolean; policy?: RequestRetentionPolicy }>(
    "/admin/solicitudes/politica-retencion",
  );
  const [draft, setDraft] = useState<RequestRetentionPolicy | null>(null),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const policy = draft ?? state.data?.policy;
  async function save() {
    if (!policy) return;
    setBusy(true);
    setMessage("");
    try {
      await api.patch("/admin/solicitudes/politica-retencion", { policy, reason });
      setDraft(null);
      state.refetch();
      setMessage("Política guardada con auditoría.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  if (state.data?.active === false) return null;
  if (state.error) return <p role="alert">{state.error}</p>;
  if (!policy) return null;
  const fields = [
    ["borradorDias", "Borradores"],
    ["devueltaDias", "Devueltas sin corregir"],
    ["certificadoVerificadoDias", "Archivos verificados y escaneos"],
    ["huerfanoDias", "Objetos huérfanos"],
    ["rechazadaDias", "Rechazadas"],
  ] as const;
  return (
    <details className="my-4 rounded-sm border p-3">
      <summary>Retención de solicitudes</summary>
      <p>
        Valores iniciales conservan el comportamiento actual. Rechazadas vacío hereda la
        configuración vigente del servidor; aprobadas y archivadas nunca se eliminan.
      </p>
      <fieldset className="mt-3 grid gap-3 sm:grid-cols-2" disabled={busy}>
        {fields.map(([key, label]) => (
          <Input
            key={key}
            label={`${label} (días)`}
            type="number"
            min={1}
            max={3650}
            value={policy[key] ?? ""}
            onChange={(e) =>
              setDraft({ ...policy, [key]: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        ))}
        <Input
          label="Motivo del cambio de retención"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button type="button" disabled={!reason.trim()} onClick={() => void save()}>
          Guardar retención
        </Button>
      </fieldset>
      {message ? <p role="status">{message}</p> : null}
    </details>
  );
}
