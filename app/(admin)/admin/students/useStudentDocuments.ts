"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { AdminStudent, StudentDetail } from "@/types";

export interface DocumentSummary {
  delivered: number;
  applicable: number;
  pending: number;
  registered: number;
}
export function useStudentDocuments(students: AdminStudent[], version: number) {
  const [snapshot, setSnapshot] = useState<{
    source: AdminStudent[];
    version: number;
    values: Record<string, DocumentSummary | null>;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let index = 0;
    const values: Record<string, DocumentSummary | null> = {};
    async function worker() {
      while (index < students.length && !cancelled) {
        const student = students[index++];
        try {
          const detail = await api.get<StudentDetail>(`/admin/estudiantes/${student.id}`, {
            signal: controller.signal,
          });
          const ids = new Set(student.matchingEnrollments.map((e) => e.id));
          const docs = detail.enrollments
            .filter((e) => ids.has(e.enrollmentId))
            .flatMap((e) => e.documentos);
          values[student.id] = {
            registered: docs.length,
            delivered: docs.filter((d) => d.estado === "entregado").length,
            applicable: docs.filter((d) => d.estado !== "no_aplica").length,
            pending: docs.filter((d) => d.estado === "pendiente").length,
          };
        } catch {
          values[student.id] = null;
        }
      }
    }
    Promise.all(Array.from({ length: Math.min(4, students.length) }, worker)).then(() => {
      if (!cancelled) setSnapshot({ source: students, version, values });
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [students, version]);
  return snapshot?.source === students && snapshot.version === version ? snapshot.values : {};
}
