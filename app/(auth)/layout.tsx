import type { ReactNode } from "react";

import { LoginHeroImage } from "@/components/layout/LoginHeroImage";

// Layout propio del grupo (auth): sin el sidebar de la app. Columna de
// imagen a la izquierda desde 768px (oculta antes: en 375px el espacio es
// para el formulario, no para decoración — RNF-04); acento circular sutil
// detrás del formulario.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <LoginHeroImage />
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent-red/20 blur-3xl"
        />
        <div className="relative z-10 w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
