"use client";

import { Card, StatusBadge } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import type { InstructorOwn } from "@/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export default function InstructorPage() {
  const { data, isLoading, error } = useFetch<InstructorOwn>("/instructores/me");
  const slots = [...(data?.practiceSlots ?? [])].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Panel de instructor</h1>
      {isLoading ? <p role="status" className="text-text-secondary">Cargando…</p> : null}
      {error ? <p role="alert" className="text-accent-red">{error}</p> : null}
      {!isLoading && !error && data ? (
        <>
          <Card title="Mis datos">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-text-secondary">Nombre</dt><dd>{data.profile.nombreCompleto}</dd></div>
              <div><dt className="text-text-secondary">Cédula</dt><dd>{data.profile.cedula}</dd></div>
              <div><dt className="text-text-secondary">Correo</dt><dd className="break-all">{data.profile.correo}</dd></div>
              <div><dt className="text-text-secondary">Teléfono</dt><dd>{data.profile.telefono ?? "—"}</dd></div>
            </dl>
          </Card>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Mi horario de prácticas</h2>
            {slots.length === 0 ? (
              <Card><p className="text-sm text-text-secondary">Todavía no tienes franjas asignadas.</p></Card>
            ) : slots.map((slot) => (
              <Card key={slot.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary">{formatDateTime(slot.scheduledAt)}</p>
                  <p className="text-sm text-text-secondary">
                    {slot.durationMinutes} min · {slot.studentName ?? "Sin estudiante asignado"}
                  </p>
                </div>
                <StatusBadge status={slot.status} />
              </Card>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
