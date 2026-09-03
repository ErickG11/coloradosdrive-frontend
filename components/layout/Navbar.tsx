import type { Role } from "@/types/user";

import { LogoutButton } from "./LogoutButton";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  estudiante: "Estudiante",
  instructor: "Instructor",
};

interface NavbarProps {
  email: string | null;
  role: Role | null;
}

export function Navbar({ email, role }: NavbarProps) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-bg-surface px-4 sm:px-6">
      {/* Sin logo: wordmark en dos colores (blanco + rojo de acento) como
          identidad de marca de puro tipografía, en Space Grotesk. */}
      <span className="truncate font-display text-lg font-bold">
        <span className="text-text-primary">Colorados</span>
        <span className="text-accent-red">Drive</span>
      </span>
      <div className="flex min-w-0 items-center gap-3">
        {/* El correo se oculta bajo el breakpoint sm (375px) para que no
            desborde junto con el badge de rol y el botón de logout;
            vuelve a mostrarse desde 768px. */}
        {email ? (
          <span className="hidden max-w-[180px] truncate font-sans text-sm text-text-primary sm:inline">
            {email}
          </span>
        ) : null}
        <span className="whitespace-nowrap rounded-full bg-accent-blue-subtle px-2.5 py-1 font-sans text-xs font-medium uppercase tracking-wide text-accent-blue">
          {role ? ROLE_LABELS[role] : "Invitado"}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
