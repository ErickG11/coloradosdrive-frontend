import type { ExamForStudent } from "./exam";

export type AttemptStatus = "en_progreso" | "completado";

// Refleja coloradosdrive-backend/src/models/examAttempt.model.ts.
// Igual que AttemptAnswerDetail (la respuesta inmediata de submit) pero
// sin puntos: GET /exams/:id/attempts/me no los expone. Nunca incluye la
// respuesta correcta (ver docs/adr/006 en el backend).
export interface AttemptOwnAnswer {
  questionId: string;
  prompt: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  status: AttemptStatus;
  scorePercent: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  // Presente solo cuando status = "completado".
  answers?: AttemptOwnAnswer[];
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
