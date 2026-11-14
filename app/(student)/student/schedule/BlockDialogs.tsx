"use client";

import { useEffect, useState } from "react";
import { Button, FormError, Modal, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type {
  PracticeBlock,
  PracticeBlockOption,
  PracticeBlockResolution,
  PracticeBlockResolutionPreview,
} from "@/types/practiceBlock";
import { blockDate, blockTime } from "./blockFormat";
import styles from "./schedule.module.css";

export type AgendaBlock = PracticeBlock & {
  instructorName: string;
  valid: boolean;
  status: string;
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No pudimos completar esta acción. Intenta de nuevo.";
const categories = {
  salud: "Salud",
  trabajo: "Trabajo",
  estudios: "Estudios",
  familiar: "Motivos familiares",
  transporte: "Transporte",
  otro: "Otro motivo",
};
const effectBox =
  "rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm text-text-primary";
const range = (startsAt: string, endsAt: string) => `${blockTime(startsAt)} – ${blockTime(endsAt)}`;

// Un solo paso: cambiar a otra hora del mismo día con el mismo instructor, o avisar la falta.
export function BlockDialog({
  block,
  onClose,
  onDone,
}: {
  block: AgendaBlock;
  onClose: () => void;
  onDone: (result: PracticeBlockResolution) => Promise<void>;
}) {
  const [preview, setPreview] = useState<PracticeBlockResolutionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"mover" | "falta" | null>(null);
  const [start, setStart] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const base = `/practice-slots/blocks/${block.enrollmentId}/${block.date}`;
  async function load() {
    try {
      const value = await api.get<PracticeBlockResolutionPreview>(`${base}/resolution-preview`);
      setPreview(value);
      setError(null);
      setAction((current) => current ?? (value.started ? null : value.canMove ? null : "falta"));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  function reload() {
    setLoading(true);
    setError(null);
    void load();
  }
  useEffect(() => {
    // Se consulta una vez por apertura; el estado solo cambia cuando responde el servidor.
    let alive = true;
    api.get<PracticeBlockResolutionPreview>(`${base}/resolution-preview`).then(
      (value) => {
        if (!alive) return;
        setPreview(value);
        setError(null);
        setAction((current) => current ?? (value.started ? null : value.canMove ? null : "falta"));
        setLoading(false);
      },
      (e: unknown) => {
        if (!alive) return;
        setError(message(e));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [base]);
  const ready =
    Boolean(preview) &&
    !preview?.started &&
    action !== null &&
    (action === "falta" || start !== "") &&
    category !== "" &&
    reason.trim().length >= 10;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy || action === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<PracticeBlockResolution>(`${base}/resolve`, {
        accion: action,
        ...(action === "mover" ? { inicio: start } : {}),
        motivoCategoria: category,
        motivoTexto: reason.trim(),
      });
      await onDone(result);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Avisar que no asistirás"
      className={styles.sheet}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          {blockDate(block.startsAt)} · tu bloque {range(block.startsAt, block.endsAt)} con{" "}
          {block.instructorName}
        </p>
        {loading ? (
          <p className="text-sm text-text-secondary" role="status">
            Revisando tus opciones…
          </p>
        ) : null}
        {!loading && !preview ? (
          <>
            <FormError>{error}</FormError>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={reload}>Volver a consultar</Button>
            </div>
          </>
        ) : null}
        {preview?.started ? (
          <>
            <p className={effectBox}>
              Este bloque ya comenzó y no se puede avisar desde la plataforma. Para recuperar una
              falta, habla con la escuela o con tu instructor.
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : null}
        {preview && !preview.started ? (
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
            className="flex flex-col gap-4"
          >
            <fieldset className="flex flex-col gap-3" disabled={busy}>
              <legend className="mb-1 text-sm font-medium">¿Qué necesitas?</legend>
              {preview.canMove ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="resolution"
                    checked={action === "mover"}
                    onChange={() => setAction("mover")}
                  />
                  <span>
                    <strong>Cambiar a otra hora ese mismo día</strong>
                    <span className="block text-text-secondary">Con tu mismo instructor.</span>
                  </span>
                </label>
              ) : (
                <p className={effectBox}>
                  No puedes cambiar de hora: {preview.moveReason ?? "no hay horas disponibles."}
                </p>
              )}
              {action === "mover" && preview.canMove ? (
                <div className="flex flex-col gap-2 pl-6">
                  <p className="text-sm text-text-secondary">Elige la nueva hora:</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Horas libres">
                    {preview.freeHours.map((hour) => (
                      <button
                        key={hour.startsAt}
                        type="button"
                        role="radio"
                        aria-checked={start === hour.startsAt}
                        data-selected={start === hour.startsAt || undefined}
                        className="rounded-md border border-border px-3 py-1.5 text-sm tabular-nums data-[selected]:border-brand data-[selected]:bg-bg-sunken data-[selected]:font-semibold"
                        onClick={() => setStart(hour.startsAt)}
                      >
                        {range(hour.startsAt, hour.endsAt)}
                      </button>
                    ))}
                  </div>
                  <p className={effectBox}>{preview.effectMove}</p>
                </div>
              ) : null}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="resolution"
                  checked={action === "falta"}
                  onChange={() => setAction("falta")}
                />
                <span>
                  <strong>No puedo ese día</strong>
                  <span className="block text-text-secondary">
                    Se registra como falta. No usa reprogramaciones.
                  </span>
                </span>
              </label>
              {action === "falta" ? (
                <p className={`${effectBox} ml-6`} role="status">
                  {preview.effectAbsence}
                </p>
              ) : null}
            </fieldset>
            <Select
              label="Motivo de inasistencia"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              disabled={busy}
            >
              <option value="">Selecciona un motivo</option>
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <div>
              <Textarea
                label="Explica el motivo de inasistencia"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                required
                disabled={busy}
                aria-describedby="block-reason-count"
              />
              <p id="block-reason-count" className="mt-1 text-xs text-text-secondary">
                {reason.trim().length} caracteres · mínimo 10
              </p>
            </div>
            <FormError>{error}</FormError>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" isLoading={busy} disabled={!ready}>
                Confirmar
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Modal>
  );
}

// Cupo liberado de otro alumno: mismo día, mismo instructor; suelta el bloque propio de ese día.
export function TakeBlockDialog({
  option,
  onClose,
  onDone,
}: {
  option: PracticeBlockOption;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = option.sourceStartsAt;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/practice-slots/blocks/${option.enrollmentId}/take`, { optionId: option.id });
      await onDone();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Confirmar cambio de bloque"
      className={styles.sheet}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <p className="text-sm text-text-secondary">
          {blockDate(option.startsAt)} · con {option.instructorName}
        </p>
        <p className={effectBox}>
          Cambiarás tu bloque{" "}
          {source
            ? range(source, new Date(Date.parse(source) + option.hours * 3600000).toISOString())
            : ""}{" "}
          por {range(option.startsAt, option.endsAt)}. Consumirá 1 reprogramación; te quedará{" "}
          {option.remaining}.
        </p>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" isLoading={busy}>
            Confirmar cambio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
