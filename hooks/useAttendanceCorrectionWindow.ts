"use client";

import { useEffect, useState } from "react";
import { correctionDeadline } from "@/lib/utils/practiceAttendance";

export function useAttendanceCorrectionWindow(scheduledAt: string, durationMinutes: number) {
  const [clock, setClock] = useState(() => Date.now());
  const deadline = correctionDeadline(scheduledAt, durationMinutes);
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const remaining = deadline - Date.now();
    const timer =
      Number.isFinite(remaining) && remaining >= 0
        ? window.setTimeout(refresh, Math.min(remaining + 1, 2_147_483_647))
        : undefined;
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [deadline, clock]);
  return Number.isFinite(deadline) && clock <= deadline;
}
