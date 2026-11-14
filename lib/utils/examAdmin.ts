import type { Exam, UpdateExamInput } from "@/types/exam";
import type { AccessRule, CourseSubject } from "@/types/content";
import type { ExamFormValues } from "@/types/examDraft";

export const examTypeDefault = (type: Exam["type"]) => (type === "definitivo" ? "1" : "");
export const attemptLimitValue = (value?: string) => (value?.trim() ? Number(value) : null);

export interface ExamDraftIssue {
  message: string;
  questionIndex?: number;
}
export function examDraftIssues(values: ExamFormValues): ExamDraftIssue[] {
  const issues: ExamDraftIssue[] = [];
  if (!values.courseId) issues.push({ message: "Selecciona un curso." });
  if (!values.title.trim()) issues.push({ message: "Escribe el título del examen." });
  if (
    !values.timeLimitMinutes.trim() ||
    !Number.isInteger(Number(values.timeLimitMinutes)) ||
    Number(values.timeLimitMinutes) <= 0
  )
    issues.push({ message: "El tiempo debe ser un número entero de minutos mayor que 0." });
  if (
    !values.passingScorePercent.trim() ||
    !Number.isFinite(Number(values.passingScorePercent)) ||
    Number(values.passingScorePercent) < 0 ||
    Number(values.passingScorePercent) > 100
  )
    issues.push({
      message: "La nota mínima debe estar entre 0 y 100; escribe 0 si ese es el valor deseado.",
    });
  const attempts = attemptLimitValue(values.maxAttemptsDefault);
  if (attempts !== null && (!Number.isInteger(attempts) || attempts < 1 || attempts > 20))
    issues.push({
      message: "Los intentos deben ser un entero entre 1 y 20, o quedar vacíos para ilimitado.",
    });
  if (!values.questions.length) issues.push({ message: "Agrega al menos una pregunta." });
  values.questions.forEach((q, index) => {
    const add = (message: string) => issues.push({ questionIndex: index, message });
    if (!q.prompt.trim()) add(`Escribe el enunciado de la pregunta ${index + 1}.`);
    if (!q.points.trim() || !Number.isFinite(Number(q.points)) || Number(q.points) <= 0)
      add(`Los puntos de la pregunta ${index + 1} deben ser mayores que 0.`);
    if (q.type === "opcion_multiple") {
      if (q.options.length < 2) add(`La pregunta ${index + 1} necesita al menos 2 opciones.`);
      if (q.options.filter((o) => o.isCorrect).length !== 1)
        add(`Falta exactamente una opción correcta en la pregunta ${index + 1}.`);
      if (q.options.some((o) => !o.optionText.trim()))
        add(`Completa las opciones de la pregunta ${index + 1}.`);
    } else if (!q.correctAnswerText.trim())
      add(`Escribe la respuesta correcta de la pregunta ${index + 1}.`);
    if (q.synonyms.some((synonym) => !synonym.trim()))
      add(`Completa o quita el sinónimo vacío de la pregunta ${index + 1}.`);
  });
  return issues;
}

export function changedExamMetadata(
  values: ExamFormValues,
  baseline: ExamFormValues | undefined,
  frozen: boolean,
): UpdateExamInput {
  const now = {
    title: values.title,
    description: values.description ?? "",
    timeLimitMinutes: Number(values.timeLimitMinutes),
    passingScorePercent: Number(values.passingScorePercent),
    maxAttemptsDefault: attemptLimitValue(values.maxAttemptsDefault),
    shuffleQuestions: values.shuffleQuestions ?? false,
    shuffleOptions: values.shuffleOptions ?? false,
  };
  const before = baseline
    ? {
        title: baseline.title,
        description: baseline.description ?? "",
        timeLimitMinutes: Number(baseline.timeLimitMinutes),
        passingScorePercent: Number(baseline.passingScorePercent),
        maxAttemptsDefault: attemptLimitValue(baseline.maxAttemptsDefault),
        shuffleQuestions: baseline.shuffleQuestions ?? false,
        shuffleOptions: baseline.shuffleOptions ?? false,
      }
    : null;
  const patch: UpdateExamInput = {};
  for (const key of Object.keys(now) as (keyof typeof now)[]) {
    if (frozen && key !== "title" && key !== "description") continue;
    if (!before || before[key] !== now[key]) Object.assign(patch, { [key]: now[key] });
  }
  return patch;
}

export interface ExamAvailabilityInput {
  questionCount?: number;
  subject?: CourseSubject;
  rules?: AccessRule[];
  failed?: boolean;
  placementKnown?: boolean;
}
export function examAvailability(exam: Exam, data: ExamAvailabilityInput, now: number) {
  const checks = [
    {
      label: "Tiene preguntas",
      value: data.questionCount === undefined ? null : data.questionCount > 0,
    },
    { label: "Publicado", value: exam.isPublished },
    {
      label: "Colocado en materia",
      value: data.placementKnown === false ? null : data.subject !== undefined,
    },
    {
      label: "Materia publicada",
      value: data.placementKnown === false ? null : (data.subject?.is_published ?? false),
    },
    {
      label: "Habilitación abierta",
      value:
        data.rules === undefined
          ? null
          : data.rules.some(
              (rule) =>
                rule.habilitado &&
                (!rule.opens_at || Date.parse(rule.opens_at) <= now) &&
                (!rule.closes_at || Date.parse(rule.closes_at) > now),
            ),
    },
  ];
  const label =
    data.questionCount === 0
      ? "Faltan preguntas"
      : !exam.isPublished
        ? "Falta publicarlo"
        : data.failed || data.placementKnown === false
          ? "Disponibilidad por verificar"
          : !data.subject
            ? "Falta colocarlo en una materia"
            : !data.subject.is_published
              ? "Materia en borrador"
              : data.questionCount === undefined || data.rules === undefined
                ? "Disponibilidad por verificar"
                : checks[4].value
                  ? "Listo para alumnos habilitados"
                  : data.rules.some(
                        (rule) =>
                          rule.habilitado &&
                          rule.opens_at &&
                          Date.parse(rule.opens_at) > now &&
                          (!rule.closes_at ||
                            Date.parse(rule.closes_at) > Date.parse(rule.opens_at)),
                      )
                    ? "Habilitación programada"
                    : !data.rules.length
                      ? "Falta habilitarlo"
                      : data.rules.every((rule) => !rule.habilitado)
                        ? "Habilitaciones bloqueadas"
                        : "Habilitaciones cerradas";
  return { checks, label, ready: checks.every((check) => check.value === true) && !data.failed };
}
