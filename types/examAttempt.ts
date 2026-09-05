import type { ExamForStudent } from "./exam";

export type AttemptStatus = "en_progreso" | "completado";

// Refleja coloradosdrive-backend/src/models/examAttempt.model.ts.
// GET /exams/:id/attempts/me devuelve esta forma resumida (sin detalle
// por pregunta) — el desglose de respuestas solo viaja en la respuesta
// inmediata de POST /attempts/:id/submit (ver AttemptResult).
export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  status: AttemptStatus;
  scorePercent: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SubmitAnswerInput {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

export interface SubmitAttemptInput {
  answers: SubmitAnswerInput[];
}

export interface AttemptAnswerDetail {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  similarityScore: number | null;
}

export interface AttemptResult {
  attemptId: string;
  examId: string;
  status: AttemptStatus;
  scorePercent: number;
  passed: boolean;
  startedAt: string;
  completedAt: string;
  answers: AttemptAnswerDetail[];
}

// Respuesta de POST /exams/:id/attempts.
export interface StartAttemptResult {
  attemptId: string;
  status: AttemptStatus;
  startedAt: string;
  exam: ExamForStudent;
}
