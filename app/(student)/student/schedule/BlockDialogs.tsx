"use client";

import { useState } from "react";
import { Button, FormError, Modal, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type {
  PracticeBlock,
  PracticeBlockMutation,
  PracticeBlockOption,
  PracticeBlockPreview,
} from "@/types/practiceBlock";
import { blockDate, blockTime, blockEnd } from "./blockFormat";
import styles from "./blocks.module.css";
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

export function BlockDialog({
  block,
  onClose,
  onDone,
}: {
  block: AgendaBlock;
  onClose: () => void;
  onDone: (result?: PracticeBlockMutation) => Promise<void>;
}) {
  const [step, setStep] = useState<"options" | "cancel">("options");
  const [preview, setPreview] = useState<PracticeBlockPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const base = `/practice-slots/blocks/${block.enrollmentId}/${block.date}`;
  async function inspect() {
    setStep("cancel");
    setPreview(null);
    setError(null);
    setBusy(true);
    try {
      setPreview(await api.get<PracticeBlockPreview>(`${base}/cancel-preview`));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`${base}/confirm`);
      await onDone();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function cancel(event: React.FormEvent) {
    event.preventDefault();
    if (!preview || preview.started || !category || reason.trim().length < 10 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<PracticeBlockMutation>(`${base}/cancel`, {
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
      title={step === "cancel" ? "Avisar que no asistirás" : "Opciones de práctica"}
    >
      <div className={styles.dialog}>
        <p className={styles.day}>{blockDate(block.startsAt)}</p>
        <p className={styles.bigTime}>
          {blockTime(block.startsAt)}–{blockTime(block.endsAt)}
        </p>
        <p>
          {block.hours} h · {block.instructorName}
        </p>
        {error ? <FormError>{error}</FormError> : null}
        {step === "options" ? (
          <>
            {block.started ? (
              <p>
                Este bloque ya comenzó. Para recuperar una falta, habla con la escuela o con tu
                instructor.
              </p>
            ) : !block.valid ? (
              <FormError>
                Este día necesita revisión de la escuela antes de poder modificarlo.
              </FormError>
            ) : (
              <div className={styles.actions}>
                <Button
                  onClick={() => {
                    void confirm();
                  }}
                  disabled={busy || block.confirmed}
                >
                  {block.confirmed ? "Día confirmado" : "Confirmar día"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void inspect();
                  }}
                  disabled={busy}
                >
                  No podré asistir
                </Button>
              </div>
            )}
            <p className={styles.hint}>
              Confirmar es opcional. Solo la asistencia registrada por tu instructor cuenta para tu
              certificación.
            </p>
          </>
        ) : (
          <>
            {busy && !preview ? <p role="status">Revisando el efecto de tu aviso…</p> : null}
            {!busy && !preview ? (
              <Button
                onClick={() => {
                  void inspect();
                }}
              >
                Volver a consultar
              </Button>
            ) : null}
            {preview ? (
              <form
                onSubmit={(event) => {
                  void cancel(event);
                }}
                className={styles.dialog}
              >
                <div className={styles.effect} role="status">
                  <strong>
                    {preview.result === "falta"
                      ? "Este aviso se registrará como FALTA"
                      : preview.result === "hora_perdida"
                        ? "Este bloque no se podrá reponer"
                        : "Reprogramación de un bloque completo"}
                  </strong>
                  <p>{preview.effect}</p>
                </div>
                <Select
                  label="Motivo de inasistencia"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  disabled={busy || preview.started}
                  autoFocus
                >
                  <option value="">Selecciona un motivo</option>
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Textarea
                  label="Explica el motivo"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={10}
                  required
                  disabled={busy || preview.started}
                  aria-describedby="block-reason-help"
                />
                <p id="block-reason-help" className={styles.hint}>
                  Escribe al menos 10 caracteres. El aviso incluye las {block.hours} h del día.
                </p>
                <div className={styles.actions}>
                  <Button
                    type="submit"
                    disabled={busy || preview.started || !category || reason.trim().length < 10}
                  >
                    {busy ? "Registrando aviso…" : "Registrar aviso"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setStep("options")}
                  >
                    Volver
                  </Button>
                </div>
              </form>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}

export function TakeBlockDialog({
  choices,
  onClose,
  onDone,
}: {
  choices: PracticeBlockOption[];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(choices.length === 1 ? choices[0].id : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const option = choices.find((o) => o.id === selected);
  const target = choices[0];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!option || busy) return;
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
      title={target.cost === 0 ? "Confirmar reposición" : "Confirmar cambio de bloque"}
    >
      <form
        className={styles.dialog}
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <p className={styles.day}>{blockDate(target.startsAt)}</p>
        <p className={styles.bigTime}>
          {blockTime(target.startsAt)}–{blockTime(target.endsAt)}
        </p>
        <p>
          {target.hours} h · {target.instructorName}
        </p>
        {target.cost === 1 ? (
          <Select
            label="Bloque que vas a soltar"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            required
            disabled={busy}
            autoFocus
          >
            <option value="">Elige el día que cambiarás</option>
            {choices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.sourceStartsAt
                  ? `${blockDate(o.sourceStartsAt)} · ${blockTime(o.sourceStartsAt)}–${blockTime(blockEnd(o.sourceStartsAt, o.hours))}`
                  : "Bloque pendiente"}
              </option>
            ))}
          </Select>
        ) : null}
        {option ? (
          <p className={styles.effect}>
            {option.cost === 0
              ? `Vas a reponer el bloque con ${option.instructorName}. No consumirá otra reprogramación.`
              : `Vas a cambiar tu bloque del ${blockDate(option.sourceStartsAt!)} por este horario. Consumirá 1 reprogramación y te quedarán ${option.remaining}.`}
          </p>
        ) : null}
        {error ? <FormError>{error}</FormError> : null}
        <Button type="submit" disabled={busy || !option}>
          {busy
            ? "Reservando bloque…"
            : target.cost === 0
              ? "Confirmar reposición"
              : "Confirmar cambio"}
        </Button>
      </form>
    </Modal>
  );
}
