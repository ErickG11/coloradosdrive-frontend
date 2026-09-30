"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
export default function ChangePasswordPage() {
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
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
      router.replace("/student");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Cambiar contraseña temporal">
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
    </Card>
  );
}
