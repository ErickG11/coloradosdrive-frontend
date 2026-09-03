import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold">
          <span className="text-text-primary">Colorados</span>
          <span className="text-accent-red">Drive</span>
        </span>
      </div>
      <h1 className="mb-6 text-center font-display text-xl font-semibold text-text-primary">
        Iniciar sesión
      </h1>
      <LoginForm />
    </div>
  );
}
