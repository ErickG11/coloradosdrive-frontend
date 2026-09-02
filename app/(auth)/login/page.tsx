import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-semibold text-zinc-900">Iniciar sesión</h1>
      <LoginForm />
    </div>
  );
}
