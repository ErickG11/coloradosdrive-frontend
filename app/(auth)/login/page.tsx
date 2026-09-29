import Link from "next/link";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <span aria-hidden="true">←</span>
        Volver al inicio
      </Link>
      <h1 className="mb-6 text-center font-display text-3xl font-bold tracking-tight text-text-primary">
        Iniciar sesión
      </h1>
      <LoginForm />
    </div>
  );
}
