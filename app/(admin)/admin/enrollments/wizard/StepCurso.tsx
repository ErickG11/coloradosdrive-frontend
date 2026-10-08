"use client";
import { useRef, useState } from "react";
import { Button, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { formatCents, parseCents } from "./payment";
import { BASE, type CatalogEntry, type CourseSelection, type CoursePreview } from "./wizardTypes";

function displayPrice(value: number | string): string {
  const cents = parseCents(value);
  return cents === null ? "No disponible" : formatCents(cents);
}

export function StepCurso({
  catalog,
  onBack,
  onNext,
}: {
  catalog: CatalogEntry[];
  value: CourseSelection | null;
  onBack: () => void;
  onNext: (c: CourseSelection) => void;
}) {
  // Al volver, consultar otra vez: una selección anterior no acredita cupo.
  const [selection, setSelection] = useState<CourseSelection | null>(null);
  const [preview, setPreview] = useState<CoursePreview | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [manual, setManual] = useState(false);
  const sequence = useRef(0);
  async function select(c: CatalogEntry) {
    const request = ++sequence.current;
    setSelection(null);
    setPreview(null);
    setError(null);
    setBusy(true);
    setManual(false);
    try {
      const p = await api.post<CoursePreview>(`${BASE}/course-preview`, { courseType: c.tipo });
      if (request !== sequence.current) return;
      setPreview(p);
      setSelection({
        courseId: p.courseId,
        courseTipo: c.tipo,
        courseNombre: c.nombre,
        cohortId: p.suggestion.cohortId,
        manualOverride: false,
        cohort: p.cohorts.find((x) => x.id === p.suggestion.cohortId),
      });
    } catch (e) {
      if (request === sequence.current)
        setError(e instanceof ApiError ? e.message : "No se pudo consultar la cohorte.");
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <p>Elige el tipo de curso. El cupo y la cohorte se vuelven a validar al confirmar.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((tipo) => {
          const c = catalog.find((c) => c.tipo === tipo);
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={selection?.courseTipo === tipo}
              disabled={!c?.courseId}
              className={`rounded-md border p-4 text-left ${selection?.courseTipo === tipo ? "border-accent-blue bg-accent-blue-subtle" : "border-border"}`}
              onClick={() => c && void select(c)}
            >
              <strong>Tipo {tipo}</strong>
              <p>{tipo === "A" ? "Motocicletas" : "Vehículos livianos"}</p>
              {!c?.courseId && <p>Catálogo sin configurar</p>}
            </button>
          );
        })}
      </div>
      {busy && <p>Buscando cohorte disponible…</p>}
      {error && (
        <p role="alert" className="text-accent-red">
          {error}
        </p>
      )}
      {selection && preview && (
        <div className="rounded-md border border-border p-4">
          {selection.cohort ? (
            <>
              <p>
                {selection.manualOverride ? "Cohorte elegida manualmente" : "Cohorte sugerida"}:{" "}
                <strong>{selection.cohort.nombre}</strong>
              </p>
              <p>
                Matrícula: {selection.cohort.fecha_inicio_matricula} a{" "}
                {selection.cohort.fecha_fin_matricula}
              </p>
              <p>
                Curso: {selection.cohort.fecha_inicio_curso} a {selection.cohort.fecha_fin_curso}
              </p>
              <p>
                Cupos disponibles: {selection.cohort.cupo_maximo - selection.cohort.ocupados} ·
                Precio: {displayPrice(selection.cohort.precio)}
              </p>
            </>
          ) : (
            <p>
              Sin cohorte elegible: quedará pendiente de cohorte. Se conservarán el tipo, el curso
              solicitado y el plan de prácticas; aún no se generarán franjas.
            </p>
          )}
          {preview.suggestion.warning && <p>La matrícula está por cerrar.</p>}
          {!manual && preview.cohorts.length > 0 && (
            <Button variant="secondary" onClick={() => setManual(true)}>
              Cambiar cohorte
            </Button>
          )}
          {manual && (
            <Select
              name="cohortId"
              label="Cohorte del mismo tipo con cupo"
              value={selection.cohortId ?? ""}
              onChange={(e) => {
                const cohort = preview.cohorts.find((c) => c.id === e.target.value);
                if (cohort)
                  setSelection({
                    ...selection,
                    cohortId: cohort.id,
                    courseId: cohort.course_id,
                    manualOverride: true,
                    cohort,
                  });
              }}
            >
              <option value="" disabled>
                Selecciona una cohorte
              </option>
              {preview.cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — {c.cupo_maximo - c.ocupados} cupos
                </option>
              ))}
            </Select>
          )}
        </div>
      )}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Atrás
        </Button>
        <Button
          disabled={!selection || busy || !!error}
          onClick={() => selection && onNext(selection)}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
