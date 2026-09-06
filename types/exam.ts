export type ExamType = "practica" | "definitivo";
export type QuestionType = "opcion_multiple" | "texto_abierto";

// Refleja coloradosdrive-backend/src/models/exam.model.ts.
export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

// Forma que devuelve el backend al estudiante (POST /exams/:id/attempts):
// nunca incluye isCorrect.
export type QuestionOptionForStudent = Omit<QuestionOption, "isCorrect">;

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  prompt: string;
  orderIndex: number;
  points: number;
  correctAnswerText: string | null;
  synonyms: string[] | null;
  options: QuestionOption[];
}

// El backend nunca envía correctAnswerText/synonyms al estudiante.
export type QuestionForStudent = Omit<Question, "correctAnswerText" | "synonyms" | "options"> & {
  options: QuestionOptionForStudent[];
};

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  type: ExamType;
  timeLimitMinutes: number;
  passingScorePercent: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamWithQuestions extends Exam {
  questions: Question[];
}

export interface ExamForStudent extends Exam {
  questions: QuestionForStudent[];
}

export interface CreateQuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface CreateQuestionInput {
  type: QuestionType;
  prompt: string;
  orderIndex: number;
  points: number;
  correctAnswerText?: string;
  synonyms?: string[];
  options?: CreateQuestionOptionInput[];
}

// POST /exams: el examen y su banco de preguntas en una sola operación.
export interface CreateExamInput {
  courseId: string;
  title: string;
  type: ExamType;
  timeLimitMinutes: number;
  passingScorePercent: number;
  questions: CreateQuestionInput[];
}

// El backend no permite cambiar type ni courseId después de creado
// (ver docs/adr y questions_open_text_has_answer en la migración 004).
export type UpdateExamInput = Partial<{
  title: string;
  timeLimitMinutes: number;
  passingScorePercent: number;
  isPublished: boolean;
}>;

export type UpdateQuestionInput = Partial<Omit<CreateQuestionInput, "options" | "type">> & {
  options?: CreateQuestionOptionInput[];
};
