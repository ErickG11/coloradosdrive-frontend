import { describe, expect, it } from "vitest";
import {
  attemptLimitValue,
  changedExamMetadata,
  examAvailability,
  examDraftIssues,
  examTypeDefault,
} from "@/lib/utils/examAdmin";
import type { ExamFormValues } from "@/app/(admin)/admin/exams/ExamForm";
import type { Exam } from "@/types/exam";
import type { AccessRule, CourseSubject } from "@/types/content";

const draft: ExamFormValues = {
  courseId: "c",
  title: "Señales",
  type: "practica",
  timeLimitMinutes: "30",
  passingScorePercent: "0",
  maxAttemptsDefault: "",
  isPublished: false,
  questions: [
    {
      type: "opcion_multiple",
      prompt: "¿Qué indica?",
      points: "2",
      correctAnswerText: "",
      synonyms: [],
      options: [
        { optionText: "A", isCorrect: true },
        { optionText: "B", isCorrect: false },
      ],
    },
  ],
};
const exam = { isPublished: true } as Exam;
const subject = { id: "s", is_published: true } as CourseSubject;
const now = Date.parse("2026-11-09T15:00:00Z");
const rule = { habilitado: true, opens_at: null, closes_at: null } as AccessRule;
const ready = { questionCount: 1, subject, rules: [rule], placementKnown: true };

describe("valores y validaciones del examen", () => {
  it("definitivo nuevo precarga uno, práctica es ilimitada y vacío se serializa null", () => {
    expect(examTypeDefault("definitivo")).toBe("1");
    expect(examTypeDefault("practica")).toBe("");
    expect(attemptLimitValue("")).toBeNull();
    expect(attemptLimitValue("  ")).toBeNull();
    expect(attemptLimitValue("20")).toBe(20);
  });
  it("acepta nota cero y rechaza vacíos, límites y banco incompleto", () => {
    expect(examDraftIssues(draft)).toEqual([]);
    const invalid = {
      ...draft,
      title: " ",
      timeLimitMinutes: "",
      passingScorePercent: "",
      maxAttemptsDefault: "21",
      questions: [
        {
          ...draft.questions[0],
          prompt: "",
          points: "0",
          options: [{ optionText: "", isCorrect: false }],
        },
      ],
    };
    const issues = examDraftIssues(invalid);
    expect(issues).toHaveLength(9);
    expect(issues.filter((issue) => issue.questionIndex === 0)).toHaveLength(5);
    expect(examDraftIssues({ ...draft, maxAttemptsDefault: "1.5" })).toHaveLength(1);
    expect(examDraftIssues({ ...draft, passingScorePercent: "101" })).toHaveLength(1);
  });
  it("valida texto abierto, sinónimos y al menos una pregunta", () => {
    expect(examDraftIssues({ ...draft, questions: [] })[0].message).toContain("al menos una");
    expect(
      examDraftIssues({
        ...draft,
        questions: [
          { ...draft.questions[0], type: "texto_abierto", correctAnswerText: "", synonyms: [""] },
        ],
      }),
    ).toHaveLength(2);
  });
  it("PATCH solo incluye cambios y conserva null explícito al quitar el máximo", () => {
    expect(changedExamMetadata(draft, { ...draft }, false)).toEqual({});
    expect(changedExamMetadata(draft, { ...draft, maxAttemptsDefault: "1" }, false)).toEqual({
      maxAttemptsDefault: null,
    });
    expect(
      changedExamMetadata({ ...draft, title: "Nuevo", timeLimitMinutes: "40" }, draft, true),
    ).toEqual({ title: "Nuevo" });
  });
});

describe("disponibilidad orientativa para alumnos habilitados", () => {
  it("exige todas las condiciones, incluso materia publicada", () => {
    expect(examAvailability(exam, ready, now).ready).toBe(true);
    expect(examAvailability(exam, { ...ready, questionCount: 0 }, now).label).toBe(
      "Faltan preguntas",
    );
    expect(examAvailability({ ...exam, isPublished: false }, ready, now).label).toBe(
      "Falta publicarlo",
    );
    expect(examAvailability(exam, { ...ready, subject: undefined }, now).label).toBe(
      "Falta colocarlo en una materia",
    );
    expect(
      examAvailability(exam, { ...ready, subject: { ...subject, is_published: false } }, now).label,
    ).toBe("Materia en borrador");
    expect(examAvailability(exam, { ...ready, rules: [] }, now).label).toBe("Falta habilitarlo");
  });
  it("distingue fechas futuras, vencidas, límites exactos y bloqueos", () => {
    const check = (overrides: Partial<AccessRule>) =>
      examAvailability(exam, { ...ready, rules: [{ ...rule, ...overrides }] }, now);
    expect(check({ opens_at: new Date(now).toISOString() }).ready).toBe(true);
    expect(check({ opens_at: new Date(now + 1).toISOString() }).label).toBe(
      "Habilitación programada",
    );
    expect(check({ closes_at: new Date(now).toISOString() }).label).toBe("Habilitaciones cerradas");
    expect(check({ habilitado: false }).label).toBe("Habilitaciones bloqueadas");
  });
  it("nunca afirma acceso con datos incompletos o fallos", () => {
    for (const missing of [
      { ...ready, questionCount: undefined },
      { ...ready, rules: undefined },
      { ...ready, placementKnown: false },
      { ...ready, failed: true },
    ]) {
      expect(examAvailability(exam, missing, now)).toMatchObject({
        label: "Disponibilidad por verificar",
        ready: false,
      });
    }
  });
});
