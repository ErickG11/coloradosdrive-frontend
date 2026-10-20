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
 * formulario se respeta. Después de cada render revalida el mensaje propio:
 * si el campo ya es válido por otra vía (el valor controlado cambió sin
 * evento input, o cambiaron min/max/required/pattern), lo limpia para no
 * dejar el campo bloqueado por un mensaje viejo.
 */
export function useValidationMessages<E extends ValidatableElement>({
  onInvalid,
  onInput,
}: ValidationHandlers<E>) {
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

  // Sin dependencias a propósito: corre tras cada render del campo.
  useEffect(() => {
    const current = owned.current;
    if (!current || current.element.validationMessage !== current.message) return;
    current.element.setCustomValidity("");
    const message = getValidationMessage(current.element);
    if (message) {
      current.element.setCustomValidity(message);
      owned.current = { element: current.element, message };
    } else {
      owned.current = null;
    }
  });

  return { onInvalid: handleInvalid, onInput: handleInput };
}
