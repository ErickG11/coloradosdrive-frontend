"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { InstructorSugerido, SugerirPracticaResult } from "@/types";
import {
  BASE,
  EMPTY_PRACTICE,
  practicePayload,
  type CourseSelection,
  type PracticeChoice,
  type PracticeFormData,
  type PracticePlan,
} from "./wizardTypes";

export function StepPracticas({
  course,
  value,
  onBack,
  onNext,
}: {
  course: CourseSelection;
  value: PracticeChoice | null;
  onBack: () => void;
  onNext: (p: PracticeChoice) => void;
}) {
  const [form, setForm] = useState(value?.form ?? EMPTY_PRACTICE);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [suggestion, setSuggestion] = useState<SugerirPracticaResult | null>(null);
  const [instructor, setInstructor] = useState<InstructorSugerido | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  // Se consulta la misma regla del servidor para automático y manual. Se
  // descartan respuestas antiguas cuando el usuario modifica el borrador.
  useEffect(() => {
    if (!form.fechaInicio || (form.manual && !form.fechaFin)) return;
    let stale = false;
    const t = setTimeout(() => {
      api
        .post<PracticePlan>(`${BASE}/plan`, { practice: practicePayload(form) })
        .then((p) => {
          if (!stale) {
            setPlan(p);
            setError(null);
          }
        })
        .catch((e) => {
          if (!stale) {
            setPlan(null);
            setError(e instanceof ApiError ? e.message : "No se pudo calcular el plan.");
          }
        });
    }, 150);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [form]);
  function change<K extends keyof PracticeFormData>(field: K, value: PracticeFormData[K]) {
    ++version.current;
    setForm((f) => ({ ...f, [field]: value }));
    setPlan(null);
    setSuggestion(null);
    setInstructor(null);
    setError(null);
  }
  async function preview() {
    const request = ++version.current;
    setBusy(true);
    setError(null);
    setSuggestion(null);
    setInstructor(null);
    try {
      const r = await api.post<{ plan: PracticePlan; suggestion: SugerirPracticaResult | null }>(
        `${BASE}/practice-preview`,
        {
          courseType: course.courseTipo,
          cohortId: course.cohortId,
          automatic: !course.manualOverride,
          practice: practicePayload(form),
        },
      );
      if (request !== version.current) return;
      setPlan(r.plan);
      setSuggestion(r.suggestion);
      if (r.suggestion?.instructoresSugeridos.length === 1)
        setInstructor(r.suggestion.instructoresSugeridos[0]);
      if (!course.cohortId) onNext({ form, plan: r.plan, suggestion: null, instructor: null });
    } catch (e) {
      if (request === version.current)
        setError(e instanceof ApiError ? e.message : "No se pudo consultar la sugerencia.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <p>Planificación civil: America/Guayaquil. Cada bloque dura 60 minutos.</p>
      <Select
        name="semanas"
        label="Duración"
        value={form.semanas}
        onChange={(e) => change("semanas", Number(e.target.value) as 1 | 2 | 3)}
      >
        {[1, 2, 3].map((s) => (
          <option key={s} value={s}>
            {s} {s === 1 ? "semana" : "semanas"}
          </option>
        ))}
      </Select>
      <Select
        name="modalidad"
        label="Modalidad"
        value={form.modalidad}
        onChange={(e) => change("modalidad", e.target.value as PracticeFormData["modalidad"])}
      >
        <option value="entre_semana">Entre semana (L–V)</option>
        <option value="fin_de_semana">Fin de semana (S–D)</option>
      </Select>
      <Input
        name="fechaInicio"
        label="Fecha de inicio"
        type="date"
        value={form.fechaInicio}
        onChange={(e) => change("fechaInicio", e.target.value)}
      />
      <Input
        name="horaDeseada"
        label="Hora deseada"
        type="time"
        value={form.horaDeseada}
        onChange={(e) => change("horaDeseada", e.target.value)}
      />
      <Input
        name="horasPorDia"
        label="Horas por día"
        type="number"
        min={1}
        max={16}
        value={form.horasPorDia}
        onChange={(e) => change("horasPorDia", Number(e.target.value))}
      />
      <Input
        name="fechaFin"
        label="Fecha final"
        type="date"
        value={form.manual ? form.fechaFin : (plan?.fechaFinElegida ?? "")}
        onChange={(e) => {
          ++version.current;
          setForm((f) => ({ ...f, manual: true, fechaFin: e.target.value }));
          setPlan(null);
          setSuggestion(null);
          setInstructor(null);
        }}
      />
      <p>
        {form.manual
          ? "Ajuste manual: se incluyen solo los días de la modalidad dentro del rango. No cambia la tarifa."
          : "Cálculo automático por días de práctica: 5 por semana L–V o 2 por semana S–D."}
      </p>
      {form.manual && (
        <Button variant="secondary" onClick={() => change("manual", false)}>
          Restaurar cálculo automático
        </Button>
      )}
      {plan && (
        <div aria-live="polite" className="rounded-md border border-border p-3">
          {plan.primerDiaEfectivo !== form.fechaInicio && (
            <p>
              El inicio elegido no corresponde a la modalidad. Primer día efectivo:{" "}
              <strong>{plan.primerDiaEfectivo}</strong>. Se conserva la fecha elegida{" "}
              {form.fechaInicio}.
            </p>
          )}
          <p>
            {plan.dias} días · {plan.bloques} bloques · {plan.horas} horas. Último día de práctica:{" "}
            {plan.fechaFin}.
          </p>
        </div>
      )}
      {!course.cohortId && (
        <p>
          El plan se guardará como pendiente de cohorte. Todavía no se pueden generar franjas ni
          asignar instructor.
        </p>
      )}
      {error && (
        <p role="alert" className="text-accent-red">
          {error}
        </p>
      )}
      {course.cohortId && (
        <Button
          variant="secondary"
          isLoading={busy}
          disabled={!plan}
          onClick={() => void preview()}
        >
          Ver sugerencia
        </Button>
      )}
      {suggestion && (
        <div className="rounded-md border border-border p-3">
          <p>
            {suggestion.horaAjustada ? "Hora ajustada por disponibilidad" : "Hora sugerida"}:{" "}
            {suggestion.horaResuelta}
          </p>
          <p>
            {suggestion.horasProgramadas} horas programadas
            {suggestion.horasRequeridas !== null
              ? ` / ${suggestion.horasRequeridas} requeridas`
              : ""}
          </p>
          <Select
            name="instructorId"
            label="Instructor"
            value={instructor?.id ?? ""}
            onChange={(e) =>
              setInstructor(
                suggestion.instructoresSugeridos.find((i) => i.id === e.target.value) ?? null,
              )
            }
          >
            <option value="" disabled>
              Selecciona un instructor
            </option>
            {suggestion.instructoresSugeridos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombreCompleto}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Atrás
        </Button>
        <Button
          isLoading={!course.cohortId && busy}
          disabled={!plan || (!!course.cohortId && (!suggestion || !instructor)) || busy}
          onClick={() => {
            if (!course.cohortId) void preview();
            else if (plan && suggestion && instructor)
              onNext({ form, plan, suggestion, instructor });
          }}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
