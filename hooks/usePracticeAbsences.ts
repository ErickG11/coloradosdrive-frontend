"use client";
import { useEffect } from "react";
import { useFetch } from "@/hooks/useFetch";
import type { AdminPracticeAbsence } from "@/types/practiceBlock";
export function usePracticeAbsences(studentId?: string) {
  const path =
    "/practice-slots/blocks/admin-absences" +
    (studentId ? `?studentId=${encodeURIComponent(studentId)}` : "");
  const result = useFetch<AdminPracticeAbsence[]>(path);
  const { refetch } = result;
  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener("focus", refresh);
    window.addEventListener("practice-notifications-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("practice-notifications-updated", refresh);
    };
  }, [refetch]);
  return result;
}
