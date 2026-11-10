import type { ExamType, QuestionType } from "./exam";

export interface QuestionOptionFormValue {
  id?: string;
  optionText: string;
  isCorrect: boolean;
}
export interface QuestionFormValue {
  orderIndex?: number;
  draftKey?: string;
  id?: string;
  type: QuestionType;
  prompt: string;
  points: string;
  correctAnswerText: string;
  synonyms: string[];
  options: QuestionOptionFormValue[];
}
export interface ExamFormValues {
  courseId: string;
  title: string;
  type: ExamType;
  timeLimitMinutes: string;
  passingScorePercent: string;
  isPublished: boolean;
  questions: QuestionFormValue[];
  description?: string;
  maxAttemptsDefault?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}
