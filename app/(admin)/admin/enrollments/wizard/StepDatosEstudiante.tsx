"use client";

import { useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";

import type { StudentData } from "./wizardTypes";

interface StepDatosEstudianteProps {
  value: StudentData;
  onNext: (value: StudentData) => void;
}

const CEDULA_PATTERN = /^[0-9]{10}$/;

export function StepDatosEstudiante({ value, onNext }: StepDatosEstudianteProps) {
  const [values, setValues] = useState<StudentData>(value);

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
        <Button type="submit" disabled={!cedulaValida || !values.nombreCompleto || !values.correo}>
          Continuar
        </Button>
      </div>
    </form>
  );
}
