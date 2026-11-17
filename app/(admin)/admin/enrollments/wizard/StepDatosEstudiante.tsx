"use client";
import styles from "./enrollment.module.css";
import { WizardIcon } from "./WizardVisual";

import { useState, type FormEvent } from "react";

import { useFetch } from "@/hooks/useFetch";
import { documentError, documentLabel } from "@/components/inscripcion/documentValidation";
import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { birthDateError } from "@/lib/utils/birthDate";
import { ApiError } from "@/lib/api/errors";

import { BASE, phoneError, type StudentData } from "./wizardTypes";

interface StepDatosEstudianteProps {
  value: StudentData;
  onNext: (value: StudentData) => void;
}

type FieldErrors = Partial<Record<"cedula" | "correo" | "telefono" | "fechaNacimiento", string>>;

export function StepDatosEstudiante({ value, onNext }: StepDatosEstudianteProps) {
  const documentConfig = useFetch<{ documentTypes?: string[] }>("/public/inscripcion/config");
  const foreign = Boolean(documentConfig.data?.documentTypes?.includes("pasaporte"));
  const [values, setValues] = useState<StudentData>(value);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentData[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [checking, setChecking] = useState(false);
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
    setErrors((current) =>
      current[field as keyof FieldErrors] ? { ...current, [field]: undefined } : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.mode === "existing") {
      onNext(values);
      return;
    }
    // Se muestran a la vez todos los errores del paso; el calendario no se bloquea.
    const nextErrors: FieldErrors = {};
    if (documentError(documentType, values.cedula))
      nextErrors.cedula = documentError(documentType, values.cedula);
    if (values.telefono && phoneError(values.telefono))
      nextErrors.telefono = phoneError(values.telefono) ?? undefined;
    const birth = values.fechaNacimiento ? birthDateError(values.fechaNacimiento) : null;
    if (birth) nextErrors.fechaNacimiento = birth;
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    // Un solo aviso al pulsar Continuar: la cédula o el correo ya existen.
    setChecking(true);
    try {
      const found = await api.post<{ cedula: boolean; correo: boolean }>(`${BASE}/duplicates`, {
        correo: values.correo.trim(),
        ...(documentType === "cedula"
          ? { cedula: values.cedula }
          : { documentType, documentNumber: values.cedula.trim() }),
      });
      if (found.cedula || found.correo) {
        setErrors({
          ...(found.cedula && {
            cedula:
              "Este documento ya está registrado. Busca y selecciona al estudiante existente.",
          }),
          ...(found.correo && {
            correo: "Este correo ya está registrado. Busca y selecciona al estudiante existente.",
          }),
        });
        return;
      }
      setErrors({});
      onNext(values);
    } catch (e) {
      // Sin respuesta no se bloquea: el servidor vuelve a validar al confirmar.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        setErrors({ cedula: e.message });
        return;
      }
      setErrors({});
      onNext(values);
    } finally {
      setChecking(false);
    }
  }

  const documentType = values.documentType ?? "cedula";
  const cedulaValida = !documentError(documentType, values.cedula);

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={styles.studentStep}
      data-mode={values.mode}
    >
      <div className={styles.segmented} role="group" aria-label="Tipo de estudiante">
        <Button
          type="button"
          aria-pressed={values.mode === "new"}
          variant={values.mode === "new" ? "primary" : "secondary"}
          onClick={() => setValues({ ...values, mode: "new", id: undefined })}
        >
          <WizardIcon name="student" /> Estudiante nuevo
        </Button>
        <Button
          type="button"
          aria-pressed={values.mode === "existing"}
          variant={values.mode === "existing" ? "primary" : "secondary"}
          onClick={() => setValues({ ...values, mode: "existing", id: undefined })}
        >
          <WizardIcon name="existing" /> Estudiante existente
        </Button>
      </div>
      {values.mode === "existing" ? (
        <>
          <Input
            name="studentSearch"
            label="Buscar por cédula o correo"
            placeholder="Cédula o correo del estudiante"
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
              className={styles.studentResult}
              onClick={() => setValues({ ...s, mode: "existing", telefono: "" })}
            >
              <strong>{s.nombreCompleto}</strong>
              <p>
                {documentLabel(s.documentType ?? "cedula")}: {s.documentNumber ?? s.cedula} ·{" "}
                {s.correo}
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
          {foreign ? (
            <Select
              label="Tipo de documento"
              value={values.documentType ?? "cedula"}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  documentType: e.target.value as StudentData["documentType"],
                  cedula: "",
                }))
              }
            >
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="otro">Otro documento</option>
            </Select>
          ) : null}
          <Input
            label={documentLabel(values.documentType ?? "cedula")}
            placeholder={
              (values.documentType ?? "cedula") === "cedula"
                ? "10 dígitos numéricos"
                : "Número de documento"
            }
            name="cedula"
            required
            pattern={
              (values.documentType ?? "cedula") === "cedula" ? "[0-9]{10}" : "[A-Za-z0-9-]{3,30}"
            }
            title={
              (values.documentType ?? "cedula") === "cedula"
                ? "10 dígitos numéricos"
                : "De 3 a 30 letras, números o guion"
            }
            value={values.cedula}
            error={errors.cedula}
            onChange={(event) => updateField("cedula", event.target.value)}
          />
          <Input
            label="Nombres completos"
            placeholder="Nombres y apellidos"
            name="nombreCompleto"
            required
            value={values.nombreCompleto}
            onChange={(event) => updateField("nombreCompleto", event.target.value)}
          />
          <Input
            label="Correo electrónico"
            placeholder="nombre@correo.com"
            name="correo"
            type="email"
            required
            value={values.correo}
            error={errors.correo}
            onChange={(event) => updateField("correo", event.target.value)}
          />
          <Input
            label="Teléfono"
            placeholder="Número de contacto"
            name="telefono"
            value={values.telefono}
            error={errors.telefono}
            onChange={(event) => updateField("telefono", event.target.value)}
          />
          <Input
            label="Fecha de nacimiento (opcional)"
            name="fechaNacimiento"
            type="date"
            value={values.fechaNacimiento ?? ""}
            error={errors.fechaNacimiento}
            onChange={(event) => updateField("fechaNacimiento", event.target.value)}
          />

          <div className={styles.footer}>
            <Button
              type="submit"
              isLoading={checking}
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
