import { api } from "./client";
import type { StudentList } from "@/types/student";
import type {
  AccessPayload,
  AccessRule,
  CohortProgress,
  CourseMaterial,
  CourseProgress,
  CourseSubject,
  ExamResult,
  SubjectItem,
} from "@/types/content";
const root = "/admin/content";
export const contentApi = {
  people: async (course: string) => {
    const path = (page: number) =>
      `/admin/estudiantes?courseId=${course}&activo=true&pendienteCohorte=false&pageSize=100&page=${page}`;
    const first = await api.get<StudentList>(path(1), { cache: "no-store" });
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, Math.ceil(first.total / 100) - 1) }, (_, i) =>
        api.get<StudentList>(path(i + 2), { cache: "no-store" }),
      ),
    );
    return [
      ...new Map(
        [first, ...rest]
          .flatMap((page) => page.items)
          .flatMap((student) => {
            const enrollment = student.matchingEnrollments.find(
              (e) => e.courseId === course && e.status === "activo" && e.cohortId,
            );
            return student.activo && enrollment
              ? ([
                  [
                    student.id,
                    {
                      id: student.id,
                      nombreCompleto: student.nombreCompleto,
                      cohortId: enrollment.cohortId!,
                    },
                  ],
                ] as const)
              : [];
          }),
      ).values(),
    ];
  },
  subjects: (course: string) =>
    api.get<CourseSubject[]>(`${root}/courses/${course}/subjects`, { cache: "no-store" }),
  items: (subject: string) =>
    api.get<SubjectItem[]>(`${root}/subjects/${subject}/items`, { cache: "no-store" }),
  rules: (item: string) =>
    api.get<AccessRule[]>(`${root}/items/${item}/rules`, { cache: "no-store" }),
  saveRule: (data: AccessPayload) => api.put<{ changed: number }>(`${root}/access-rules`, data),
  saveSubject: (id: string | null, data: Partial<CourseSubject>) =>
    id
      ? api.patch<CourseSubject>(`${root}/subjects/${id}`, data)
      : api.post<CourseSubject>(`${root}/subjects`, data),
  saveMaterial: (id: string | null, data: Partial<CourseMaterial>) =>
    id
      ? api.patch<CourseMaterial>(`${root}/materials/${id}`, data)
      : api.post<CourseMaterial>(`${root}/materials`, data),
  upload: (file: File, title: string, description: string) => {
    const data = new FormData();
    data.append("file", file);
    data.append("title", title);
    data.append("description", description);
    return api.post<CourseMaterial>(`${root}/materials/upload`, data);
  },
  place: (data: Partial<SubjectItem>) => api.post<SubjectItem>(`${root}/items`, data),
  patchItem: (id: string, data: Partial<SubjectItem>) =>
    api.patch<SubjectItem>(`${root}/items/${id}`, data),
  orderSubjects: (course: string, ids: string[]) =>
    api.put(`${root}/courses/${course}/subjects/order`, { ids }),
  orderItems: (subject: string, ids: string[]) =>
    api.put(`${root}/subjects/${subject}/items/order`, { ids }),
  remove: (kind: "subjects" | "materials" | "items", id: string) =>
    api.delete<{ storage_cleanup_pending?: boolean }>(`${root}/${kind}/${id}`),
  results: (exam: string, cohort = "") =>
    api.get<ExamResult[]>(`${root}/exams/${exam}/results${cohort ? `?cohort_id=${cohort}` : ""}`, {
      cache: "no-store",
    }),
  cohortProgress: (id: string) =>
    api.get<CohortProgress>(`${root}/cohorts/${id}/progress`, { cache: "no-store" }),
  studentProgress: (id: string, course: string) =>
    api.get<CourseProgress>(`${root}/students/${id}/courses/${course}/progress`, {
      cache: "no-store",
    }),
};
