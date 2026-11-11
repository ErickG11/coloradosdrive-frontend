"use client";
import { useCallback, useEffect, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/getUserRole";
import type { PracticeHistoryEnrollment } from "@/types/practiceAttendance";
import type { PublicCourse } from "@/types/publicCourse";
import type { StudentPracticeSlot } from "@/types/practiceSlot";
import type { EnrollmentIdentity } from "./enrollmentModel";

export function useEnrollmentOverview(refreshStatus: () => void) {
  const enrollments = useFetch<PracticeHistoryEnrollment[]>(
    "/estudiantes/practice-history/enrollments",
  );
  const slots = useFetch<StudentPracticeSlot[]>("/practice-slots");
  const courses = useFetch<PublicCourse[]>("/public/courses");
  const [account, setAccount] = useState<EnrollmentIdentity | null>(null);
  const [identityError, setIdentityError] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [accountVersion, setAccountVersion] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const refreshEnrollments = enrollments.refetch,
    refreshSlots = slots.refetch,
    refreshCourses = courses.refetch;
  const refresh = useCallback(() => {
    refreshStatus();
    refreshEnrollments();
    refreshSlots();
    refreshCourses();
    setAccountVersion((value) => value + 1);
  }, [refreshStatus, refreshEnrollments, refreshSlots, refreshCourses]);
  useEffect(() => {
    let cancelled = false;
    // Keep only display fields from the verified user; no session/token/credential is stored here.
    createClient()
      .auth.getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        const user = data.user;
        setIdentityError(Boolean(error || !user));
        if (user && !error)
          setAccount({
            id: user.id,
            email: user.email ?? null,
            role: getUserRole(user),
            createdAt: user.created_at ?? null,
            name: null,
            cedula: null,
          });
        else setAccount(null);
        setIdentityReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAccount(null);
          setIdentityError(true);
          setIdentityReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountVersion]);
  useRealtimeChannel(account ? `user-${account.id}-practice-slots` : null, {
    "slots-updated": refresh,
    "confirmation-requested": refresh,
    "no-practice": refresh,
  });
  useEffect(() => {
    const visible = () => {
      if (!document.hidden) refresh();
    };
    const timer = window.setInterval(visible, 60_000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [refresh]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  const ownSlots = account
    ? (slots.data ?? []).filter(
        (slot) =>
          slot.studentId === account.id &&
          ["asignado", "confirmado", "completado"].includes(slot.status),
      )
    : [];
  // The existing student API embeds the verified profile name in own practice rows.
  // No profile endpoint currently exposes the cédula to the student.
  const name = ownSlots.find((slot) => slot.studentName?.trim())?.studentName ?? null;
  return {
    enrollments,
    slots,
    courses,
    ownSlots,
    identity: account ? { ...account, name } : null,
    identityError,
    identityReady,
    now,
    refresh,
  };
}
