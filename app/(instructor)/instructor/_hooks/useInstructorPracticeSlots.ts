"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { dayKey, getWeekDays } from "@/lib/utils/calendar";
import { parseSchoolDateKey, schoolCalendarDate, schoolWeekRange } from "@/lib/utils/schoolTime";
import { readBlocks, type AgendaSlot, type BlockDefinition } from "../_lib/instructorAgenda";

export function useInstructorPracticeSlots(fecha: string | null) {
  const [requestedWeek, setRequestedWeek] = useState(
    () => parseSchoolDateKey(fecha) ?? schoolCalendarDate(new Date()),
  );
  const [currentDate, setCurrentDate] = useState(requestedWeek);
  const targetDate = useRef(requestedWeek);
  const [requestId, setRequestId] = useState(0);
  const [data, setData] = useState<AgendaSlot[] | null>(null);
  const [definitions, setDefinitions] = useState<BlockDefinition[]>([]);
  const [blocksFailed, setBlocksFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appliedFecha = useRef(fecha);
  const requestWeek = useCallback((date: Date) => {
    targetDate.current = date;
    setError(null);
    setIsLoading(true);
    setRequestedWeek(date);
    setRequestId((id) => id + 1);
  }, []);
  const selectDay = (date: Date) => {
    targetDate.current = date;
    setCurrentDate(date);
  };

  useEffect(() => {
    if (appliedFecha.current === fecha) return;
    appliedFecha.current = fecha;
    const date = parseSchoolDateKey(fecha);
    if (date) requestWeek(date);
  }, [fecha, requestWeek]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams(schoolWeekRange(requestedWeek));
    const days = getWeekDays(requestedWeek);
    const blockParams = new URLSearchParams({ from: dayKey(days[0]), to: dayKey(days[6]) });
    void Promise.all([
      api.get<AgendaSlot[]>(`/practice-slots?${params}`),
      api
        .get<unknown>(`/practice-slots/blocks/instructor-groups?${blockParams}`)
        .then(readBlocks, () => null),
    ]).then(
      ([slots, blocks]) => {
        if (!active) return;
        setData(slots);
        setDefinitions(blocks ?? []);
        setBlocksFailed(blocks === null);
        setCurrentDate(targetDate.current);
        setIsLoading(false);
      },
      (cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "No se pudo consultar el horario. Intenta de nuevo.",
        );
        setIsLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [requestedWeek, requestId]);

  useEffect(() => {
    const refresh = () => setRequestId((id) => id + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("practice-notifications-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("practice-notifications-updated", refresh);
    };
  }, []);
  return {
    currentDate,
    data,
    definitions,
    blocksFailed,
    isLoading,
    error,
    requestWeek,
    selectDay,
    retry: () => requestWeek(requestedWeek),
  };
}
