"use client";
import { useParams } from "next/navigation";
import { ContentLoad } from "@/components/content-admin/ContentUI";
import { useContentResource } from "@/components/content-admin/useContentResource";
import type { Course, ExamWithQuestions } from "@/types";
import type { ExamResult } from "@/types/content";
import { ExamForm, examToFormValues } from "../../ExamForm";
export default function EditExamPage() {
  const params = useParams<{ id: string }>();
  const courses = useContentResource<Course[]>("/courses");
  const exam = useContentResource<ExamWithQuestions>(`/exams/${params.id}`);
  const results = useContentResource<ExamResult[]>(`/admin/content/exams/${params.id}/results`);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Editar examen</h1>
      <ContentLoad
        loading={courses.loading || exam.loading || results.loading}
        error={courses.error ?? exam.error ?? results.error}
        retry={() => {
          courses.reload();
          exam.reload();
          results.reload();
        }}
      >
        {courses.data && exam.data && results.data ? (
          <ExamForm
            key={exam.data.id}
            courses={courses.data}
            examId={exam.data.id}
            initialValues={examToFormValues(exam.data)}
            hasAttempts={results.data.some((r) => r.intentos_usados > 0)}
          />
        ) : null}
      </ContentLoad>
    </div>
  );
}
