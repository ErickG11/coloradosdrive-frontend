"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

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
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.focus();
    function controls() {
      return Array.from(element!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) =>
          !item.closest("[hidden],[inert]") &&
          getComputedStyle(item).display !== "none" &&
          getComputedStyle(item).visibility !== "hidden",
      );
    }
    function onKey(event: KeyboardEvent) {
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
    function onFocus(event: FocusEvent) {
      if (!element!.contains(event.target as Node)) element!.focus();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, panel]);
}
