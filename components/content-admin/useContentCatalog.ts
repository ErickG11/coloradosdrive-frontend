"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Course, Cohort, Exam } from "@/types";
import type { CourseMaterial, CourseSubject, SubjectItem } from "@/types/content";
import { contentErrorMessage } from "@/lib/utils/content";
export interface ContentCatalog {
  courses: Course[];
  cohorts: Cohort[];
  exams: Exam[];
  materials: CourseMaterial[];
  subjects: CourseSubject[];
  items: SubjectItem[];
  names: { id: string; nombreCompleto: string }[];
}
export function useContentCatalog() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    revision: number;
    data: ContentCatalog | null;
    error: string | null;
  }>({ revision: -1, data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal, cache: "no-store" as const };
    async function load() {
      const [courses, cohorts, exams, materials, names] = await Promise.all([
        api.get<Course[]>("/courses", options),
        api.get<Cohort[]>("/cohorts", options),
        api.get<Exam[]>("/exams", options),
        api.get<CourseMaterial[]>("/admin/content/materials", options),
        api.get<{ id: string; nombreCompleto: string }[]>("/users?rol=estudiante", options),
      ]);
      const subjects = (
        await Promise.all(
          courses.map((course) =>
            api.get<CourseSubject[]>(`/admin/content/courses/${course.id}/subjects`, options),
          ),
        )
      ).flat();
      const items = (
        await Promise.all(
          subjects.map((subject) =>
            api.get<SubjectItem[]>(`/admin/content/subjects/${subject.id}/items`, options),
          ),
        )
      ).flat();
      if (!controller.signal.aborted)
        setState({
          revision,
          data: { courses, cohorts, exams, materials, subjects, items, names },
          error: null,
        });
    }
    void load().catch((error: unknown) => {
      if (!controller.signal.aborted)
        setState({ revision, data: null, error: contentErrorMessage(error) });
    });
    return () => controller.abort();
  }, [revision]);
  const current = state.revision === revision;
  return {
    data: state.data,
    error: current ? state.error : null,
    loading: !current && !state.data,
    refreshing: !current && Boolean(state.data),
    reload: useCallback(() => setRevision((value) => value + 1), []),
  };
}
