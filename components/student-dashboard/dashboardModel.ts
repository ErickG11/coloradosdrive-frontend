import type { StudentCatalog, StudentItem } from "@/types/studentContent";
import type { ExamAttempt } from "@/types/examAttempt";
import type { PracticeHistoryPage } from "@/types/practiceAttendance";
import { calendarOrdinal, SCHOOL_ZONE } from "@/components/student-documents/documentsModel";
import type { EnrollmentTone } from "@/components/student-enrollment/enrollmentModel";

export const number = (value: number) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(value);
export const percent = (value: number) => Math.min(100, Math.max(0, value));
export const percentage = (value: number) => `${Math.round(percent(value))} %`;
export const validScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
export const courseHref = (id: string) => `/student/course?course_id=${encodeURIComponent(id)}`;
export function dateTime(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("es-EC", {
        timeZone: SCHOOL_ZONE,
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(value))
    : null;
}
export function greeting(name: string | null, now: number | null) {
  if (!name?.trim() || now === null) return "¡Hola!";
  const hour = Number(
    new Intl.DateTimeFormat("es-EC", {
      timeZone: SCHOOL_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return `${hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"}, ${name.trim()}`;
}
export function nextPracticeCopy(date: string | null, now: number | null) {
  if (!date) return "Aún no tienes prácticas programadas.";
  if (now === null) return `Tu próxima práctica es el ${dateTime(date)}.`;
  const next = calendarOrdinal(date),
    today = calendarOrdinal(new Date(now).toISOString());
  const time = new Intl.DateTimeFormat("es-EC", {
    timeZone: SCHOOL_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
  return next === today
    ? `Hoy tienes práctica a las ${time}.`
    : next !== null && today !== null && next - today === 1
      ? `Tu próxima práctica es mañana a las ${time}.`
      : `Tu próxima práctica es el ${dateTime(date)}.`;
}
export function catalogSummary(catalog: StudentCatalog | null) {
  const subjects = (catalog?.materias ?? []).map((subject) => {
    const materials = subject.items.filter((item) => item.kind === "material");
    const completed = materials.filter((item) => item.completado).length;
    return {
      ...subject,
      total: materials.length,
      completed,
      contentPercent: materials.length ? materialProgress(completed, materials.length) : null,
    };
  });
  const materials = (catalog?.materias ?? [])
    .flatMap((subject) => subject.items)
    .filter((item) => item.kind === "material");
  const requiredMaterials = materials.filter((item) => item.obligatorio);
  const exams = (catalog?.materias ?? []).flatMap((subject) =>
    subject.items
      .filter((item) => item.kind === "examen" && item.exam_id)
      .map((item) => ({ item, subject: subject.title })),
  );
  const uniqueExams = [...new Map(exams.map((exam) => [exam.item.exam_id!, exam])).values()];
  const requiredExams = uniqueExams.filter(({ item }) => item.obligatorio);
  const scores = uniqueExams.map(({ item }) => item.mejor_nota).filter(validScore);
  return {
    subjects,
    exams: uniqueExams,
    content: materials.length
      ? materialProgress(materials.filter((item) => item.completado).length, materials.length)
      : null,
    materialCount: { done: materials.filter((item) => item.completado).length, total: materials.length },
    requiredMaterials: requiredMaterials.length
      ? {
          done: requiredMaterials.filter((item) => item.completado).length,
          total: requiredMaterials.length,
        }
      : null,
    requiredExams: requiredExams.length
      ? {
          done: requiredExams.filter(({ item }) => item.completado).length,
          total: requiredExams.length,
        }
      : null,
    average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    best: scores.length ? Math.max(...scores) : null,
    taken: scores.length,
  };
}
export function materialProgress(done: number, total: number) {
  return total > 0 ? percent((done / total) * 100) : null;
}
export function practiceSummary(summary: PracticeHistoryPage["summary"] | null) {
  if (!summary) return { progress: null, attendance: null };
  const target = summary.horasObjetivo;
  const base = summary.horasAsistidas + summary.horasPerdidas;
  return {
    progress:
      target !== null && Number.isFinite(target) && target > 0
        ? percent((summary.horasAsistidas / target) * 100)
        : null,
    attendance: base > 0 ? percent((summary.horasAsistidas / base) * 100) : null,
  };
}
export function estimatedProgress(
  content: number | null,
  exams: number | null,
  practices: number | null,
) {
  const fronts = [content, exams, practices].filter((value): value is number => value !== null);
  return fronts.length
    ? Math.round(fronts.reduce((sum, value) => sum + Math.round(percent(value)), 0) / fronts.length)
    : null;
}
export function estimatedShares(fronts: number[]) {
  if (!fronts.length) return [];
  const exact = fronts.map((value) => Math.round(percent(value)) / fronts.length);
  const shares = exact.map(Math.floor);
  const remaining = Math.round(exact.reduce((sum, value) => sum + value, 0)) -
    shares.reduce((sum, value) => sum + value, 0);
  const priority = exact.map((value, index) => ({ index, fraction: value - shares[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remaining; index++) shares[priority[index].index]++;
  return shares;
}
export type AttemptSummary = Pick<
  ExamAttempt,
  "id" | "status" | "scorePercent" | "passed" | "startedAt" | "completedAt" | "attemptNumber"
>;
export function summarizeAttempts(attempts: ExamAttempt[]): AttemptSummary[] {
  // Deliberately discard question prompts, selected options and text answers.
  return attempts.map(
    ({ id, status, scorePercent, passed, startedAt, completedAt, attemptNumber }) => ({
      id,
      status,
      scorePercent,
      passed,
      startedAt,
      completedAt,
      attemptNumber,
    }),
  );
}
export function examState(item: StudentItem): { label: string; tone: EnrollmentTone } {
  return item.completado
    ? { label: "Aprobado", tone: "confirmed" }
    : item.intento_en_progreso
      ? { label: "En progreso", tone: "in-progress" }
      : validScore(item.mejor_nota)
        ? { label: "No aprobado", tone: "pending-review" }
        : { label: "Sin rendir", tone: "cancelled" };
}
