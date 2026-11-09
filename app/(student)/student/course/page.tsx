import type { Metadata } from "next";
import { StudentCourse } from "@/components/student-content/StudentCourse";

export const metadata: Metadata = { title: "Mi curso" };
export default async function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ course_id?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <StudentCourse initialCourseId={typeof query.course_id === "string" ? query.course_id : ""} />
  );
}
