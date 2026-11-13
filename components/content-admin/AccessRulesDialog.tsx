"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FormError } from "@/components/ui/FormError";
import { contentApi } from "@/lib/api/content";
import {
  buildAccessPayload,
  contentErrorMessage,
  friendlyDate,
  ruleState,
  ruleToDraft,
} from "@/lib/utils/content";
import type {
  AccessDraft,
  AccessPayload,
  AccessRule,
  ContentScope,
  SubjectItem,
} from "@/types/content";
import type { Cohort } from "@/types/cohort";
import { ContentLoad } from "./ContentUI";
import { useContentMutation } from "./useContentResource";
import { AdminChip, ContentBanner, ContentTabs } from "./AdminContentUI";
import { useDraftChecks } from "./AccessDraftPreview";
import { useRequiredFields } from "./useRequiredFields";
import styles from "./admin-content.module.css";

type Person = { id: string; nombreCompleto: string; cohortId: string };
const empty: AccessDraft = {
  targetType: "cohorte",
  targetId: "",
  enabled: true,
  opens: "",
  closes: "",
  attempts: "",
  extra: "0",
  note: "",
};
function initialDraft(
  rules: AccessRule[],
  items: SubjectItem[],
  people: Person[],
  type: AccessDraft["targetType"],
  id: string,
): { draft: AccessDraft; warning: string } {
  const person = people.find((p) => p.id === id);
  const own = rules.filter(
    (r) => r.target_type === type && (type === "cohorte" ? r.cohort_id : r.student_id) === id,
  );
  const inherited =
    type === "estudiante" && own.length === 0
      ? rules.filter((r) => r.target_type === "cohorte" && r.cohort_id === person?.cohortId)
      : [];
  const source = own.length ? own : inherited;
  const signatures = new Set(
    source.map((rule) =>
      JSON.stringify({
        enabled: rule.habilitado,
        opens: rule.opens_at,
        closes: rule.closes_at,
        attempts: rule.max_attempts,
        extra: rule.extra_minutes,
        note: rule.note,
      }),
    ),
  );
  if (
    source.length > 0 &&
    signatures.size === 1 &&
    (items.length === 1 || source.length === items.length)
  )
    return {
      draft: { ...ruleToDraft(source[0]), targetType: type, targetId: id },
      warning: inherited.length
        ? "Se cargó la habilitación de su cohorte. Al guardar, será propia del alumno y reemplazará a la de la cohorte."
        : "Ya tiene una habilitación guardada; se cargaron sus valores.",
    };
  return {
    draft: { ...empty, targetType: type, targetId: id },
    warning: source.length
      ? "Este contenido tiene habilitaciones distintas. Lo que definas aquí reemplazará a todas."
      : "",
  };
}
export function AccessRulesDialog({
  scope,
  items,
  cohorts,
  names,
  initialStudent,
  draftNotice,
  onGoPublish,
  onClose,
  onSaved,
}: {
  scope: ContentScope;
  items: SubjectItem[];
  cohorts: Cohort[];
  names: Map<string, string>;
  initialStudent?: { id: string; attempts: number };
  /** Aviso cuando la materia o sus materiales siguen en borrador (datos que la pantalla ya carga). */
  draftNotice?: string | null;
  onGoPublish?: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [resource, setResource] = useState<{
    rules: AccessRule[];
    people: Person[];
    error: string | null;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<AccessDraft>(empty);
  const [search, setSearch] = useState("");
  const [warning, setWarning] = useState("");
  const [info, setInfo] = useState("");
  const [preview, setPreview] = useState<AccessPayload | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [today] = useState(() => new Date().toISOString());
  const required = useRequiredFields();
  const checks = useDraftChecks(draft);
  const action = useContentMutation();
  const itemKey = items.map((i) => i.id).join(",");
  useEffect(() => {
    let live = true;
    const ids = itemKey ? itemKey.split(",") : [];
    Promise.all([
      Promise.all(ids.map((id) => contentApi.rules(id))),
      contentApi.people(scope.courseId),
    ])
      .then(([lists, people]) => {
        if (!live) return;
        const rules = lists.flat();
        setResource({ rules, people, error: null });
        if (initialStudent) {
          const value = initialDraft(
            rules,
            ids.map((id) => ({ id }) as SubjectItem),
            people,
            "estudiante",
            initialStudent.id,
          );
          setDraft({ ...value.draft, enabled: true, attempts: String(initialStudent.attempts) });
          setWarning(value.warning);
        }
      })
      .catch((error: unknown) => {
        if (live) setResource({ rules: [], people: [], error: contentErrorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, [itemKey, scope.courseId, initialStudent, revision]);
  function choose(type: AccessDraft["targetType"], id: string) {
    required.clear("access-target");
    setPreview(null);
    setInfo("");
    const value = initialDraft(resource?.rules ?? [], items, resource?.people ?? [], type, id);
    setDraft(value.draft);
    setWarning(value.warning);
  }
  function edit(rule: AccessRule, block = false) {
    setPreview(null);
    setDraft({ ...ruleToDraft(rule), ...(block ? { enabled: false, closes: "" } : {}) });
    setWarning("Se cargó la habilitación existente. Al guardar se reemplazan sus valores.");
    setStep(1);
  }
  function next() {
    if (!required.check([{ id: "access-target", empty: draft.targetId === "" }])) return;
    setStep(2);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      next();
      return;
    }
    if (!required.check([{ id: "access-extra", empty: scope.hasExams && draft.extra.trim() === "" }]))
      return;
    try {
      setPreview(buildAccessPayload(scope, draft));
      action.setError(null);
    } catch (error: unknown) {
      action.setError(contentErrorMessage(error));
    }
  }
  async function apply() {
    if (!preview) return;
    const result = await action.run(
      () => contentApi.saveRule(preview),
      (value) => (value.changed ? `Habilitación actualizada: ${value.changed} elemento(s).` : ""),
    );
    if (result.ok) {
      setPreview(null);
      if (result.value.changed) onSaved();
      else setInfo("0 cambios: la configuración ya era igual. No se enviaron avisos.");
    }
  }
  const available = (resource?.people ?? []).filter(
    (person) =>
      person.nombreCompleto
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")) || person.id === draft.targetId,
  );
  const targetPhrase = (name: string | undefined) =>
    !name
      ? ""
      : draft.targetType === "cohorte"
        ? `la cohorte ${name}`
        : `el alumno ${name}`;
  const targetName =
    draft.targetType === "cohorte"
      ? cohorts.find((c) => c.id === draft.targetId)?.nombre
      : (resource?.people.find((p) => p.id === draft.targetId)?.nombreCompleto ??
        names.get(draft.targetId));
  const step3 = Boolean(preview);
  const stepNo = step3 ? 3 : step;
  const attemptsText = draft.attempts === "" ? "los del examen" : draft.attempts;
  const summary = (() => {
    if (!preview) return "";
    const who = targetPhrase(targetName) || "el destinatario elegido";
    if (!preview.habilitado) return `Se bloqueará el acceso a «${scope.title}» para ${who}.`;
    const todayKey = (value: string) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date(value));
    const from = preview.opens_at
      ? `desde ${todayKey(preview.opens_at) === todayKey(today) ? "hoy, " : "el "}${friendlyDate(preview.opens_at)}`
      : "desde ahora";
    const until = preview.closes_at
      ? `hasta el ${friendlyDate(preview.closes_at)}`
      : "sin límite de fecha";
    return `«${scope.title}» quedará disponible para ${who} ${from}, ${until}.`;
  })();
  const notice = draftNotice ? (
    <ContentBanner>
      <p>{draftNotice}</p>
      {onGoPublish ? (
        <Button type="button" variant="secondary" size="sm" disabled={action.busy} onClick={onGoPublish}>
          Ir a publicar
        </Button>
      ) : null}
    </ContentBanner>
  ) : null;
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title={<span className="[overflow-wrap:anywhere]">Habilitar «{scope.title}»</span>}
      className={`${styles.dialog} max-w-4xl`}
    >
      <div className={styles.ruleSteps}>
        <span data-active={stepNo === 1}>
          <i>1</i>Para quién
        </span>
        <span data-active={stepNo === 2}>
          <i>2</i>Cuándo
        </span>
        <span data-active={stepNo === 3}>
          <i>3</i>Revisar
        </span>
      </div>
      <p className={styles.dialogDescription}>
        Elige quién puede ver este contenido y desde cuándo.
      </p>
      {notice}
      <ContentLoad
        loading={!resource}
        error={resource?.error ?? null}
        retry={() => {
          setResource(null);
          setRevision((r) => r + 1);
        }}
      >
        <form className={`space-y-4 ${styles.requiredFields}`} noValidate onSubmit={submit}>
          <fieldset disabled={action.busy || step3} className="space-y-4">
            {step === 1 && !step3 ? (
              <section className={styles.ruleSection} aria-labelledby="access-who">
                <h3 id="access-who">Para quién</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-text-secondary">Destinatario</p>
                    <ContentTabs
                      segmented
                      label="Destinatario de la habilitación"
                      value={draft.targetType}
                      onChange={(value) => {
                        if (value !== draft.targetType) choose(value, "");
                      }}
                      items={[
                        { value: "cohorte", label: "Cohorte" },
                        { value: "estudiante", label: "Estudiante" },
                      ]}
                    />
                  </div>
                  {draft.targetType === "cohorte" ? (
                    <Select
                      id="access-target"
                      label="Cohorte"
                      required
                      aria-required="true"
                      error={required.errors["access-target"]}
                      value={draft.targetId}
                      onChange={(e) => choose("cohorte", e.target.value)}
                    >
                      <option value="">Seleccionar cohorte</option>
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        label="Buscar alumno por nombre"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <Select
                        id="access-target"
                        label="Alumno"
                        value={draft.targetId}
                        required
                        aria-required="true"
                        error={required.errors["access-target"]}
                        onChange={(e) => choose("estudiante", e.target.value)}
                      >
                        <option value="">Seleccionar alumno</option>
                        {draft.targetId && !available.some((p) => p.id === draft.targetId) ? (
                          <option value={draft.targetId}>
                            {names.get(draft.targetId) ?? "Alumno actual (revalidar matrícula)"}
                          </option>
                        ) : null}
                        {available.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombreCompleto}
                          </option>
                        ))}
                      </Select>
                      {!available.length ? (
                        <p className="text-sm text-text-secondary">
                          No hay alumnos activos con cohorte que coincidan.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                {targetName ? (
                  <p className={styles.helpText}>
                    {draft.targetType === "cohorte"
                      ? `Lo verán los alumnos de la cohorte «${targetName}».`
                      : `Lo verá el alumno «${targetName}».`}
                  </p>
                ) : null}
                {draft.targetType === "estudiante" ? (
                  <p className="rounded-md border border-status-warning p-3 text-sm">
                    La habilitación del alumno reemplaza a la de su cohorte: no hereda fechas,
                    intentos ni minutos. {warning}
                  </p>
                ) : warning ? (
                  <p className="text-sm text-text-secondary">{warning}</p>
                ) : null}
                <div>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={draft.enabled}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          enabled: e.target.checked,
                          closes: e.target.checked ? draft.closes : "",
                        })
                      }
                    />
                    Acceso habilitado
                  </label>
                  <p className={styles.helpText}>
                    Desactívalo para bloquear el acceso a este contenido.
                  </p>
                </div>
              </section>
            ) : null}
            {step === 2 && !step3 ? (
              <>
                <section className={styles.ruleSection} aria-labelledby="access-when">
                  <h3 id="access-when">Cuándo</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Disponible desde (opcional)"
                      type="datetime-local"
                      value={draft.opens}
                      onChange={(e) => setDraft({ ...draft, opens: e.target.value })}
                    />
                    <Input
                      label="Disponible hasta (opcional)"
                      aria-describedby="access-close-feedback"
                      type="datetime-local"
                      disabled={!draft.enabled}
                      value={draft.enabled ? draft.closes : ""}
                      onChange={(e) => setDraft({ ...draft, closes: e.target.value })}
                    />
                  </div>
                  <p className={styles.helpText}>
                    Si los dejas vacíos, estará disponible sin límite de fecha. Hora de Ecuador.
                  </p>
                  <div id="access-close-feedback">
                    {checks.past || checks.reversed ? (
                      <p role="alert" className="text-sm text-status-error">
                        {checks.past
                          ? "El cierre debe ser una fecha futura."
                          : "El cierre debe ser posterior a la apertura."}
                      </p>
                    ) : null}
                  </div>
                  {!draft.enabled ? (
                    <p className="text-sm text-text-secondary">
                      El bloqueo se aplicará sin fecha de cierre, aunque la habilitación anterior
                      ya haya vencido.
                    </p>
                  ) : null}
                </section>
                {scope.hasExams ? (
                  <section className={styles.ruleSection} aria-labelledby="access-exams">
                    <h3 id="access-exams">Exámenes</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Input
                          label="Intentos permitidos"
                          aria-describedby="access-attempts-feedback"
                          type="number"
                          min={1}
                          max={20}
                          step={1}
                          value={draft.attempts}
                          onChange={(e) => setDraft({ ...draft, attempts: e.target.value })}
                        />
                        <p
                          id="access-attempts-feedback"
                          className={`text-sm ${checks.attempts ? "text-status-error" : "text-text-secondary"}`}
                        >
                          {checks.attempts
                            ? "El máximo de intentos debe ser un entero entre 1 y 20."
                            : "Intentos permitidos (1 a 20). Déjalo vacío para usar los intentos que ya tiene el examen."}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Input
                          id="access-extra"
                          label="Minutos extra"
                          aria-describedby="access-minutes-feedback"
                          type="number"
                          min={0}
                          max={180}
                          step={1}
                          required
                          aria-required="true"
                          error={required.errors["access-extra"]}
                          value={draft.extra}
                          onChange={(e) => {
                            setDraft({ ...draft, extra: e.target.value });
                            required.clear("access-extra");
                          }}
                        />
                        <p
                          id="access-minutes-feedback"
                          className={`text-sm ${checks.minutes ? "text-status-error" : "text-text-secondary"}`}
                        >
                          {checks.minutes
                            ? "Los minutos extra deben ser un entero entre 0 y 180."
                            : "Minutos extra (0 a 180). No afectan a un intento que ya empezó."}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
                <details className={styles.ruleSection} open={draft.note !== "" || undefined}>
                  <summary className="cursor-pointer text-sm font-medium">
                    Agregar una nota (opcional)
                  </summary>
                  <div className="mt-3">
                    <Textarea
                      label="Nota administrativa"
                      maxLength={300}
                      value={draft.note}
                      onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    />
                  </div>
                </details>
              </>
            ) : null}
          </fieldset>
          <FormError>{action.error}</FormError>
          {info ? <p role="status">{info}</p> : null}
          {preview ? (
            <section className={styles.preview} aria-label="Resumen de la habilitación">
              <p>{summary}</p>
              {scope.hasExams ? (
                <p>
                  Intentos permitidos: {attemptsText}. Minutos extra: {preview.extra_minutes}.
                </p>
              ) : null}
              {draftNotice ? <p className="font-medium">{draftNotice}</p> : null}
              <p className="text-sm text-text-secondary">
                No cambia los plazos de intentos ya iniciados. Un definitivo aprobado no se repite.
              </p>
            </section>
          ) : null}
          <div className={styles.stickyFooter}>
            {preview ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={action.busy}
                  onClick={() => setPreview(null)}
                >
                  Volver
                </Button>
                <Button type="button" isLoading={action.busy} onClick={() => void apply()}>
                  Aplicar habilitación
                </Button>
              </>
            ) : step === 1 ? (
              <>
                <Button type="button" variant="secondary" disabled={action.busy} onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!items.length}>
                  Siguiente
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={action.busy}
                  onClick={() => setStep(1)}
                >
                  Volver
                </Button>
                <Button type="submit" disabled={!items.length}>
                  Revisar
                </Button>
              </>
            )}
          </div>
        </form>
        {scope.scope === "item" ? (
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold">Habilitaciones existentes</h3>
            {resource?.rules.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className="sr-only">Habilitaciones del elemento</caption>
                  <thead>
                    <tr>
                      <th>Destinatario</th>
                      <th>Disponibilidad</th>
                      <th>Intentos / extra</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.rules.map((rule) => (
                      <tr key={rule.id}>
                        <td>
                          {rule.target_type === "cohorte"
                            ? (cohorts.find((c) => c.id === rule.cohort_id)?.nombre ??
                              "Cohorte no disponible")
                            : (names.get(rule.student_id ?? "") ?? "Alumno no disponible")}
                          <small className="block text-text-secondary">{rule.target_type}</small>
                        </td>
                        <td>
                          {rule.opens_at ? `Desde ${friendlyDate(rule.opens_at)}` : "Desde ahora"}
                          <br />
                          {rule.closes_at ? `Hasta ${friendlyDate(rule.closes_at)}` : "Sin límite de fecha"}
                        </td>
                        <td>
                          {rule.max_attempts ?? "Examen"} / +{rule.extra_minutes} min
                        </td>
                        <td>
                          <AdminChip
                            tone={
                              !rule.habilitado
                                ? "error"
                                : ruleState(rule) === "Abierta"
                                  ? "success"
                                  : ruleState(rule) === "Programada"
                                    ? "info"
                                    : "neutral"
                            }
                          >
                            {ruleState(rule)}
                          </AdminChip>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={action.busy}
                              onClick={() => edit(rule)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-status-error"
                              disabled={action.busy}
                              onClick={() => edit(rule, true)}
                            >
                              Bloquear…
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Aún no hay habilitaciones. Sin habilitación, no hay acceso.
              </p>
            )}
            <p className="text-xs text-text-secondary">
              El estado se calcula con la hora de tu navegador. Las habilitaciones bloqueadas no se
              eliminan.
            </p>
          </section>
        ) : null}
      </ContentLoad>
    </Modal>
  );
}
