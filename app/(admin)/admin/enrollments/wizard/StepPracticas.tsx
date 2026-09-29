"use client";

import { useState } from "react";

import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  Enrollment,
  InstructorSugerido,
  Modalidad,
  SugerirPracticaInput,
  SugerirPracticaResult,
} from "@/types";
import { MODALIDADES } from "@/types";

import { EMPTY_PRACTICE, type PracticeChoice, type PracticeFormData } from "./wizardTypes";

interface StepPracticasProps {
  enrollment: Enrollment;
  onSkip: () => void;
  onNext: (choice: PracticeChoice) => void;
}

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  entre_semana: "Entre semana",
  fin_de_semana: "Fin de semana",
};

export function StepPracticas({ enrollment, onSkip, onNext }: StepPracticasProps) {
  const [form, setForm] = useState<PracticeFormData>(EMPTY_PRACTICE);
  const [suggestion, setSuggestion] = useState<SugerirPracticaResult | null>(null);
  const [instructor, setInstructor] = useState<InstructorSugerido | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof PracticeFormData>(field: K, value: PracticeFormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuggestion(null);
    setInstructor(null);
  }

  if (enrollment.status !== "activo") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-bg-sunken p-4">
          <p className="text-sm text-text-primary">
            Esta matrícula todavía no tiene una cohorte asignada, así que no se puede generar un
            horario de práctica todavía. Podrás hacerlo apenas se le asigne una cohorte.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onSkip}>
            Finalizar matrícula sin práctica
          </Button>
        </div>
      </div>
    );
  }

  async function handleVerSugerencia() {
    setError(null);
    setSuggestion(null);
    setInstructor(null);
    setIsLoading(true);

    try {
      const payload: SugerirPracticaInput = {
        fechaInicio: form.fechaInicio,
        modalidad: form.modalidad,
        horasPorDia: form.horasPorDia,
        horaDeseada: form.horaDeseada,
        ...(form.endMode === "numeroSesiones"
          ? { numeroSesiones: form.numeroSesiones }
          : { fechaFin: form.fechaFin }),
      };
      const result = await api.post<SugerirPracticaResult>(
        `/admin/enrollments/${enrollment.id}/sugerir-practica`,
        payload,
      );
      setSuggestion(result);
      if (result.instructoresSugeridos.length === 1) {
        setInstructor(result.instructoresSugeridos[0]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo generar la sugerencia de práctica.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const faltanHoras =
    suggestion?.horasRequeridas !== null &&
    suggestion !== null &&
    suggestion.horasProgramadas < (suggestion.horasRequeridas ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Select
          label="Modalidad"
          name="modalidad"
          value={form.modalidad}
          onChange={(event) => updateField("modalidad", event.target.value as Modalidad)}
        >
          {MODALIDADES.map((modalidad) => (
            <option key={modalidad} value={modalidad}>
              {MODALIDAD_LABELS[modalidad]}
            </option>
          ))}
        </Select>
        <Input
          label="Horas por día"
          name="horasPorDia"
          type="number"
          min={1}
          max={16}
          required
          value={form.horasPorDia}
          onChange={(event) => updateField("horasPorDia", Number(event.target.value))}
        />
        <Input
          label="Fecha de inicio"
          name="fechaInicio"
          type="date"
          required
          value={form.fechaInicio}
          onChange={(event) => updateField("fechaInicio", event.target.value)}
        />
        <Input
          label="Hora deseada"
          name="horaDeseada"
          type="time"
          required
          value={form.horaDeseada}
          onChange={(event) => updateField("horaDeseada", event.target.value)}
        />

        <Select
          label="¿Hasta cuándo?"
          name="endMode"
          value={form.endMode}
          onChange={(event) =>
            updateField("endMode", event.target.value as PracticeFormData["endMode"])
          }
        >
          <option value="numeroSesiones">Número de sesiones</option>
          <option value="fechaFin">Fecha de fin</option>
        </Select>
        {form.endMode === "numeroSesiones" ? (
          <Input
            label="Número de sesiones"
            name="numeroSesiones"
            type="number"
            min={1}
            required
            value={form.numeroSesiones}
            onChange={(event) => updateField("numeroSesiones", Number(event.target.value))}
          />
        ) : (
          <Input
            label="Fecha de fin"
            name="fechaFin"
            type="date"
            required
            value={form.fechaFin}
            onChange={(event) => updateField("fechaFin", event.target.value)}
          />
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            isLoading={isLoading}
            disabled={!form.fechaInicio || (form.endMode === "fechaFin" && !form.fechaFin)}
            onClick={() => void handleVerSugerencia()}
          >
            Ver sugerencia
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      {suggestion ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-bg-sunken p-4">
          <p className="text-sm text-text-secondary">
            {suggestion.totalSesiones} sesiones · {suggestion.fechas[0]} a{" "}
            {suggestion.fechas[suggestion.fechas.length - 1]}
          </p>

          {suggestion.horaAjustada ? (
            <p className="rounded-sm bg-accent-blue-subtle p-2 text-sm text-text-primary">
              La hora deseada ({suggestion.horaDeseada}) no tenía instructor libre; se ajustó a{" "}
              <strong>{suggestion.horaResuelta}</strong>.
            </p>
          ) : (
            <p className="text-sm text-text-primary">Hora confirmada: {suggestion.horaResuelta}</p>
          )}

          <p className="text-sm text-text-primary">
            Horas programadas: {suggestion.horasProgramadas}
            {suggestion.horasRequeridas !== null ? ` / ${suggestion.horasRequeridas} requeridas` : ""}
          </p>
          {faltanHoras ? (
            <p className="text-sm text-accent-red">
              Quedan menos horas programadas que las requeridas por el curso; se puede continuar
              igual y completar las horas restantes después.
            </p>
          ) : null}

          <Select
            label="Instructor"
            name="instructorId"
            value={instructor?.id ?? ""}
            onChange={(event) => {
              const found = suggestion.instructoresSugeridos.find(
                (candidate) => candidate.id === event.target.value,
              );
              setInstructor(found ?? null);
            }}
          >
            <option value="" disabled>
              Selecciona un instructor
            </option>
            {suggestion.instructoresSugeridos.map((candidato) => (
              <option key={candidato.id} value={candidato.id}>
                {candidato.nombreCompleto}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!suggestion || !instructor}
          onClick={() => suggestion && instructor && onNext({ form, suggestion, instructor })}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
