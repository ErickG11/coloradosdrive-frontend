"use client";

import { useEffect, useState } from "react";
import { Button, FormError, Modal, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type {
  PracticeBlock,
  PracticeBlockMutation,
  PracticeBlockOption,
  PracticeBlockPreview,
} from "@/types/practiceBlock";
import { blockDate, blockEnd, blockTime, localDay } from "./blockFormat";
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
const range = (startsAt: string, endsAt: string) =>
  `${blockTime(startsAt)} – ${blockTime(endsAt)}`;

function BlockSummary({ block }: { block: AgendaBlock }) {
  return (
    <p className="text-sm text-text-secondary">
      {blockDate(block.startsAt)} · {range(block.startsAt, block.endsAt)} · {block.hours} h ·{" "}
      {block.instructorName}
    </p>
  );
}

export function BlockDialog({
  block,
  startAtCancel = false,
  onClose,
  onDone,
}: {
  block: AgendaBlock;
  startAtCancel?: boolean;
  onClose: () => void;
  onDone: (result?: PracticeBlockMutation) => Promise<void>;
}) {
  const [step, setStep] = useState<"options" | "cancel">(startAtCancel ? "cancel" : "options");
  const [preview, setPreview] = useState<PracticeBlockPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(startAtCancel);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const base = `/practice-slots/blocks/${block.enrollmentId}/${block.date}`;
  async function load() {
    try {
      setPreview(await api.get<PracticeBlockPreview>(`${base}/cancel-preview`));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function inspect() {
    setStep("cancel");
    setPreview(null);
    setError(null);
    setBusy(true);
    void load();
  }
  useEffect(() => {
    if (startAtCancel) void load();
    // Solo al abrir: la vista previa se consulta una vez por apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      className={styles.sheet}
    >
      <div className="flex flex-col gap-4">
        <BlockSummary block={block} />
        {step === "options" ? (
          <>
            {block.started ? (
              <p className={effectBox}>
                Este bloque ya comenzó. Para recuperar una falta, habla con la escuela o con tu
                instructor.
              </p>
            ) : !block.valid ? (
              <p className={effectBox}>
                Este día necesita revisión de la escuela antes de poder modificarlo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy || block.confirmed}
                  isLoading={busy}
                  onClick={() => {
                    void confirm();
                  }}
                >
                  {block.confirmed ? "Día confirmado" : "Confirmar día"}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={inspect}>
                  No podré asistir
                </Button>
              </div>
            )}
            <FormError>{error}</FormError>
            <p className={styles.hint}>
              Confirmar es opcional. Solo la asistencia registrada cuenta para tu certificación.
            </p>
          </>
        ) : (
          <>
            {busy && !preview ? (
              <p className="text-sm text-text-secondary" role="status">
                Revisando el efecto de tu aviso…
              </p>
            ) : null}
            {!busy && !preview ? (
              <>
                <FormError>{error}</FormError>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setStep("options")}>
                    Volver
                  </Button>
                  <Button onClick={inspect}>Volver a consultar</Button>
                </div>
              </>
            ) : null}
            {preview ? (
              <form
                onSubmit={(event) => {
                  void cancel(event);
                }}
                className="flex flex-col gap-4"
              >
                <p className="text-sm text-text-secondary">
                  Al confirmar, las {block.hours === 1 ? "1 hora" : `${block.hours} horas`} del día
                  quedarán liberadas para otros alumnos de tu cohorte.
                </p>
                <div className={effectBox} role="status">
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
                <div>
                  <Textarea
                    label="Explica el motivo de inasistencia"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={10}
                    required
                    disabled={busy || preview.started}
                    aria-describedby="block-reason-count"
                  />
                  <p id="block-reason-count" className="mt-1 text-xs text-text-secondary">
                    {reason.trim().length} caracteres · mínimo 10
                  </p>
                </div>
                <FormError>{error}</FormError>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setStep("options")}
                  >
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    isLoading={busy}
                    disabled={preview.started || !category || reason.trim().length < 10}
                  >
                    Confirmar que no asistiré
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

function groupTargets(options: PracticeBlockOption[]) {
  const groups = new Map<string, PracticeBlockOption[]>();
  for (const option of options) {
    const key = `${option.enrollmentId}:${option.startsAt}:${option.instructorId}:${option.hours}`;
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }
  return [...groups.values()].sort(
    (a, b) => Date.parse(a[0].startsAt) - Date.parse(b[0].startsAt),
  );
}
function ChoiceRows({
  groups,
  onChoose,
}: {
  groups: PracticeBlockOption[][];
  onChoose: (choices: PracticeBlockOption[]) => void;
}) {
  const [limit, setLimit] = useState(12);
  const days = new Map<string, PracticeBlockOption[][]>();
  for (const group of groups.slice(0, limit)) {
    const key = localDay(group[0].startsAt);
    days.set(key, [...(days.get(key) ?? []), group]);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...days.entries()].map(([day, items]) => (
        <section key={day} className="flex flex-col gap-2">
          <h4 className={styles.panelDate}>{blockDate(items[0][0].startsAt)}</h4>
          {items.map((group) => {
            const o = group[0];
            return (
              <article
                key={o.id}
                className={styles.availableSlot}
                data-tone={o.cost === 0 ? "warning" : "info"}
              >
                <div>
                  <strong>
                    {range(o.startsAt, o.endsAt)}
                  </strong>
                  <p className={styles.hint}>
                    {o.hours} h · {o.instructorName}
                  </p>
                  <p className={styles.hint}>
                    {o.cost === 0 ? "Reponer (sin costo)" : "Cambiar (consume 1 reprogramación)"}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => onChoose(group)}>
                  Elegir bloque
                </Button>
              </article>
            );
          })}
        </section>
      ))}
      {limit < groups.length ? (
        <Button variant="ghost" onClick={() => setLimit((n) => n + 12)}>
          Ver más horarios ({groups.length - limit})
        </Button>
      ) : null}
    </div>
  );
}

// Selector de reposición: primero los cupos liberados; los bloques libres del instructor,
// agrupados por fecha y colapsados.
export function ReplacementDialog({
  options,
  loading,
  error,
  onChoose,
  onRefresh,
  onClose,
}: {
  options: PracticeBlockOption[];
  loading: boolean;
  error: string | null;
  onChoose: (choices: PracticeBlockOption[]) => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const released = groupTargets(options.filter((o) => o.kind === "released"));
  const own = groupTargets(options.filter((o) => o.kind === "instructor_free"));
  const others = groupTargets(options.filter((o) => o.kind === "other_free"));
  return (
    <Modal isOpen title="Elige el bloque para reponer" onClose={onClose} className={styles.sheet}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Reponer no consume otra reprogramación. Elige un bloque completo con un solo instructor.
        </p>
        <FormError>{error}</FormError>
        {loading && !options.length ? (
          <p className="text-sm text-text-secondary" role="status">
            Actualizando los bloques disponibles…
          </p>
        ) : !options.length ? (
          <>
            <p className={styles.emptyAgenda}>
              No hay bloques disponibles para esta reposición en este momento.
            </p>
            <Button variant="secondary" onClick={onRefresh}>
              Actualizar opciones
            </Button>
          </>
        ) : (
          <>
            {released.length ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Cupos liberados por otros alumnos</h3>
                <ChoiceRows groups={released} onChoose={onChoose} />
              </section>
            ) : null}
            {own.length ? (
              <details className={styles.previous}>
                <summary>
                  Otros horarios libres de tu instructor <span>({own.length})</span>
                </summary>
                <ChoiceRows groups={own} onChoose={onChoose} />
              </details>
            ) : null}
            {others.length ? (
              <details className={styles.previous}>
                <summary>
                  Horarios de otros instructores <span>({others.length})</span>
                </summary>
                <ChoiceRows groups={others} onChoose={onChoose} />
              </details>
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
      className={styles.sheet}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <p className="text-sm text-text-secondary">
          {blockDate(target.startsAt)} · {range(target.startsAt, target.endsAt)} · {target.hours} h ·{" "}
          {target.instructorName}
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
                  ? `${blockDate(o.sourceStartsAt)} · ${range(o.sourceStartsAt, blockEnd(o.sourceStartsAt, o.hours))}`
                  : "Bloque pendiente"}
              </option>
            ))}
          </Select>
        ) : null}
        {option ? (
          <p className={effectBox}>
            {option.cost === 0
              ? `Vas a reponer el bloque con ${option.instructorName}. No consumirá otra reprogramación.`
              : `Vas a cambiar tu bloque del ${blockDate(option.sourceStartsAt!)} por este horario. Consumirá 1 reprogramación y te quedará ${option.remaining}.`}
          </p>
        ) : null}
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" isLoading={busy} disabled={!option}>
            {target.cost === 0 ? "Confirmar reposición" : "Confirmar cambio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
