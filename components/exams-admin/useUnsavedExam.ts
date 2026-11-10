"use client";
import { useEffect } from "react";

export function useUnsavedExam(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const message = "Tienes cambios sin guardar. ¿Quieres salir y descartarlos?";
    const url = window.location.href;
    const state = window.history.state;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      if (anchor.href !== window.location.href && !window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const back = (event: PopStateEvent) => {
      if (!window.confirm(message)) {
        event.stopImmediatePropagation();
        window.history.pushState(state, "", url);
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", back, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", back, true);
    };
  }, [dirty]);
}
