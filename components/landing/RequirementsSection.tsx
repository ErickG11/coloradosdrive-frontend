import type { ReactElement } from "react";

import { Card } from "@/components/ui/Card";

import { BallotIcon, BloodDropIcon, DiplomaIcon, IdCardIcon } from "./icons";
import { ScrollReveal } from "./ScrollReveal";

interface Requirement {
  icon: ReactElement;
  label: string;
}

// Contenido fijo (Fase 2): los mismos 4 requisitos para cualquier curso,
// no vienen de la API.
const REQUIREMENTS: Requirement[] = [
  { icon: <IdCardIcon className="h-6 w-6" />, label: "Cédula de identidad" },
  { icon: <BallotIcon className="h-6 w-6" />, label: "Papeleta de votación" },
  { icon: <BloodDropIcon className="h-6 w-6" />, label: "Certificado de tipo de sangre" },
  {
    icon: <DiplomaIcon className="h-6 w-6" />,
    label: "Título de bachiller o certificado de estudios hasta décimo año",
  },
];

export function RequirementsSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <ScrollReveal>
        <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Requisitos para inscribirte
        </h2>
      </ScrollReveal>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {REQUIREMENTS.map((requirement, index) => (
          <ScrollReveal key={requirement.label} delay={index * 0.08}>
            <Card className="flex h-full flex-col items-start gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-blue-subtle text-accent-blue">
                {requirement.icon}
              </div>
              <span className="text-sm font-medium text-text-primary">{requirement.label}</span>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
