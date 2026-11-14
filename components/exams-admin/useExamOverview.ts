"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { contentErrorMessage } from "@/lib/utils/content";
import type { Exam, ExamWithQuestions } from "@/types/exam";
import type { AccessRule, CourseSubject, ExamResult, SubjectItem } from "@/types/content";

interface ExamOverview {
  details?: ExamWithQuestions;
  attempts?: number;
  subject?: CourseSubject;
  rules?: AccessRule[];
  errors: string[];
}
interface CourseOverview {
  entries: Record<string, ExamOverview>;
  now: number;
}
async function limited<T>(tasks: (() => Promise<T>)[], signal: AbortSignal): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, tasks.length) }, async () => {
      while (!signal.aborted && cursor < tasks.length) {
        const index = cursor++;
        results[index] = await tasks[index]();
      }
    }),
  );
  return results;
}
async function load(courseId: string, exams: Exam[], signal: AbortSignal): Promise<CourseOverview> {
  const options = { signal, cache: "no-store" as const };
  const subjects = await api.get<CourseSubject[]>(
    `/admin/content/courses/${courseId}/subjects`,
    options,
  );
  const items = (
    await limited(
      subjects.map(
        (subject) => () =>
          api.get<SubjectItem[]>(`/admin/content/subjects/${subject.id}/items`, options),
      ),
      signal,
    )
  ).flat();
  const entries: Record<string, ExamOverview> = Object.fromEntries(
    exams.map((exam) => [exam.id, { errors: [] }]),
  );
  const tasks: (() => Promise<void>)[] = [];
  const safe = (id: string, work: () => Promise<void>) => async () => {
    try {
      await work();
    } catch (error) {
      if (!signal.aborted) entries[id].errors.push(contentErrorMessage(error));
    }
  };
  for (const exam of exams) {
    const placement = items.find((item) => item.exam_id === exam.id);
    entries[exam.id].subject = subjects.find((subject) => subject.id === placement?.subject_id);
    tasks.push(
      safe(exam.id, async () => {
        entries[exam.id].details = await api.get<ExamWithQuestions>(`/exams/${exam.id}`, options);
      }),
    );
    tasks.push(
      safe(exam.id, async () => {
        const results = await api.get<ExamResult[]>(
          `/admin/content/exams/${exam.id}/results`,
          options,
        );
        entries[exam.id].attempts = results.reduce((sum, row) => sum + row.intentos_usados, 0);
      }),
    );
    if (placement)
      tasks.push(
        safe(exam.id, async () => {
          entries[exam.id].rules = await api.get<AccessRule[]>(
            `/admin/content/items/${placement.id}/rules`,
            options,
          );
        }),
      );
    else entries[exam.id].rules = [];
  }
  await limited(tasks, signal);
  return { entries, now: Date.now() };
}
export function useExamOverview(courseId: string | null, exams: Exam[]) {
  const [revision, setRevision] = useState(0);
  const version = exams.map((exam) => `${exam.id}:${exam.updatedAt}`).join(",");
  const key = `${courseId}:${version}:${revision}`;
  const cache = useRef(new Map<string, CourseOverview>());
  const [state, setState] = useState<{
    key: string;
    data: CourseOverview | null;
    error: string | null;
  }>({ key: "", data: null, error: null });
  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    const stored = cache.current.get(key);
    const request =
      stored && Date.now() - stored.now < 30_000
        ? Promise.resolve(stored)
        : load(courseId, exams, controller.signal);
    request
      .then((data) => {
        if (!controller.signal.aborted) {
          if (Object.values(data.entries).every((entry) => !entry.errors.length))
            cache.current.set(key, data);
          setState({ key, data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error: contentErrorMessage(error) });
      });
    return () => controller.abort();
  }, [courseId, exams, key]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: Boolean(courseId) && state.key !== key,
    reload: useCallback(() => {
      cache.current.clear();
      setRevision((value) => value + 1);
    }, []),
  };
}
