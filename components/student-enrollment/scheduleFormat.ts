const ZONE = "America/Guayaquil";
/** "jue 5 nov": día corto de una fecha civil AAAA-MM-DD. */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: ZONE,
  })
    .format(new Date(`${date}T12:00:00-05:00`))
    .replace(/[,.]/g, "");
}
export function dayLabelLong(date: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ZONE,
  }).format(new Date(`${date}T12:00:00-05:00`));
}
/** Fecha civil de Guayaquil, desplazada `offset` días desde hoy (AAAA-MM-DD). */
export function guayaquilDate(offset: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(
    new Date(Date.now() + offset * 86_400_000),
  );
}
export function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}
export interface PlanSummaryInput {
  primerDia: string;
  horaInicio: string;
  ultimoDia: string;
  horaFin: string;
  horasTotales: number;
  dias: number;
}
export function summarySentence(plan: PlanSummaryInput): string {
  return `Empiezas el ${dayLabel(plan.primerDia)} a las ${plan.horaInicio} y terminas el ${dayLabel(plan.ultimoDia)} a las ${plan.horaFin} · ${plural(plan.horasTotales, "hora", "horas")} en ${plural(plan.dias, "día", "días")}`;
}
