import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { ToastProvider } from "@/components/ui/Toast";

/** Monta la pantalla con el proveedor de avisos del layout raíz. */
export function renderWithToast(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: ToastProvider });
}

/** Texto de los avisos verdes visibles. */
export function toastTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-testid="toast"] p')).map(
    (node) => node.textContent ?? "",
  );
}
