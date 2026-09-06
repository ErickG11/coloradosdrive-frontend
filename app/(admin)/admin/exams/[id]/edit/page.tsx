"use client";

import { useParams } from "next/navigation";

import { Card } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { Course, ExamWithQuestions } from "@/types";

import { ExamForm, type ExamFormValues } from "../../ExamForm";
import type { QuestionFormValue } from "../../QuestionBuilder";

function toFormValues(exam: ExamWithQuestions): ExamFormValues {
  return {
    courseId: exam.courseId,
    title: exam.title,
    type: exam.type,
    timeLimitMinutes: String(exam.timeLimitMinutes),
    passingScorePercent: String(exam.passingScorePercent),
    isPublished: exam.isPublished,
    questions: exam.questions
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((question): QuestionFormValue => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: String(question.points),
        correctAnswerText: question.correctAnswerText ?? "",
        synonyms: question.synonyms ?? [],
        options: question.options
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((option) => ({ optionText: option.optionText, isCorrect: option.isCorrect })),
      })),
  };
}

export default function EditExamPage() {
  const params = useParams<{ id: string }>();
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useFetch<Course[]>("/courses");
  const {
    data: exam,
    isLoading: isLoadingExam,
    error: examError,
  } = useFetch<ExamWithQuestions>(`/exams/${params.id}`);

  const isLoading = isLoadingCourses || isLoadingExam;
  const error = coursesError ?? examError;

  return (
    <Card title="Editar examen">
      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      {courses && exam ? (
        <ExamForm courses={courses} examId={exam.id} initialValues={toFormValues(exam)} />
      ) : null}
    </Card>
  );
}
