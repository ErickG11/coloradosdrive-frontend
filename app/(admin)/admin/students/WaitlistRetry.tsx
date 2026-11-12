"use client";
import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
export function WaitlistRetry() {
  const [type, setType] = useState("A"),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  async function retry() {
    if (!reason.trim()) {
      setMessage("Indica por qué reintentas los avisos fallidos.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<{ retried: number }>("/admin/estudiantes/espera/reintentar", {
        tipo: type,
        motivo: reason.trim(),
      });
      setMessage(
        `${result.retried} avisos vuelven a la cola. La entrega se confirmará por separado.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo confirmar el reintento.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mb-3">
      <summary>Reintentar avisos de apertura fallidos</summary>
      <div className="mt-3 grid gap-2">
        <Select label="Tipo de aviso" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="A">A</option>
          <option value="B">B</option>
        </Select>
        <Input
          label="Motivo del reintento"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button type="button" variant="secondary" isLoading={busy} onClick={() => void retry()}>
          Reintentar la cola
        </Button>
        {message ? <p role="status">{message}</p> : null}
      </div>
    </details>
  );
}
