"use client";

import { useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { BASE, type StudentData } from "./wizardTypes";

interface StepDatosEstudianteProps {
  value: StudentData;
  onNext: (value: StudentData) => void;
}

const CEDULA_PATTERN = /^[0-9]{10}$/;

export function StepDatosEstudiante({ value, onNext }: StepDatosEstudianteProps) {
  const [values, setValues] = useState<StudentData>(value);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentData[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function search() {
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      setResults(
        await api.get<StudentData[]>(`${BASE}/students?q=${encodeURIComponent(query.trim())}`),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo buscar el estudiante.");
    } finally {
      setBusy(false);
    }
  }

  function updateField<K extends keyof StudentData>(field: K, next: StudentData[K]) {
    setValues((current) => ({ ...current, [field]: next }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(values);
  }

  const cedulaValida = CEDULA_PATTERN.test(values.cedula);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Button
          type="button"
          variant={values.mode === "new" ? "primary" : "secondary"}
          onClick={() => setValues({ ...values, mode: "new", id: undefined })}
        >
          Estudiante nuevo
        </Button>
        <Button
          type="button"
          variant={values.mode === "existing" ? "primary" : "secondary"}
          onClick={() => setValues({ ...values, mode: "existing", id: undefined })}
        >
          Estudiante existente
        </Button>
      </div>
      {values.mode === "existing" ? (
        <>
          <Input
            name="studentSearch"
            label="Buscar por cédula o correo"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setValues({ ...values, id: undefined });
              setResults([]);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            isLoading={busy}
            disabled={query.trim().length < 3}
            onClick={() => void search()}
          >
            Buscar estudiante
          </Button>
          {error && <p role="alert">{error}</p>}
          {results.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={values.id === s.id}
              className="rounded-md border border-border p-3 text-left"
              onClick={() => setValues({ ...s, mode: "existing", telefono: "" })}
            >
              <strong>{s.nombreCompleto}</strong>
              <p>
                {s.cedula} · {s.correo}
              </p>
              <p>
                Matrículas vigentes:{" "}
                {s.vigentes?.map((e) => `Tipo ${e.tipo} (${e.status})`).join(", ") || "ninguna"}
              </p>
            </button>
          ))}
          <p>
            Se reutilizan la cuenta y el perfil. La contraseña actual no se modifica ni se revela.
          </p>
          <Button type="submit" disabled={!values.id}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          <Input
            label="Cédula"
            name="cedula"
            required
            pattern="[0-9]{10}"
            title="10 dígitos numéricos"
            value={values.cedula}
            onChange={(event) => updateField("cedula", event.target.value)}
          />
          <Input
            label="Nombres completos"
            name="nombreCompleto"
            required
            value={values.nombreCompleto}
            onChange={(event) => updateField("nombreCompleto", event.target.value)}
          />
          <Input
            label="Correo electrónico"
            name="correo"
            type="email"
            required
            value={values.correo}
            onChange={(event) => updateField("correo", event.target.value)}
          />
          <Input
            label="Teléfono"
            name="telefono"
            value={values.telefono}
            onChange={(event) => updateField("telefono", event.target.value)}
          />

          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              disabled={!cedulaValida || !values.nombreCompleto || !values.correo}
            >
              Continuar
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
