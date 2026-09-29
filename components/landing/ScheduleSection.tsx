import { Card } from "@/components/ui/Card";

import { ClockIcon } from "./icons";
import { ScrollReveal } from "./ScrollReveal";

// Horario fijo (Fase 2): igual para todos los días, no viene de la API.
export function ScheduleSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <ScrollReveal>
        <Card className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-accent-red-subtle text-accent-red">
            <ClockIcon className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-text-primary">
              Horario de prácticas
            </h2>
            <p className="mt-1 text-text-secondary">Todos los días, de 06:00 a 22:00.</p>
          </div>
        </Card>
      </ScrollReveal>
    </section>
  );
}
