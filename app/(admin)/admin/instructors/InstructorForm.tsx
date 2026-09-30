"use client";

import { useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { InstructorDetail } from "@/types";

interface InstructorFormProps {
  instructor?: InstructorDetail;
  onSaved: () => void;
  onCancel: () => void;
}

export function InstructorForm({ instructor, onSaved, onCancel }: InstructorFormProps) {
  const [cedula, setCedula] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState(instructor?.nombreCompleto ?? "");
  const [telefono, setTelefono] = useState(instructor?.telefono ?? "");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cedulaError, setCedulaError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCedulaError(null);
    if (!instructor && !/^[0-9]{10}$/.test(cedula)) {
      setCedulaError("La cédula debe tener 10 dígitos numéricos.");
      return;
    }
    if (telefono.replace(/\D/g, "").length < 7) {
      setError("El teléfono debe contener al menos 7 dígitos.");
      return;
    }
    setBusy(true);
    try {
      if (instructor) {
        await api.patch<InstructorDetail>(`/admin/instructores/${instructor.id}`, {
          nombreCompleto: nombreCompleto.trim(), telefono: telefono.trim(),
        });
      } else {
        await api.post<InstructorDetail>("/admin/instructores", {
          cedula, nombreCompleto: nombreCompleto.trim(), telefono: telefono.trim(),
          correo: correo.trim(),
        });
      }
      onSaved();
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : "No se pudo guardar el instructor.";
      if (/c[eé]dula/i.test(message)) setCedulaError(message);
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {!instructor ? (
        <Input name="cedula" label="Cédula" required inputMode="numeric" pattern="[0-9]{10}"
          maxLength={10} title="10 dígitos numéricos" value={cedula} error={cedulaError ?? undefined}
          onChange={(event) => { setCedula(event.target.value); setCedulaError(null); }} />
      ) : null}
      <Input name="nombreCompleto" label="Nombre completo" required maxLength={200}
        value={nombreCompleto} onChange={(event) => setNombreCompleto(event.target.value)} />
      <Input name="telefono" label="Teléfono" required type="tel" maxLength={20}
        pattern="\+?[0-9() -]{7,20}" value={telefono}
        onChange={(event) => setTelefono(event.target.value)} />
      {!instructor ? (
        <Input name="correo" label="Correo electrónico" required type="email" value={correo}
          onChange={(event) => setCorreo(event.target.value)} />
      ) : null}
      {error ? <p role="alert" className="text-sm text-accent-red">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" isLoading={busy}>Guardar</Button>
      </div>
    </form>
  );
}
