"use client";

import { useEffect, useState } from "react";

interface UseCountdownResult {
  remainingSeconds: number;
  isExpired: boolean;
}

function computeRemainingSeconds(startedAt: string, timeLimitMinutes: number): number {
  const deadline = new Date(startedAt).getTime() + timeLimitMinutes * 60_000;
  return Math.max(0, Math.round((deadline - Date.now()) / 1000));
}

// Cronómetro visual basado en startedAt + timeLimitMinutes, para que el
// estudiante vea cuánto tiempo le queda mientras responde. Es solo una
// referencia de UX: el backend es la autoridad real del tiempo (ver
// docs/adr/005 en coloradosdrive-backend) y vuelve a validar contra sus
// propios timestamps al recibir el submit, sin importar lo que este
// cronómetro muestre.
export function useCountdown(startedAt: string, timeLimitMinutes: number): UseCountdownResult {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    computeRemainingSeconds(startedAt, timeLimitMinutes),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds(startedAt, timeLimitMinutes));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timeLimitMinutes]);

  return { remainingSeconds, isExpired: remainingSeconds <= 0 };
}
