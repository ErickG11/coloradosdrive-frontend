"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/client";
export default function ChangePasswordPage() {
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/estudiantes/cambiar-password", { nuevaPassword: password });
      setPassword("");
      setConfirm("");
      // La API administrativa de cambio invalida la sesión de Auth. El
      // cambio ya ocurrió: limpiar la sesión local y solicitar otro login.
      setCompleted(true);
      await createClient()
        .auth.signOut({ scope: "local" })
        .catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Cambiar contraseña temporal">
      {completed ? (
        <div className="flex flex-col gap-4">
          <p role="status">
            Contraseña actualizada. Inicia sesión con tu nueva contraseña para continuar.
          </p>
          <Button
            onClick={() => {
              router.replace("/login");
              router.refresh();
            }}
          >
            Iniciar sesión con nueva contraseña
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <p>Para continuar, elige una contraseña propia de al menos 8 caracteres.</p>
          <Input
            name="newPassword"
            label="Nueva contraseña"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            name="confirmPassword"
            label="Confirmar nueva contraseña"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <Button type="submit" isLoading={busy}>
            Guardar contraseña
          </Button>
        </form>
      )}
    </Card>
  );
}
