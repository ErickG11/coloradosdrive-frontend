"use client";
import Link from "next/link";
import { Button, Card, FormError } from "@/components/ui";
import { usePracticeAbsences } from "@/hooks/usePracticeAbsences";
import { formatSchoolTime } from "@/lib/utils/schoolTime";
export function RecentPracticeAbsences() {
  const { data, isLoading, error, refetch } = usePracticeAbsences();
  const entries = (data ?? [])
    .flatMap((student) =>
      student.enrollments.flatMap((e) =>
        e.absences.map((a) => ({ ...a, studentId: student.studentId, name: student.name })),
      ),
    )
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))
    .slice(0, 10);
  return (
    <Card className="mt-6">
      <h2 className="font-display text-lg font-semibold">Faltas recientes</h2>
      {error ? (
        <>
          <FormError>{error}</FormError>
          <Button variant="ghost" onClick={refetch}>
            Volver a consultar faltas
          </Button>
        </>
      ) : isLoading && !data ? (
        <p role="status">Consultando faltas…</p>
      ) : !entries.length ? (
        <p className="mt-2 text-sm text-text-secondary">No hay faltas registradas.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {entries.map((entry) => (
            <li className="flex flex-wrap justify-between gap-2 py-3" key={entry.id}>
              <Link
                className="font-medium underline underline-offset-4"
                href={`/admin/students/${entry.studentId}?vista=ficha`}
              >
                {entry.name}
              </Link>
              <span className="text-sm text-text-secondary">
                {new Intl.DateTimeFormat("es-EC", {
                  timeZone: "America/Guayaquil",
                  dateStyle: "medium",
                }).format(new Date(entry.startsAt))}{" "}
                · {formatSchoolTime(entry.startsAt)} · {entry.hours} h
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
