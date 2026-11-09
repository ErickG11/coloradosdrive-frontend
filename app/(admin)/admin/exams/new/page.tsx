"use client";

import { Card } from "@/components/ui/Card";
import { useContentResource } from "@/components/content-admin/useContentResource";
import { ContentLoad } from "@/components/content-admin/ContentUI";
import type { Course } from "@/types";

import { ExamForm } from "../ExamForm";

export default function NewExamPage() {
  const { data: courses, loading, error, reload } = useContentResource<Course[]>("/courses");

  return (
    <Card title="Nuevo examen" titleAs="h1">
      <ContentLoad loading={loading} error={error} retry={reload} empty={courses?.length === 0}>
        {courses ? <ExamForm courses={courses} /> : null}
      </ContentLoad>
    </Card>
  );
}
