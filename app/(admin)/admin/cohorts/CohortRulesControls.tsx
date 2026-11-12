"use client";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
export interface CohortRulesConfig {
  active: boolean;
  serverNow?: string;
  prices?: { tipo: "A" | "B"; centavos: number }[];
  pricesActive?: boolean;
  capacityActive?: boolean;
}
export function CohortRulesControls({
  config,
  onUpdated,
}: {
  config: CohortRulesConfig;
  onUpdated: () => void;
}) {
  const [reason, setReason] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save(tipo: "A" | "B") {
    const raw =
      prices[tipo] ?? String((config.prices?.find((p) => p.tipo === tipo)?.centavos ?? 0) / 100);
    const value = Number(raw);
    if (
      !reason.trim() ||
      !raw.trim() ||
      !Number.isFinite(value) ||
      value < 0 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 1e-7
    ) {
      setMessage("Escribe un precio válido y el motivo del cambio.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.patch("/cohorts/configuracion/precio", {
        tipo,
        centavos: Math.round(value * 100),
        motivo: reason.trim(),
      });
      setMessage("Precio guardado. Reservas y pagos anteriores conservan su importe.");
      onUpdated();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo guardar el precio.");
    } finally {
      setBusy(false);
    }
  }
  if (!config.active) return null;
  return (
    <fieldset className="grid gap-3 rounded-sm border p-4" disabled={busy}>
      <legend>Precios por tipo de curso</legend>
      <Input
        label="Motivo del cambio"
        value={reason}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
      />
      {config.pricesActive
        ? config.prices?.map((p) => (
            <div key={p.tipo} className="flex flex-wrap items-end gap-3">
              <Input
                label={`Precio tipo ${p.tipo} (USD)`}
                type="number"
                min={0}
                max={9999999.99}
                step="0.01"
                value={prices[p.tipo] ?? String(p.centavos / 100)}
                onChange={(e) => setPrices((v) => ({ ...v, [p.tipo]: e.target.value }))}
              />
              <Button variant="secondary" onClick={() => void save(p.tipo)}>
                Guardar precio {p.tipo}
              </Button>
            </div>
          ))
        : null}
      {config.pricesActive && config.prices?.length !== 2 ? (
        <p>Completa la carga explícita de precios.</p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </fieldset>
  );
}
