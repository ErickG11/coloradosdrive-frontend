"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { StudentExam } from "@/components/student-content/StudentExam";
import { StudentLoading } from "@/components/student-content/StudentContentUI";

export default function TakeExamPage() {
  return (
    <Suspense fallback={<StudentLoading />}>
      <ExamRoute />
    </Suspense>
  );
}
function ExamRoute() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const courseId = query.get("course_id");
  return <StudentExam key={`${id}:${courseId ?? ""}`} examId={id} courseId={courseId} />;
}
