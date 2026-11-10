import { api } from "./client";
import { validateQuestionImage } from "@/lib/utils/questionImages";
import type { AttemptQuestionImage, Question } from "@/types/exam";

const endpoint = (examId: string, questionId: string) =>
  `/admin/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}/image`;
export const questionImageApi = {
  async upload(examId: string, questionId: string, file: File, alt: string): Promise<Question> {
    const type = await validateQuestionImage(file);
    const form = new FormData();
    form.append("image", file, type.filename);
    form.append("alt", alt.trim());
    return api.post<Question>(endpoint(examId, questionId), form);
  },
  alt: (examId: string, questionId: string, alt: string) =>
    api.patch<Question>(endpoint(examId, questionId), { alt: alt.trim() || null }),
  remove: (examId: string, questionId: string) => api.delete<void>(endpoint(examId, questionId)),
  refresh: (attemptId: string, signal?: AbortSignal) =>
    api.get<AttemptQuestionImage[]>(`/attempts/${encodeURIComponent(attemptId)}/images`, {
      signal,
      cache: "no-store",
    }),
};
