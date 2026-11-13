"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, FormError, Modal } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { usePracticeBlocks } from "@/components/practice-blocks/PracticeBlockProvider";
import type { StudentPracticeSlot } from "@/types/practiceSlot";
import type { PracticeBlockMutation, PracticeBlockOption } from "@/types/practiceBlock";
import { BlockDialog, TakeBlockDialog, type AgendaBlock } from "./BlockDialogs";
import { blockDate, blockTime, blockEnd, localDay } from "./blockFormat";
import styles from "./blocks.module.css";

function optionGroups(options: PracticeBlockOption[]) {
  const groups = new Map<string, PracticeBlockOption[]>();
  for (const option of options) {
    const key = `${option.enrollmentId}:${option.startsAt}:${option.instructorId}`;
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }
  return [...groups.values()];
}
function ChoiceList({
  options,
  onChoose,
  disabled = false,
}: {
  options: PracticeBlockOption[];
  onChoose: (choices: PracticeBlockOption[]) => void;
  disabled?: boolean;
}) {
  const [limit, setLimit] = useState(24);
  const groups = optionGroups(options);
  const visible = groups.slice(0, limit);
  const sections = [
    { kind: "released", label: "Cupos liberados por otros alumnos" },
    { kind: "instructor_free", label: "Bloques libres de tu instructor" },
    { kind: "other_free", label: "Otros instructores disponibles" },
  ];
  return (
    <div className={styles.choiceSections}>
      {sections.map((section) => {
        const choices = visible.filter((g) => g[0].kind === section.kind);
        if (!choices.length) return null;
        const days = new Map<string, PracticeBlockOption[][]>();
        for (const group of choices) {
          const key = localDay(group[0].startsAt);
          days.set(key, [...(days.get(key) ?? []), group]);
        }
        return (
          <section key={section.kind} className={styles.choiceSection}>
            <h3>{section.label}</h3>
            {[...days.values()].map((day) => (
              <div key={localDay(day[0][0].startsAt)}>
                <h4 className={styles.day}>{blockDate(day[0][0].startsAt)}</h4>
                <div className={styles.choiceGrid}>
                  {day.map((group) => {
                    const o = group[0];
                    return (
                      <article key={o.id} className={styles.choice}>
                        <p className={styles.time}>
                          {blockTime(o.startsAt)}–{blockTime(o.endsAt)} <span>{o.hours} h</span>
                        </p>
                        <p>{o.instructorName}</p>
                        <span className={styles.cost}>
                          {o.cost === 0
                            ? "Reponer (sin costo)"
                            : "Cambiar (consume 1 reprogramación)"}
                        </span>
                        <Button
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => onChoose(group)}
                        >
                          Elegir bloque
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
      {limit < groups.length ? (
        <Button variant="ghost" onClick={() => setLimit((n) => n + 24)}>
          Ver más horarios ({groups.length - limit})
        </Button>
      ) : null}
    </div>
  );
}
export default function StudentSchedulePage() {
  const availability = usePracticeBlocks();
  const { summary, options, summaryError, optionsError, loading } = availability;
  const {
    data: slots,
    isLoading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useFetch<StudentPracticeSlot[]>("/practice-slots");
  const [now, setNow] = useState<number | null>(null);
  const [selected, setSelected] = useState<AgendaBlock | null>(null);
  const [take, setTake] = useState<PracticeBlockOption[] | null>(null);
  const [replacement, setReplacement] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  useEffect(() => {
    const refresh = () => refetchSlots();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refetchSlots]);
  // Cohort broadcasts refresh the shared data; refresh the agenda with the same completed snapshot.
  useEffect(() => {
    if (summary) refetchSlots();
  }, [summary, refetchSlots]);
  const blocks = useMemo(() => {
    const days = new Map<string, StudentPracticeSlot[]>();
    for (const slot of slots ?? []) {
      if (!slot.studentId || !["asignado", "confirmado", "completado"].includes(slot.status))
        continue;
      const key = `${slot.cohortId}:${localDay(slot.scheduledAt)}`;
      days.set(key, [...(days.get(key) ?? []), slot]);
    }
    const result: AgendaBlock[] = [];
    for (const day of days.values()) {
      day.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
      const first = day[0];
      const enrollment = summary?.enrollments.find((e) => e.cohortId === first.cohortId);
      if (!enrollment) continue;
      const instructor = "instructorId" in first ? first.instructorId : "";
      const valid =
        day.length >= 1 &&
        day.length <= 2 &&
        day.every(
          (slot, index) =>
            Date.parse(slot.scheduledAt) === Date.parse(first.scheduledAt) + index * 3600000 &&
            "instructorId" in slot &&
            slot.instructorId === instructor,
        );
      result.push({
        enrollmentId: enrollment.id,
        cohortId: first.cohortId,
        date: localDay(first.scheduledAt),
        slotIds: day.map((s) => s.id),
        startsAt: first.scheduledAt,
        endsAt: blockEnd(day[day.length - 1].scheduledAt, 1),
        hours: day.length,
        instructorId: instructor,
        instructorName:
          "instructorName" in first ? first.instructorName : "Instructor por confirmar",
        confirmed: day.every((s) => s.status === "confirmado"),
        started: now === null || Date.parse(first.scheduledAt) <= now,
        valid,
        status: day.every((s) => s.status === "completado")
          ? "Realizado"
          : day.every((s) => s.status === "confirmado")
            ? "Confirmado"
            : "Reservado",
      });
    }
    return result.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, [slots, summary, now]);
  const upcoming = blocks.filter((b) => now === null || Date.parse(b.endsAt) > now);
  const past = blocks.filter((b) => now !== null && Date.parse(b.endsAt) <= now);
  async function done(result?: PracticeBlockMutation) {
    setSelected(null);
    setNotice(result?.effect ?? "Tu bloque quedó confirmado.");
    refetchSlots();
    await availability.refresh();
    if (result?.result === "reprogramable" && result.block)
      setReplacement(result.block.enrollmentId);
  }
  async function taken() {
    setTake(null);
    setNotice("Tu bloque completo quedó reservado. Consulta tu agenda actualizada.");
    refetchSlots();
    await availability.refresh();
  }
  function choose(group: PracticeBlockOption[]) {
    setReplacement(null);
    setTake(group);
  }
  const debt = summary?.enrollments.filter((e) => e.pending.length > 0) ?? [];
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Tu formación al volante</p>
          <h1>Horarios de práctica</h1>
          <p>Tu agenda, tus reposiciones y los próximos bloques disponibles.</p>
        </div>
        <Link href="/student/history">Ver mi asistencia</Link>
      </header>
      {notice ? (
        <div className={styles.notice} role="status">
          <p>{notice}</p>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      ) : null}
      <div className={styles.workspace}>
        <div className={styles.main}>
          <section aria-labelledby="agenda-heading">
            <div className={styles.sectionHeading}>
              <h2 id="agenda-heading">Mi agenda</h2>
              <span>{upcoming.length} bloques próximos</span>
            </div>
            {slotsError ? (
              <div className={styles.empty}>
                <FormError>{slotsError}</FormError>
                <Button variant="ghost" onClick={refetchSlots}>
                  Volver a consultar
                </Button>
              </div>
            ) : slotsLoading && slots === null ? (
              <div className={styles.skeleton} role="status">
                Cargando tu agenda…
              </div>
            ) : !upcoming.length ? (
              <div className={styles.empty}>
                <h3>Aún no tienes bloques próximos</h3>
                <p>
                  {debt.length
                    ? "Tienes una reposición pendiente. Elige un bloque completo en Cupos disponibles."
                    : "Cuando reserves tu plan, encontrarás aquí los días y horarios de tus prácticas."}
                </p>
              </div>
            ) : (
              <div className={styles.agenda}>
                {upcoming.map((block) => (
                  <button
                    type="button"
                    className={styles.agendaBlock}
                    key={`${block.enrollmentId}:${block.date}`}
                    onClick={() => setSelected(block)}
                  >
                    <div>
                      <span className={styles.day}>{blockDate(block.startsAt)}</span>
                      <strong className={styles.bigTime}>
                        {blockTime(block.startsAt)}–{blockTime(block.endsAt)}
                      </strong>
                      <span>
                        {block.hours} h · {block.instructorName}
                      </span>
                    </div>
                    <div className={styles.blockState}>
                      <span className={styles.pill}>{block.status}</span>
                      <span>Opciones del día →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {past.length ? (
              <details className={styles.past}>
                <summary>Bloques anteriores ({past.length})</summary>
                {past.map((b) => (
                  <p key={`${b.enrollmentId}:${b.date}`}>
                    {blockDate(b.startsAt)} · {blockTime(b.startsAt)}–{blockTime(b.endsAt)} ·{" "}
                    {b.status}
                  </p>
                ))}
              </details>
            ) : null}
          </section>
          <section
            id="cupos-disponibles"
            tabIndex={-1}
            className={styles.available}
            aria-labelledby="available-heading"
          >
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="available-heading">Cupos disponibles</h2>
                <p>Siempre eliges un bloque completo con un solo instructor.</p>
              </div>
            </div>
            {debt.map((e) => (
              <div className={styles.effect} key={e.id}>
                <strong>
                  Tienes {e.pending.length} bloque{e.pending.length === 1 ? "" : "s"} pendiente
                  {e.pending.length === 1 ? "" : "s"} por reponer
                </strong>
                <p>
                  Reponerlo no consume otra reprogramación. Tu fecha fin es el{" "}
                  {blockDate(`${e.endDate}T12:00:00-05:00`)}.
                </p>
                <Button variant="secondary" onClick={() => setReplacement(e.id)}>
                  Elegir reposición
                </Button>
              </div>
            ))}
            {optionsError ? (
              <div className={styles.empty}>
                <FormError>{optionsError}</FormError>
                <Button
                  onClick={() => {
                    void availability.refresh();
                  }}
                >
                  Volver a consultar cupos
                </Button>
              </div>
            ) : loading && !options.length ? (
              <div className={styles.skeleton} role="status">
                Buscando bloques completos para ti…
              </div>
            ) : !options.length ? (
              <div className={styles.empty}>
                <h3>No hay cupos disponibles por ahora</h3>
                <p>
                  Tu agenda se mantiene. Esta sección se actualiza cuando alguien libera un bloque o
                  vuelves a esta ventana.
                </p>
                {summary?.enrollments.some((e) => e.used === 2 && !e.pending.length) ? (
                  <p>
                    Ya usaste tus 2 reprogramaciones. Si necesitas recuperar una falta, habla con la
                    escuela o con tu instructor.
                  </p>
                ) : null}
              </div>
            ) : (
              <ChoiceList options={options} onChoose={choose} />
            )}
          </section>
        </div>
        <aside className={styles.plan} aria-labelledby="plan-heading">
          <h2 id="plan-heading">Mi plan</h2>
          {summaryError ? (
            <>
              <FormError>{summaryError}</FormError>
              <Button
                onClick={() => {
                  void availability.refresh();
                }}
              >
                Consultar mi plan
              </Button>
            </>
          ) : !summary ? (
            <p role="status">Consultando tu plan…</p>
          ) : !summary.enrollments.length ? (
            <p>No tienes una matrícula activa.</p>
          ) : (
            summary.enrollments.map((e) => (
              <section key={e.id} className={styles.planEnrollment}>
                <p className={styles.planCount}>
                  <strong>{e.used}</strong> de 2 reprogramaciones usadas
                </p>
                <div className={styles.pips} aria-hidden="true">
                  <i data-used={e.used >= 1} />
                  <i data-used={e.used >= 2} />
                </div>
                <dl className={styles.stats}>
                  <div>
                    <dt>Horas asistidas</dt>
                    <dd>
                      {e.attendedHours} de {e.targetHours} h
                    </dd>
                  </div>
                  <div>
                    <dt>Horas reservadas</dt>
                    <dd>{e.reservedHours} h</dd>
                  </div>
                </dl>
                <p className={styles.hint}>
                  Solo la asistencia registrada cuenta para tu certificación.
                </p>
                {e.absences.length ? (
                  <div className={styles.effect}>
                    <strong>Faltas sin reponer: {e.absences.length}</strong>
                    <p>
                      Habla con la escuela o con tu instructor en tu siguiente práctica para
                      recuperarlas.
                    </p>
                  </div>
                ) : null}
              </section>
            ))
          )}
          <details className={styles.rules}>
            <summary>Reglas de reprogramación</summary>
            <ul>
              <li>Cada día es un bloque de 1 o 2 horas consecutivas con un instructor.</li>
              <li>
                Tienes 2 reprogramaciones por matrícula, para siempre. Cancelar o cambiar un bloque
                usa una.
              </li>
              <li>
                Reponer un bloque pendiente no usa otro cambio. Debe tener la misma duración y
                modalidad, sin solapes y con un solo bloque por día.
              </li>
              <li>
                Elige un horario antes de tu fecha fin y con más de 5 minutos de anticipación. No
                puedes recuperar el mismo bloque que soltaste.
              </li>
              <li>
                Sin un bloque pendiente puedes cambiar un día completo, si todavía te queda una
                reprogramación.
              </li>
              <li>
                Si no hay dónde reponer antes del cierre, el bloque se pierde y el aviso no consume
                un cambio.
              </li>
              <li>
                Después de usar los 2 cambios, un nuevo aviso se registra como falta. Un bloque que
                ya empezó no se cancela en la plataforma.
              </li>
            </ul>
          </details>
        </aside>
      </div>
      {selected ? (
        <BlockDialog block={selected} onClose={() => setSelected(null)} onDone={done} />
      ) : null}
      {replacement ? (
        <Modal
          isOpen
          title="Elige el bloque para reponer"
          onClose={() => setReplacement(null)}
          className={styles.wideDialog}
        >
          {optionsError ? (
            <FormError>{optionsError}</FormError>
          ) : loading ? (
            <p role="status">Actualizando los bloques disponibles…</p>
          ) : options.some((o) => o.enrollmentId === replacement && o.cost === 0) ? (
            <ChoiceList
              options={options.filter((o) => o.enrollmentId === replacement && o.cost === 0)}
              onChoose={choose}
            />
          ) : (
            <div className={styles.empty}>
              <p>No hay bloques disponibles para esta reposición en este momento.</p>
              <Button
                onClick={() => {
                  void availability.refresh();
                }}
              >
                Actualizar opciones
              </Button>
            </div>
          )}
        </Modal>
      ) : null}
      {take ? (
        <TakeBlockDialog
          key={take[0].id}
          choices={take}
          onClose={() => setTake(null)}
          onDone={taken}
        />
      ) : null}
    </div>
  );
}
