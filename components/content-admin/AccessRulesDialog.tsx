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
  contentDate,
  contentErrorMessage,
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
import { AdminChip, ContentTabs } from "./AdminContentUI";
import { AccessDraftPreview } from "./AccessDraftPreview";
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
        ? "Se precargó la regla de su cohorte. Al guardar, todos estos valores serán propios del alumno y reemplazarán a los de la cohorte."
        : "Se cargaron los valores actuales del objetivo.",
    };
  return {
    draft: { ...empty, targetType: type, targetId: id },
    warning: source.length
      ? "Las reglas del alcance son diferentes o faltan en algunos elementos. Define explícitamente los valores que reemplazarán a todas; no se mezclan ni se heredan automáticamente."
      : "Sin regla previa. Define la habilitación completa.",
  };
}
export function AccessRulesDialog({
  scope,
  items,
  cohorts,
  names,
  initialStudent,
  onClose,
  onSaved,
}: {
  scope: ContentScope;
  items: SubjectItem[];
  cohorts: Cohort[];
  names: Map<string, string>;
  initialStudent?: { id: string; attempts: number };
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
    setPreview(null);
    setInfo("");
    const value = initialDraft(resource?.rules ?? [], items, resource?.people ?? [], type, id);
    setDraft(value.draft);
    setWarning(value.warning);
  }
  function edit(rule: AccessRule, block = false) {
    setPreview(null);
    setDraft({ ...ruleToDraft(rule), ...(block ? { enabled: false, closes: "" } : {}) });
    setWarning("Se cargó la regla existente. Guardar reemplaza todos sus valores.");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
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
  const targetName =
    draft.targetType === "cohorte"
      ? cohorts.find((c) => c.id === draft.targetId)?.nombre
      : (resource?.people.find((p) => p.id === draft.targetId)?.nombreCompleto ??
        names.get(draft.targetId));
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title={<span className="[overflow-wrap:anywhere]">Habilitar · {scope.title}</span>}
      className={`${styles.dialog} max-w-4xl`}
    >
      <div className={styles.ruleSteps}>
        <span>
          <i>1</i>Alcance definido
        </span>
        <span data-active={!preview}>
          <i>2</i>Destinatario y fechas
        </span>
        <span data-active={Boolean(preview)}>
          <i>3</i>Revisar y aplicar
        </span>
      </div>
      <p className={styles.dialogDescription}>
        Alcance: {scope.scope === "item" ? "elemento" : scope.scope}. Fechas de America/Guayaquil
        (UTC−5). La materia y el contenido deben estar publicados para permitir acceso.{" "}
        {scope.scope !== "item"
          ? "Los intentos y minutos solo se aplicarán a los exámenes del alcance."
          : ""}
      </p>
      <ContentLoad
        loading={!resource}
        error={resource?.error ?? null}
        retry={() => {
          setResource(null);
          setRevision((r) => r + 1);
        }}
      >
        <form className="space-y-4" onSubmit={submit}>
          <fieldset disabled={action.busy || Boolean(preview)} className="space-y-4">
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
                  label="Cohorte"
                  required
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
                    label="Alumno"
                    value={draft.targetId}
                    required
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
            {draft.targetType === "estudiante" ? (
              <p className="rounded-md border border-status-warning p-3 text-sm">
                La regla del alumno reemplaza a la de su cohorte: no hereda ventanas, intentos ni
                minutos. {warning}
              </p>
            ) : warning ? (
              <p className="text-sm text-text-secondary">{warning}</p>
            ) : null}
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    enabled: e.target.checked,
                    closes: e.target.checked ? draft.closes : "",
                  })
                }
              />
              Habilitar (desmarca para bloquear)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Apertura opcional · hora de Ecuador"
                type="datetime-local"
                value={draft.opens}
                onChange={(e) => setDraft({ ...draft, opens: e.target.value })}
              />
              <Input
                label="Cierre opcional · hora de Ecuador"
                aria-describedby="access-close-feedback"
                type="datetime-local"
                disabled={!draft.enabled}
                value={draft.enabled ? draft.closes : ""}
                onChange={(e) => setDraft({ ...draft, closes: e.target.value })}
              />
            </div>
            {!draft.enabled ? (
              <p className="text-sm text-text-secondary">
                El bloqueo se enviará sin cierre, incluso si la regla anterior ya venció.
              </p>
            ) : null}
            {scope.hasExams ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Intentos (vacío = heredar del examen)"
                  aria-describedby="access-attempts-feedback"
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={draft.attempts}
                  onChange={(e) => setDraft({ ...draft, attempts: e.target.value })}
                />
                <Input
                  label="Minutos extra"
                  aria-describedby="access-minutes-feedback"
                  type="number"
                  min={0}
                  max={180}
                  step={1}
                  required
                  value={draft.extra}
                  onChange={(e) => setDraft({ ...draft, extra: e.target.value })}
                />
              </div>
            ) : null}
            <Textarea
              label="Nota administrativa (opcional)"
              maxLength={300}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </fieldset>
          {!preview ? (
            <AccessDraftPreview draft={draft} scope={scope} targetName={targetName} />
          ) : null}
          <FormError>{action.error}</FormError>
          {info ? <p role="status">{info}</p> : null}
          {preview ? (
            <section className={styles.preview} aria-label="Vista previa">
              <p>
                <strong>{preview.habilitado ? "Habilitar" : "Bloquear"}</strong> {scope.title} para{" "}
                <strong>{targetName ?? "el destinatario seleccionado"}</strong>. Alcance:{" "}
                {scope.scope === "item" ? "elemento" : scope.scope} ({items.length}{" "}
                {items.length === 1 ? "elemento" : "elementos"}).
              </p>
              <p>
                Apertura: {preview.opens_at ? contentDate(preview.opens_at) : "Ya abierto"}. Cierre:{" "}
                {preview.closes_at ? contentDate(preview.closes_at) : "Sin cierre"}.
              </p>
              {scope.hasExams ? (
                <p>
                  Intentos: {preview.max_attempts ?? "Valor del examen"}. Minutos extra:{" "}
                  {preview.extra_minutes}.
                </p>
              ) : null}
              <p className="text-sm text-text-secondary">
                No cambia los plazos de intentos ya iniciados. Un definitivo aprobado no se repite.
              </p>
              <div className={styles.formFooter}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={action.busy}
                  onClick={() => setPreview(null)}
                >
                  Volver a editar
                </Button>
                <Button type="button" isLoading={action.busy} onClick={() => void apply()}>
                  Confirmar aplicación
                </Button>
              </div>
            </section>
          ) : (
            <div className={styles.formFooter}>
              <Button type="button" variant="secondary" disabled={action.busy} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!items.length}>
                Revisar antes de aplicar
              </Button>
            </div>
          )}
        </form>
        {scope.scope === "item" ? (
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold">Reglas existentes</h3>
            {resource?.rules.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className="sr-only">Habilitaciones del elemento</caption>
                  <thead>
                    <tr>
                      <th>Destinatario</th>
                      <th>Ventana · Guayaquil</th>
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
                          {rule.opens_at ? contentDate(rule.opens_at) : "Ya abierto"}
                          <br />
                          {rule.closes_at ? contentDate(rule.closes_at) : "Sin cierre"}
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
                Aún no hay reglas. Sin regla, no hay acceso.
              </p>
            )}
            <p className="text-xs text-text-secondary">
              Estado informativo según el reloj del navegador; el servidor es la autoridad. Las
              reglas bloqueadas no se eliminan.
            </p>
          </section>
        ) : null}
      </ContentLoad>
    </Modal>
  );
}
