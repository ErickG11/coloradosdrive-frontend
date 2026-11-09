import { api } from "./client";
import { ApiError } from "./errors";
import { serverClock } from "@/lib/utils/studentContent";
import type { StudentCatalog, StudentCourse } from "@/types/studentContent";

export const ownCourses = (signal?: AbortSignal) =>
  api.get<StudentCourse[]>("/estudiantes/content/courses", { signal, cache: "no-store" });

export async function ownCatalog(courseId: string, signal?: AbortSignal) {
  const sent = performance.now();
  const catalog = await api.get<StudentCatalog>(
    `/estudiantes/content/course?course_id=${encodeURIComponent(courseId)}`,
    { signal, cache: "no-store" },
  );
  return { catalog, clock: serverClock(catalog.server_now, sent, performance.now()) };
}

// Legacy exam links have no course query: discover placement only in the JWT's eligible courses.
export async function ownExamContext(
  examId: string,
  preferred: string | null,
  signal?: AbortSignal,
) {
  const courses = await ownCourses(signal);
  const candidates = preferred
    ? courses.filter((course) => course.course_id === preferred)
    : courses;
  for (const course of candidates) {
    const context = await ownCatalog(course.course_id, signal);
    const item = context.catalog.materias
      .flatMap((subject) => subject.items)
      .find((entry) => entry.kind === "examen" && entry.exam_id === examId);
    if (item) return { ...context, item };
  }
  throw new ApiError("Unavailable", 404, { code: "ITEM_NOT_FOUND" });
}
