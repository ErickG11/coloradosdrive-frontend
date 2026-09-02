import type { ReactNode } from "react";

// Layout propio del grupo (auth): sin el navbar de la app.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4">
      {children}
    </div>
  );
}
