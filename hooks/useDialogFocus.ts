"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Solo el diálogo superior administra el teclado y el foco de confirmaciones anidadas.
const dialogStack: HTMLElement[] = [];
let originalOverflow = "";

export function useDialogFocus(
  open: boolean,
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const element = panel.current;
    if (!open || !element) return;
    // Si un campo del diálogo ya tomó el foco al montarse (autoFocus), se
    // respeta: no se roba para el panel ni se recuerda como foco anterior.
    if (dialogStack.length === 0) originalOverflow = document.body.style.overflow;
    dialogStack.push(element);
    const isTop = () => dialogStack.at(-1) === element;
    const active = document.activeElement;
    const focusInside = active instanceof Node && element.contains(active);
    const previous = !focusInside && active instanceof HTMLElement ? active : null;
    document.body.style.overflow = "hidden";
    if (!focusInside) element.focus();
    function controls() {
      return Array.from(element!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) =>
          !item.matches(":disabled") &&
          !item.closest("[hidden],[inert]") &&
          getComputedStyle(item).display !== "none" &&
          getComputedStyle(item).visibility !== "hidden",
      );
    }
    function onKey(event: KeyboardEvent) {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (!first) {
        event.preventDefault();
        element!.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last!.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === element)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    // El foco que sale del panel vuelve a él en el siguiente tick: si el
    // diálogo se cierra en el mismo evento (p. ej. la pantalla devuelve el foco
    // a su botón al cerrar), el desmontaje cancela el regreso.
    let refocus: number | undefined;
    function onFocus(event: FocusEvent) {
      if (!isTop() || element!.contains(event.target as Node)) return;
      window.clearTimeout(refocus);
      refocus = window.setTimeout(() => {
        if (isTop() && !element!.contains(document.activeElement)) element!.focus();
      }, 0);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      dialogStack.splice(dialogStack.lastIndexOf(element), 1);
      window.clearTimeout(refocus);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      if (dialogStack.length === 0) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected && (!dialogStack.length || dialogStack.at(-1)?.contains(previous)))
        previous.focus();
    };
  }, [open, panel]);
}
