"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/client";

export default function InstructorChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      // Va junto al campo de confirmación (aria-invalid + aria-describedby).
      setConfirmError("Las contraseñas no coinciden.");
      return;
    }
    setConfirmError(null);
    setBusy(true);
    try {
      await api.post<void>("/instructores/cambiar-password", { nuevaPassword: password });
      setPassword("");
      setConfirm("");
      // Primero se cierra la sesión local: así el botón hacia /login no
      // aparece mientras la cookie siga vigente (el redirect de /login lo
      // devolvería al panel).
      await createClient().auth.signOut({ scope: "local" }).catch(() => undefined);
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Cambiar contraseña temporal" titleAs="h1">
      {completed ? (
        <div className="flex flex-col gap-4">
          <p role="status">Contraseña actualizada. Inicia sesión con tu nueva contraseña.</p>
          <Button onClick={() => { router.replace("/login"); router.refresh(); }}>
            Iniciar sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <p>Para continuar, elige una contraseña de al menos 8 caracteres.</p>
          <Input name="newPassword" label="Nueva contraseña" type="password" minLength={8}
            maxLength={128} required autoComplete="new-password" value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setConfirmError(null);
            }} />
          <Input name="confirmPassword" label="Confirmar nueva contraseña" type="password"
            minLength={8} maxLength={128} required autoComplete="new-password" value={confirm}
            error={confirmError ?? undefined}
            onChange={(event) => {
              setConfirm(event.target.value);
              setConfirmError(null);
            }} />
          {error ? <p role="alert" className="text-sm text-accent-red">{error}</p> : null}
          <Button type="submit" isLoading={busy}>Guardar contraseña</Button>
        </form>
      )}
    </Card>
  );
}
