"use client";

import { useContentResource } from "@/components/content-admin/useContentResource";
import { ContentLoad } from "@/components/content-admin/ContentUI";
import type { Course } from "@/types";

import { ExamForm } from "../ExamForm";

export default function NewExamPage() {
  const { data: courses, loading, error, reload } = useContentResource<Course[]>("/courses");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Nuevo examen</h1>
      <ContentLoad loading={loading} error={error} retry={reload} empty={courses?.length === 0}>
        {courses ? <ExamForm courses={courses} /> : null}
      </ContentLoad>
    </div>
  );
}
