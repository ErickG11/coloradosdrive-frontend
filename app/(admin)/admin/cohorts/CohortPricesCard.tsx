"use client";
import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import { CohortIcon } from "./CohortVisual";
import styles from "./cohorts.module.css";

export interface CohortRulesConfig {
  active: boolean;
  serverNow?: string;
  prices?: { tipo: "A" | "B"; centavos: number }[];
  pricesActive?: boolean;
  capacityActive?: boolean;
}
export function CohortPricesCard() {
  const config = useFetch<CohortRulesConfig>("/cohorts/configuracion");
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const data = config.data;
  function close() {
    if (!busy) {
      setSelected(null);
      setMessage(null);
      setReason("");
      setPrice("");
    }
  }
  async function save() {
    const value = Number(price),
      centavos = Math.round(value * 100);
    if (
      !selected ||
      !price.trim() ||
      !Number.isFinite(value) ||
      value < 0 ||
      centavos > 999999 ||
      Math.abs(value * 100 - centavos) > 1e-7
    ) {
      setMessage("Escribe un precio válido con hasta dos decimales.");
      return;
    }
    if (!reason.trim()) {
      setMessage("Escribe el motivo del cambio.");
      return;
    }
    if (data?.prices?.find((p) => p.tipo === selected)?.centavos === centavos) {
      setMessage("No hay cambios que guardar.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.patch("/cohorts/configuracion/precio", {
        tipo: selected,
        centavos,
        motivo: reason.trim(),
      });
      config.refetch();
      setSelected(null);
      setReason("");
      setPrice("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el precio.");
      config.refetch();
    } finally {
      setBusy(false);
    }
  }
  if (config.error) return <p role="alert">{config.error}</p>;
  if (!data?.active || !data.pricesActive) return null;
  return (
    <section
      aria-label="Precios por tipo de curso"
      className="my-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
    >
      {(["A", "B"] as const).map((tipo) => {
        const current = data.prices?.find((p) => p.tipo === tipo);
        return (
          <div className={styles.summaryItem} key={tipo}>
            <span className={styles.summaryIcon}>
              <CohortIcon name={tipo === "A" ? "motorcycle" : "car"} />
            </span>
            <div className="min-w-0 flex-1">
              <strong>{current ? `$${(current.centavos / 100).toFixed(2)}` : "—"}</strong>
              <span>Precio Tipo {tipo}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!current}
              aria-label={`Editar precio Tipo ${tipo}`}
              onClick={() => {
                setSelected(tipo);
                setPrice(String((current?.centavos ?? 0) / 100));
                setReason("");
                setMessage(null);
              }}
            >
              Editar
            </Button>
          </div>
        );
      })}
      <Modal
        isOpen={selected !== null}
        title={`Editar precio Tipo ${selected ?? ""}`}
        onClose={close}
      >
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Input
            label="Nuevo precio (USD)"
            type="number"
            min={0}
            max={9999.99}
            step="0.01"
            value={price}
            disabled={busy}
            required
            onChange={(event) => setPrice(event.target.value)}
          />
          <Input
            label="Motivo del cambio"
            value={reason}
            maxLength={500}
            disabled={busy}
            required
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-sm text-text-secondary">
            Las reservas y pagos anteriores conservan su importe.
          </p>
          {message ? <p role="alert">{message}</p> : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={busy}>
              Guardar precio
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
