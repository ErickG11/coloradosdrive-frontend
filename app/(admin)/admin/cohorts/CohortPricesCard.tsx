"use client";
import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";

export interface CohortRulesConfig {
  active: boolean;
  serverNow?: string;
  prices?: { tipo: "A" | "B"; centavos: number }[];
  pricesActive?: boolean;
  capacityActive?: boolean;
}

function usd(centavos: number): string {
  const value = centavos / 100;
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

// Precios por tipo de curso: tarjeta compacta sobre la lista; se editan en un modal pequeño.
// Misma API que antes (PATCH /cohorts/configuracion/precio, un tipo por llamada).
export function CohortPricesCard() {
  const config = useFetch<CohortRulesConfig>("/cohorts/configuracion");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const data = config.data;
  if (!data?.active || !data.pricesActive) return null;
  const list = data.prices ?? [];

  function close() {
    if (busy) return;
    setOpen(false);
    setMessage(null);
    setReason("");
    setPrices({});
  }

  async function save() {
    const changes: { tipo: "A" | "B"; centavos: number }[] = [];
    for (const p of list) {
      const raw = prices[p.tipo];
      if (raw === undefined) continue;
      const value = Number(raw);
      if (
        !raw.trim() ||
        !Number.isFinite(value) ||
        value < 0 ||
        Math.abs(value * 100 - Math.round(value * 100)) > 1e-7
      ) {
        setMessage("Escribe un precio válido.");
        return;
      }
      if (Math.round(value * 100) !== p.centavos)
        changes.push({ tipo: p.tipo, centavos: Math.round(value * 100) });
    }
    if (!changes.length) {
      setMessage("No hay cambios que guardar.");
      return;
    }
    if (!reason.trim()) {
      setMessage("Escribe el motivo del cambio.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      for (const change of changes)
        await api.patch("/cohorts/configuracion/precio", { ...change, motivo: reason.trim() });
      config.refetch();
      setBusy(false);
      setOpen(false);
      setReason("");
      setPrices({});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo guardar el precio.");
      config.refetch();
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Precios por tipo de curso"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-bg-surface p-4"
    >
      <p>
        <strong>Precios por tipo de curso:</strong>{" "}
        {list.length ? list.map((p) => `Tipo ${p.tipo} ${usd(p.centavos)}`).join(" · ") : "—"}
      </p>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Editar precios
      </Button>
      <Modal isOpen={open} title="Editar precios" onClose={close}>
        <fieldset className="grid gap-3" disabled={busy}>
          {list.map((p) => (
            <Input
              key={p.tipo}
              label={`Precio tipo ${p.tipo} (USD)`}
              type="number"
              min={0}
              max={9999999.99}
              step="0.01"
              value={prices[p.tipo] ?? String(p.centavos / 100)}
              onChange={(e) => setPrices((v) => ({ ...v, [p.tipo]: e.target.value }))}
            />
          ))}
          <Input
            label="Motivo del cambio"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-sm text-text-secondary">
            Las reservas y pagos anteriores conservan su importe.
          </p>
          {message ? <p role="status">{message}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" isLoading={busy} onClick={() => void save()}>
              Guardar
            </Button>
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </Modal>
    </section>
  );
}
