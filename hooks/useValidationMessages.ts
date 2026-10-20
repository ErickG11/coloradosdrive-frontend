"use client";

import { useCallback, useEffect, useRef, type FormEvent, type FormEventHandler } from "react";

import { getValidationMessage, type ValidatableElement } from "@/lib/utils/validationMessages";

interface ValidationHandlers<E extends ValidatableElement> {
  onInvalid?: FormEventHandler<E>;
  onInput?: FormEventHandler<E>;
}

/**
 * Cambia los textos nativos del navegador (en inglés u otro idioma) por
 * mensajes en español: en `invalid` fija el mensaje con setCustomValidity y
 * en `input` lo limpia, para que no quede pegado una vez corregido el campo.
 * Solo toca los mensajes que él mismo puso: un setCustomValidity del
 * formulario se respeta. `value` es el valor controlado: si cambia desde el
 * código (sin evento input), el mensaje también se limpia.
 */
export function useValidationMessages<E extends ValidatableElement>(
  { onInvalid, onInput }: ValidationHandlers<E>,
  value: unknown,
) {
  const owned = useRef<{ element: E; message: string } | null>(null);

  const clear = useCallback((element?: E) => {
    const current = owned.current;
    if (!current || (element && current.element !== element)) return;
    // Solo se limpia si el mensaje sigue siendo el nuestro.
    if (current.element.validationMessage === current.message) {
      current.element.setCustomValidity("");
    }
    owned.current = null;
  }, []);

  const handleInvalid = useCallback(
    (event: FormEvent<E>) => {
      const element = event.currentTarget;
      const foreignCustomMessage =
        element.validity.customError && element.validationMessage !== owned.current?.message;

      if (!foreignCustomMessage) {
        element.setCustomValidity("");
        const message = getValidationMessage(element);
        if (message) {
          element.setCustomValidity(message);
          owned.current = { element, message };
        } else {
          owned.current = null;
        }
      }
      onInvalid?.(event);
    },
    [onInvalid],
  );

  const handleInput = useCallback(
    (event: FormEvent<E>) => {
      clear(event.currentTarget);
      onInput?.(event);
    },
    [clear, onInput],
  );

  useEffect(() => {
    clear();
  }, [value, clear]);

  return { onInvalid: handleInvalid, onInput: handleInput };
}
