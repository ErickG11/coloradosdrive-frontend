"use client";

import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// Header público, sticky arriba (mismo tratamiento "vidrio" que
// Sidebar/topbar móvil del área autenticada: bg-surface-raised +
// backdrop-blur + border-b) para que la landing se sienta parte de la
// misma app, no una página de marketing aparte. "use client": buttonClassName
// se exporta desde Button.tsx ("use client"), así que solo se puede invocar
// desde un Client Component (mismo patrón que el resto de la app).
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center border-b border-border bg-bg-surface-raised px-4 backdrop-blur-md md:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight text-text-primary">
          ColoradosDrive
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonClassName("primary", "md")}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
