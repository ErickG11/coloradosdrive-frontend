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
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <span className="text-lg font-semibold text-zinc-900">ColoradosDrive</span>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end text-sm">
          {email ? <span className="text-zinc-900">{email}</span> : null}
          <span className="text-zinc-500">{role ? ROLE_LABELS[role] : "Invitado"}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
