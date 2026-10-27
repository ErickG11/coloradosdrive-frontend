"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button, FormError } from "@/components/ui";
import { LoginIcon } from "@/components/auth/LoginIcon";
import styles from "@/components/auth/login.module.css";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/getUserRole";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";

const ERROR_ID = "login-error";
const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  // Los campos son <input> propios del diseño del login (no el Input
  // compartido), así que conectan aquí los mensajes de validación en español.
  const emailValidation = useValidationMessages<HTMLInputElement>({});
  const passwordValidation = useValidationMessages<HTMLInputElement>({});
  // Solo las credenciales incorrectas son culpa de los campos; cuenta
  // inactiva o sin rol no se corrige reescribiéndolos.
  const fieldsInvalid = error === INVALID_CREDENTIALS;

  // Muestra el error y lleva el foco al correo (lo escrito se conserva).
  function fail(message: string) {
    setError(message);
    setIsLoading(false);
    emailRef.current?.focus();
  }

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
      fail(
        signInError.code === "user_banned"
          ? "Tu cuenta está inactiva. Contacta al administrador."
          : INVALID_CREDENTIALS,
      );
      return;
    }

    const role = getUserRole(data.user);
    if (!role) {
      // Sin rol no hay panel al que ir: se cierra la sesión recién creada
      // para no dejar una cookie viva detrás del mensaje.
      await supabase.auth.signOut();
      fail("Tu cuenta no tiene un rol asignado. Contacta al administrador.");
      return;
    }

    router.push(getRoleHomePath(role));
    router.refresh();
  }

  return (
    <>
      <form
        method="post"
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
            ref={emailRef}
            id="login-email"
            placeholder="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={fieldsInvalid}
            aria-describedby={error ? ERROR_ID : undefined}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onInvalid={emailValidation.onInvalid}
            onInput={emailValidation.onInput}
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
            aria-invalid={fieldsInvalid}
            aria-describedby={error ? ERROR_ID : undefined}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onInvalid={passwordValidation.onInvalid}
            onInput={passwordValidation.onInput}
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
        <FormError id={ERROR_ID} className={styles.error}>
          {error}
        </FormError>
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
