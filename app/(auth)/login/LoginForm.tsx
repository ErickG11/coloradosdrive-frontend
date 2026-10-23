"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui";
import { LoginIcon } from "@/components/auth/LoginIcon";
import styles from "@/components/auth/login.module.css";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/getUserRole";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.code === "user_banned"
          ? "Tu cuenta está inactiva. Contacta al administrador."
          : "Correo o contraseña incorrectos.",
      );
      setIsLoading(false);
      return;
    }

    const role = getUserRole(data.user);
    if (!role) {
      setError("Tu cuenta no tiene un rol asignado. Contacta al administrador.");
      setIsLoading(false);
      return;
    }

    router.push(getRoleHomePath(role));
    router.refresh();
  }

  return (
    <>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={styles.form}
        data-error={Boolean(error)}
      >
        <label className="sr-only" htmlFor="login-email">
          Correo electrónico
        </label>
        <div className={styles.field}>
          <LoginIcon name="user" />
          <input
            id="login-email"
            placeholder="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <label className="sr-only" htmlFor="login-password">
          Contraseña
        </label>
        <div className={styles.field}>
          <LoginIcon name="lock" />
          <input
            id="login-password"
            placeholder="Contraseña"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-controls="login-password"
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
          >
            <LoginIcon name={showPassword ? "eyeOff" : "eye"} />
          </button>
        </div>
        {error ? (
          <p id="login-error" role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <Button type="submit" isLoading={isLoading} className={styles.submit}>
          <span>Iniciar sesión</span>
          <LoginIcon name="arrow" />
        </Button>
      </form>
      <Link href="/" className={styles.backLink}>
        <LoginIcon name="back" />
        Volver al inicio
      </Link>
    </>
  );
}
