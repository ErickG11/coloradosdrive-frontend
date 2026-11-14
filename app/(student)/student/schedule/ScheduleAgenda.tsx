"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";
import { CheckIcon } from "@/components/ui/icons";
import type { StudentPracticeSlot } from "@/types";
import {
  dateLabel,
  downloadCalendar,
  hoursLabel,
  instructorName,
  isActive,
  relativeDay,
  dayInstant,
  slotEnd,
  timeLabel,
  visualState,
  type PracticeBlock,
} from "./scheduleModel";
import { PracticeBadge, ScheduleIcon } from "./ScheduleVisual";
import { ScheduleWeek } from "./ScheduleWeek";
import styles from "./schedule.module.css";

export interface PracticeActions {
  now: number | null;
  pendingSlotId: string | null;
  onConfirm: (slotId: string) => void;
  onCancel: (slotId: string, trigger: HTMLButtonElement) => void;
}
function unavailableReason(slot: StudentPracticeSlot, now: number | null): string | null {
  if (!isActive(slot)) return "Esta práctica ya no admite cambios.";
  if (now === null) return "Consultando el horario…";
  if (slotEnd(slot) <= now) return "Esta práctica ya terminó.";
  if (Date.parse(slot.scheduledAt) <= now) return "Tu práctica está en curso.";
  return null;
}
function SlotControls({
  slot,
  actions,
  primary = false,
}: {
  slot: StudentPracticeSlot;
  actions: PracticeActions;
  primary?: boolean;
}) {
  const reason = unavailableReason(slot, actions.now);
  const lateNotice =
    !reason && actions.now !== null && Date.parse(slot.scheduledAt) - actions.now <= 300000;
  return (
    <div className={styles.controls}>
      {slot.status === "asignado" ? (
        <Button
          variant={primary ? "primary" : "ghost"}
          className={primary ? styles.primaryAction : undefined}
          icon={<CheckIcon className={styles.smallIcon} />}
          disabled={actions.pendingSlotId !== null || reason !== null}
          isLoading={actions.pendingSlotId === slot.id}
          title={reason ?? "Confirmar tu asistencia es opcional"}
          onClick={() => actions.onConfirm(slot.id)}
        >
          {primary ? "Confirmo que asistiré" : "Confirmar"}
        </Button>
      ) : null}
      {!reason ? (
        <Button
          variant="ghost"
          disabled={actions.pendingSlotId !== null}
          onClick={(event) => actions.onCancel(slot.id, event.currentTarget)}
        >
          No podré asistir
        </Button>
      ) : (
        <p className={styles.hint}>{reason}</p>
      )}
      {lateNotice ? (
        <p className={styles.hint}>
          El cambio normal ya cerró. Todavía puedes avisar al instructor que no asistirás; revisa la
          consecuencia antes de confirmar.
        </p>
      ) : null}
    </div>
  );
}
export function NextPractice({
  block,
  actions,
  following,
  onNavigate,
}: {
  block: PracticeBlock;
  actions: PracticeActions;
  following: PracticeBlock[];
  onNavigate: (day: string) => void;
}) {
  const nextSlot =
    block.slots.find(
      (slot) => isActive(slot) && (actions.now === null || slotEnd(slot) > actions.now),
    ) ?? block.slots[0];
  const inProgress = actions.now !== null && block.start <= actions.now && block.end > actions.now;
  const minutes =
    actions.now === null ? null : Math.max(1, Math.ceil((block.start - actions.now) / 60000));
  const countdown = inProgress
    ? "En curso"
    : minutes === null
      ? ""
      : `Empieza en ${minutes >= 60 ? `${Math.floor(minutes / 60)} h ` : ""}${minutes % 60} min`;
  const name = instructorName(nextSlot);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const avatarTone =
    Array.from(initials).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % 6;
  const followingDays = following
    .filter(
      (item, index, items) =>
        item.day !== block.day && items.findIndex((other) => other.day === item.day) === index,
    )
    .slice(0, 4);
  return (
    <section aria-labelledby="next-practice-heading" className={styles.hero}>
      <div className={styles.sectionTop}>
        <h2 id="next-practice-heading">Tu próxima práctica</h2>
        <PracticeBadge state={visualState(nextSlot, actions.now)} />
      </div>
      <p className={styles.heroDate}>
        {relativeDay(block.start, actions.now) ? (
          <span className={styles.relativeChip}>{relativeDay(block.start, actions.now)}</span>
        ) : null}
        {dateLabel(block.start, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <p className={styles.heroTime}>
        {timeLabel(block.start)} <span>–</span> {timeLabel(block.end)}{" "}
        <small>· {hoursLabel((block.end - block.start) / 60000)}</small>
      </p>
      <div className={styles.heroMeta}>
        <div className={styles.instructor}>
          <span className={styles.avatar} data-avatar={avatarTone} aria-hidden="true">
            {initials}
          </span>
          <div>
            <span className={styles.hint}>Tu instructor</span>
            <p>{name}</p>
          </div>
        </div>
        <span
          className={styles.countdown}
          data-urgency={
            inProgress ? "live" : minutes !== null && minutes < 60 ? "soon" : "scheduled"
          }
        >
          {countdown ? <span className={styles.liveDot} aria-hidden="true" /> : null}
          <ScheduleIcon kind="clock" />
          {countdown || "Horario de Ecuador"}
        </span>
      </div>
      {followingDays.length ? (
        <nav className={styles.following} aria-label="Siguientes días de práctica">
          <p>Siguientes</p>
          <div>
            {followingDays.map((item) => {
              const state = visualState(item.slots[0], actions.now);
              return (
                <button
                  key={item.day}
                  type="button"
                  className={styles.nextDay}
                  data-tone={state.tone}
                  aria-label={`Ver prácticas del ${dateLabel(dayInstant(item.day), { weekday: "long", day: "numeric", month: "long" })}: ${state.label}`}
                  onClick={() => onNavigate(item.day)}
                >
                  <ScheduleIcon kind="calendar" className={styles.smallIcon} />
                  <span>
                    {dateLabel(item.start, { weekday: "short", day: "numeric" })}
                    <strong>
                      {timeLabel(item.start)}–{timeLabel(item.end)}
                    </strong>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
      <span className="sr-only" role="status">
        {inProgress ? "Tu práctica está en curso" : ""}
      </span>
      <div className={styles.heroFooter}>
        <SlotControls slot={nextSlot} actions={actions} primary />
        <p className={styles.hint}>
          Opcional: si no confirmas, igual te esperamos.
          {block.slots.length > 1
            ? " La confirmación y el aviso de inasistencia aplican al bloque completo del día."
            : ""}
        </p>
        <Button
          variant="ghost"
          className={styles.calendarAction}
          icon={<ScheduleIcon />}
          onClick={() => downloadCalendar([block])}
        >
          Agregar a mi calendario
        </Button>
      </div>
    </section>
  );
}

export function PracticeRow({
  slot,
  actions,
  onOptions,
}: {
  slot: StudentPracticeSlot;
  actions: PracticeActions;
  onOptions: (trigger: HTMLButtonElement) => void;
}) {
  const reason = unavailableReason(slot, actions.now);
  return (
    <motion.div
      className={styles.hourRow}
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <span className={styles.hourTime}>
        {timeLabel(slot.scheduledAt)} – {timeLabel(slotEnd(slot))}
      </span>
      <PracticeBadge state={visualState(slot, actions.now)} />
      <div className={styles.hourActions}>
        {slot.status === "asignado" && !reason ? (
          <Button
            variant="ghost"
            disabled={actions.pendingSlotId !== null}
            isLoading={actions.pendingSlotId === slot.id}
            icon={<CheckIcon className={styles.smallIcon} />}
            onClick={() => actions.onConfirm(slot.id)}
          >
            Confirmar
          </Button>
        ) : null}
        <Button
          variant="ghost"
          aria-label={`Opciones de la práctica de ${timeLabel(slot.scheduledAt)}`}
          title={reason ?? "Opciones de práctica"}
          onClick={(event) => onOptions(event.currentTarget)}
        >
          <ScheduleIcon kind="more" />
        </Button>
      </div>
    </motion.div>
  );
}

export function ScheduleAgenda({
  blocks,
  actions,
  view,
  focusedDay,
  onOptions,
}: {
  blocks: PracticeBlock[];
  actions: PracticeActions;
  view: "list" | "week";
  focusedDay: { day: string; request: number } | null;
  onOptions: (block: PracticeBlock, trigger: HTMLButtonElement) => void;
}) {
  const dayGroups = new Map<string, PracticeBlock[]>();
  for (const block of blocks)
    dayGroups.set(block.day, [...(dayGroups.get(block.day) ?? []), block]);
  return (
    <>
      {view === "week" ? (
        <ScheduleWeek
          key={focusedDay?.request ?? 0}
          blocks={blocks}
          now={actions.now}
          onSelect={onOptions}
          focusedDay={focusedDay?.day ?? null}
        />
      ) : (
        <div className={styles.timeline}>
          <AnimatePresence initial={false}>
            {[...dayGroups.entries()].map(([day, entries], index) => (
              <motion.section
                key={day}
                id={`practice-day-${day}`}
                tabIndex={-1}
                layout="position"
                className={styles.day}
                initial={{ opacity: 0, transform: "translateY(4px)" }}
                animate={{ opacity: 1, transform: "translateY(0)" }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.18,
                  delay: Math.min(index * 0.025, 0.1),
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <h3 className={styles.dayHeading}>
                  {dateLabel(entries[0].start, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {relativeDay(entries[0].start, actions.now) ? (
                    <span className={styles.relativeChip}>
                      {relativeDay(entries[0].start, actions.now)}
                    </span>
                  ) : null}
                </h3>
                <div className={styles.dayBlocks}>
                  <AnimatePresence initial={false}>
                    {entries.map((block) => (
                      <motion.article
                        key={block.id}
                        layout="position"
                        className={styles.block}
                        data-tone={visualState(block.slots[0], actions.now).tone}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className={styles.blockHeading}>
                          <p>
                            {timeLabel(block.start)} – {timeLabel(block.end)}{" "}
                            <span>· {hoursLabel((block.end - block.start) / 60000)}</span>
                          </p>
                          <span className={styles.hint}>{instructorName(block.slots[0])}</span>
                        </div>
                        <AnimatePresence initial={false}>
                          {block.slots.map((slot) => (
                            <PracticeRow
                              key={slot.id}
                              slot={slot}
                              actions={actions}
                              onOptions={(trigger) => onOptions(block, trigger)}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
