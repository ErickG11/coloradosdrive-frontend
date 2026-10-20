import type { Metadata } from "next";
import type { ReactNode } from "react";

// Layout padre: repite la plantilla porque un título de tipo string la
// descartaría para las pantallas hijas.
export const metadata: Metadata = {
  title: { default: "Exámenes", template: "%s · ColoradosDrive" },
};

export default function ExamsLayout({ children }: { children: ReactNode }) {
  return children;
}
