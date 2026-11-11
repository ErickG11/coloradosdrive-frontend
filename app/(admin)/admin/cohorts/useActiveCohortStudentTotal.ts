"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Cohort, StudentList } from "@/types";

// Count unique enabled students with active enrollments, using the existing paginated API.
export function useActiveCohortStudentTotal(cohorts: Cohort[] | null, activeIds: string | null) {
  const [snapshot, setSnapshot] = useState<{
    source: Cohort[] | null;
    key: string | null;
    total: number | null;
  }>({ source: null, key: null, total: null });
  useEffect(() => {
    if (!cohorts || activeIds === null) return;
    let cancelled = false;
    async function load() {
      const students = new Set<string>();
      try {
        for (const id of activeIds!.split(",").filter(Boolean)) {
          let page = 1;
          while (!cancelled) {
            const result = await api.get<StudentList>(
              `/admin/estudiantes?cohortId=${id}&activo=true&pageSize=100&page=${page}`,
            );
            for (const student of result.items) {
              if (
                student.activo &&
                student.matchingEnrollments.some((e) => e.cohortId === id && e.status === "activo")
              )
                students.add(student.id);
            }
            if (page * result.pageSize >= result.total) break;
            if (result.items.length === 0) throw new Error("Incomplete student page");
            page++;
          }
        }
        if (!cancelled) setSnapshot({ source: cohorts, key: activeIds, total: students.size });
      } catch {
        if (!cancelled) setSnapshot({ source: cohorts, key: activeIds, total: null });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cohorts, activeIds]);
  return snapshot.source === cohorts && snapshot.key === activeIds ? snapshot.total : undefined;
}
