"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button, Card, FormError, Input } from "@/components/ui";
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
  const emailRef = useRef<HTMLInputElement>(null);
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <form
          method="post"
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <Input
            ref={emailRef}
            label="Correo electrónico"
            aria-invalid={fieldsInvalid}
            aria-describedby={error ? ERROR_ID : undefined}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Contraseña"
            aria-invalid={fieldsInvalid}
            aria-describedby={error ? ERROR_ID : undefined}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormError id={ERROR_ID}>{error}</FormError>
          <Button type="submit" isLoading={isLoading}>
            Iniciar sesión
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
