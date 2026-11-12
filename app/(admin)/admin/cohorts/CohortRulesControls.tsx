"use client";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
export interface CohortRulesConfig {
  active: boolean;
  serverNow?: string;
  vehiculos?: number | null;
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
  const [fleet, setFleet] = useState(String(config.vehiculos ?? ""));
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save(kind: "precio" | "vehiculos", tipo?: "A" | "B") {
    if (!reason.trim()) {
      setMessage("Escribe el motivo del cambio.");
      return;
    }
    const raw =
      kind === "vehiculos"
        ? fleet
        : (prices[tipo!] ??
          String((config.prices?.find((p) => p.tipo === tipo)?.centavos ?? 0) / 100));
    const value = Number(raw);
    if (
      !raw?.trim() ||
      !Number.isFinite(value) ||
      value < 0 ||
      (kind === "vehiculos" && !Number.isInteger(value))
    ) {
      setMessage("Escribe un valor válido.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (kind === "vehiculos") {
        const result = await api.patch<{ horasSobreLimite: number }>(
          "/cohorts/configuracion/vehiculos",
          { cantidad: value, motivo: reason.trim() },
        );
        setMessage(
          `Configuración guardada. ${result.horasSobreLimite} horas superan el límite; las prácticas se conservan.`,
        );
      } else {
        await api.patch("/cohorts/configuracion/precio", {
          tipo,
          centavos: Math.round(value * 100),
          motivo: reason.trim(),
        });
        setMessage("Precio guardado. Las reservas y pagos anteriores conservan su importe.");
      }
      onUpdated();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar. Recarga antes de reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!config.active) return null;
  return (
    <fieldset className="grid gap-3 rounded-sm border p-4" disabled={busy}>
      <legend>Configuración global de inscripción</legend>
      <p>
        El precio es único por tipo. Los vehículos limitan las prácticas simultáneas de todas las
        cohortes.
      </p>
      <Input
        label="Motivo del cambio de configuración"
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
                max={9999.99}
                step="0.01"
                value={prices[p.tipo] ?? String(p.centavos / 100)}
                onChange={(e) => setPrices((v) => ({ ...v, [p.tipo]: e.target.value }))}
              />
              <Button type="button" variant="secondary" onClick={() => void save("precio", p.tipo)}>
                Guardar precio {p.tipo}
              </Button>
            </div>
          ))
        : null}
      {config.pricesActive && config.prices?.length !== 2 ? (
        <p role="status">La carga inicial de precios requiere el script de datos revisado.</p>
      ) : null}
      {config.capacityActive ? (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Vehículos disponibles globales"
            type="number"
            min={0}
            max={1000}
            step={1}
            value={fleet}
            onChange={(e) => setFleet(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={() => void save("vehiculos")}>
            Guardar vehículos
          </Button>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </fieldset>
  );
}
