// Utilidades puras de fecha para el calendario de horarios (admin, RF-03).
// Sin librería de fechas: la matemática que hace falta (rango de semana,
// grilla de mes) es acotada y ya se resuelve con Date nativo en el resto
// del proyecto (ver toLocaleDateString("es-EC") en cohorts/exams).

export type CalendarViewMode = "semana" | "mes";

// Lunes como primer día de la semana (convención es-EC). Date#getDay()
// devuelve 0 = domingo.
const FIRST_DAY_OF_WEEK = 1;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, amount: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfWeek(date: Date): Date {
  const diff = (date.getDay() - FIRST_DAY_OF_WEEK + 7) % 7;
  return addDays(date, -diff);
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isInMonth(date: Date, month: Date): boolean {
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
}

// Grilla de semanas completas (siempre múltiplos de 7 días) que cubre el
// mes de `date`, incluyendo los días finales del mes anterior y los
// iniciales del siguiente que hacen falta para completar cada semana.
export function getMonthGrid(date: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(date));
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridEnd = getWeekDays(lastOfMonth)[6];

  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    weeks.push(getWeekDays(cursor));
    cursor = addWeeks(cursor, 1);
  }
  return weeks;
}

// Clave estable yyyy-MM-dd en hora LOCAL (no UTC): agrupa por el día de
// calendario que el usuario ve, no por el día UTC del timestamp crudo del
// backend.
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Agrupa `items` por el día local de `getDate(item)`, con cada grupo
// ordenado cronológicamente. Genérico (no depende de PracticeSlot) para
// poder reutilizarse en cualquier otro listado agrupado por fecha.
export function groupByDay<T>(items: T[], getDate: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = dayKey(new Date(getDate(item)));
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  for (const group of groups.values()) {
    group.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime());
  }

  return groups;
}
