"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  dayKey,
  getMonthGrid,
  getWeekDays,
  groupByDay,
  isInMonth,
  type CalendarViewMode,
} from "@/lib/utils/calendar";
import type { PracticeSlotWithNames } from "@/types";

const MONTH_VISIBLE_SLOTS = 3;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short" });
}

interface SlotChipProps {
  slot: PracticeSlotWithNames;
  compact?: boolean;
  onClick: () => void;
}

// instructorName/studentName vienen embebidos desde el backend (ver
// docs/adr/008 en el backend) - no hace falta resolverlos contra ningún
// Map local.
function SlotChip({ slot, compact = false, onClick }: SlotChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-1 rounded-sm border border-border bg-bg-field px-2 py-1.5 text-left text-xs transition-colors hover:border-border-strong"
    >
      <span className="font-medium text-text-primary">
        {formatTime(slot.scheduledAt)} · {slot.instructorName}
      </span>
      {!compact && slot.studentName ? (
        <span className="text-text-secondary">{slot.studentName}</span>
      ) : null}
      <StatusBadge status={slot.status} />
    </button>
  );
}

interface DayCellProps {
  day: Date;
  slots: PracticeSlotWithNames[];
  dimmed: boolean;
  compact: boolean;
  onSelectSlot: (slot: PracticeSlotWithNames) => void;
  onSelectEmptyDay: (date: Date) => void;
}

function DayCell({ day, slots, dimmed, compact, onSelectSlot, onSelectEmptyDay }: DayCellProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleSlots = compact && !expanded ? slots.slice(0, MONTH_VISIBLE_SLOTS) : slots;
  const hiddenCount = slots.length - visibleSlots.length;

  return (
    <div
      className={cn(
        "flex min-h-24 flex-col gap-1.5 rounded-md border border-border bg-bg-surface p-2",
        dimmed && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{day.getDate()}</span>
        <button
          type="button"
          onClick={() => onSelectEmptyDay(day)}
          aria-label={`Nueva franja el ${day.toLocaleDateString("es-EC")}`}
          className="text-text-secondary hover:text-accent-blue"
        >
          +
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {visibleSlots.map((slot) => (
          <SlotChip key={slot.id} slot={slot} compact={compact} onClick={() => onSelectSlot(slot)} />
        ))}
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-left text-xs text-accent-blue hover:text-accent-blue-hover"
        >
          +{hiddenCount} más
        </button>
      ) : null}
    </div>
  );
}

export interface PracticeSlotCalendarProps {
  slots: PracticeSlotWithNames[];
  viewMode: CalendarViewMode;
  currentDate: Date;
  onSelectSlot: (slot: PracticeSlotWithNames) => void;
  onSelectEmptyDay: (date: Date) => void;
}

// Grilla (semana: 7 columnas, cada una con sus franjas apiladas por hora;
// mes: 7xN con hasta 3 chips y "+N más") en md+; en mobile se reemplaza
// por una agenda agrupada por día, porque una grilla de 7 columnas no cabe
// legible a 375px (ver discusión de responsive del sprint).
export function PracticeSlotCalendar({
  slots,
  viewMode,
  currentDate,
  onSelectSlot,
  onSelectEmptyDay,
}: PracticeSlotCalendarProps) {
  const groups = groupByDay(slots, (slot) => slot.scheduledAt);
  const days = viewMode === "semana" ? getWeekDays(currentDate) : getMonthGrid(currentDate).flat();
  const visibleDays =
    viewMode === "semana" ? days : days.filter((day) => isInMonth(day, currentDate));

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden grid-cols-7 gap-2 md:grid">
        {days.map((day) => {
          const daySlots = groups.get(dayKey(day)) ?? [];
          return (
            <DayCell
              key={dayKey(day)}
              day={day}
              slots={daySlots}
              dimmed={viewMode === "mes" && !isInMonth(day, currentDate)}
              compact={viewMode === "mes"}
              onSelectSlot={onSelectSlot}
              onSelectEmptyDay={onSelectEmptyDay}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {visibleDays.map((day) => {
          const daySlots = groups.get(dayKey(day)) ?? [];
          return (
            <div key={dayKey(day)} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize text-text-primary">
                  {formatDayLabel(day)}
                </h3>
                <button
                  type="button"
                  onClick={() => onSelectEmptyDay(day)}
                  className="text-sm text-accent-blue hover:text-accent-blue-hover"
                >
                  + Nueva
                </button>
              </div>
              {daySlots.length === 0 ? (
                <p className="text-sm text-text-secondary">Sin franjas.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {daySlots.map((slot) => (
                    <SlotChip key={slot.id} slot={slot} onClick={() => onSelectSlot(slot)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
