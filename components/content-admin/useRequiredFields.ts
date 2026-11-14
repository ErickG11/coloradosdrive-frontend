"use client";
import { useCallback, useState } from "react";

export const REQUIRED_MESSAGE = "Este campo es obligatorio.";

// Obligatoriedad del módulo de Contenido: sin errores hasta intentar enviar; el aviso
// desaparece al corregir el campo y el foco va al primer campo inválido.
export function useRequiredFields() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clear = useCallback((id: string) => {
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const check = useCallback((fields: { id: string; empty: boolean }[]) => {
    const missing = fields.filter((field) => field.empty);
    setErrors(Object.fromEntries(missing.map((field) => [field.id, REQUIRED_MESSAGE])));
    if (!missing.length) return true;
    window.requestAnimationFrame(() => document.getElementById(missing[0].id)?.focus());
    return false;
  }, []);
  return { errors, clear, check };
}
