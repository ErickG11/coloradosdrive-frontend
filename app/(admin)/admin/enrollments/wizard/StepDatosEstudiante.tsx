"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { birthDateBounds } from "@/lib/utils/birthDate";

import {
  focusFirst,
  MESSAGES,
  validateStudent,
  type FieldErrors,
  type ServerFieldError,
  type StudentField,
} from "./validation";
import { BASE, type StudentData } from "./wizardTypes";

interface StepDatosEstudianteProps {
  value: StudentData;
  onNext: (value: StudentData) => void;
  /** Error del servidor al confirmar que corresponde a este paso. */
  serverError?: ServerFieldError | null;
}

const FIELD_ORDER: StudentField[] = [
  "cedula",
  "nombreCompleto",
  "correo",
  "telefono",
  "fechaNacimiento",
];

export function StepDatosEstudiante({ value, onNext, serverError }: StepDatosEstudianteProps) {
  const [values, setValues] = useState<StudentData>(value);
  const [errors, setErrors] = useState<FieldErrors<StudentField>>(() =>
    serverError?.step === 1 ? { [serverError.field]: serverError.message } : {},
  );
  const [idError, setIdError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const birthBounds = birthDateBounds();
  useEffect(() => {
    if (serverError?.step === 1) focusFirst([serverError.field]);
  }, [serverError]);
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
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Duplicados: solo al pulsar «Continuar» y con el formato ya validado. Si la
  // consulta falla (red, 5xx), no se bloquea: el servidor vuelve a validar al
  // confirmar.
  async function findDuplicates(): Promise<FieldErrors<StudentField>> {
    try {
      const found = await api.post<{ cedula: boolean; correo: boolean }>(`${BASE}/duplicates`, {
        cedula: values.cedula,
        correo: values.correo.trim(),
      });
      return {
        ...(found.cedula ? { cedula: MESSAGES.cedulaDuplicada } : {}),
        ...(found.correo ? { correo: MESSAGES.correoDuplicado } : {}),
      };
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 400 &&
        (e.field === "cedula" || e.field === "correo")
      )
        return { [e.field]: e.message };
      return {};
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking) return;
    if (values.mode === "existing") {
      if (!values.id) {
        setIdError(MESSAGES.studentId);
        focusFirst(["studentSearch"]);
        return;
      }
      onNext(values);
      return;
    }
    const invalid = validateStudent(values);
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      focusFirst(FIELD_ORDER.filter((f) => invalid[f]));
      return;
    }
    setChecking(true);
    const duplicated = await findDuplicates();
    setChecking(false);
    if (Object.keys(duplicated).length) {
      setErrors(duplicated);
      focusFirst(FIELD_ORDER.filter((f) => duplicated[f]));
      return;
    }
    setErrors({});
    onNext(values);
  }

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
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
            error={idError}
            onChange={(e) => {
              setIdError(undefined);
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
              onClick={() => {
                setIdError(undefined);
                setValues({ ...s, mode: "existing", telefono: "" });
              }}
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
          <Button type="submit">Continuar</Button>
        </>
      ) : (
        <>
          <Input
            label="Cédula"
            name="cedula"
            required
            inputMode="numeric"
            maxLength={10}
            value={values.cedula}
            error={errors.cedula}
            onChange={(event) => updateField("cedula", event.target.value)}
          />
          <Input
            label="Nombres completos"
            name="nombreCompleto"
            required
            value={values.nombreCompleto}
            error={errors.nombreCompleto}
            onChange={(event) => updateField("nombreCompleto", event.target.value)}
          />
          <Input
            label="Correo electrónico"
            name="correo"
            type="email"
            required
            value={values.correo}
            error={errors.correo}
            onChange={(event) => updateField("correo", event.target.value)}
          />
          <Input
            label="Teléfono"
            name="telefono"
            type="tel"
            value={values.telefono}
            error={errors.telefono}
            onChange={(event) => updateField("telefono", event.target.value)}
          />
          <Input
            label="Fecha de nacimiento (opcional)"
            name="fechaNacimiento"
            type="date"
            min={birthBounds.min}
            max={birthBounds.max}
            value={values.fechaNacimiento ?? ""}
            error={errors.fechaNacimiento}
            onChange={(event) => updateField("fechaNacimiento", event.target.value)}
          />

          <div className="mt-2 flex justify-end">
            <Button type="submit" isLoading={checking}>
              Continuar
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
