"use client";
import { useEffect } from "react";
import { useFetch } from "@/hooks/useFetch";
import type { AdminPracticeAbsence } from "@/types/practiceBlock";
export function usePracticeAbsences(studentId?: string) {
  const path =
    "/practice-slots/blocks/admin-absences" +
    (studentId ? `?studentId=${encodeURIComponent(studentId)}` : "");
  const result = useFetch<AdminPracticeAbsence[]>(path);
  useEffect(() => {
    const refresh = () => result.refetch();
    window.addEventListener("focus", refresh);
    window.addEventListener("practice-notifications-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("practice-notifications-updated", refresh);
    };
  }, [result.refetch]);
  return result;
}
