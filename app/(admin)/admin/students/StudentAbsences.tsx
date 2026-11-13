"use client";
import { Button, Card, FormError } from "@/components/ui";
import { usePracticeAbsences } from "@/hooks/usePracticeAbsences";
import { formatSchoolTime } from "@/lib/utils/schoolTime";
export function StudentAbsences({ studentId }: { studentId: string }) {
  const { data, isLoading, error, refetch } = usePracticeAbsences(studentId);
  const student = data?.[0];
  return (
    <Card>
      <h3 className="font-display text-lg font-semibold">
        Faltas sin reponer: {student?.count ?? "—"}
      </h3>
      {error ? (
        <>
          <FormError>{error}</FormError>
          <Button variant="ghost" onClick={refetch}>
            Volver a consultar faltas
          </Button>
        </>
      ) : isLoading && !student ? (
        <p role="status">Consultando faltas y reprogramaciones…</p>
      ) : student ? (
        <div className="mt-3 flex flex-col gap-4">
          {student.enrollments.map((enrollment, index) => (
            <section key={enrollment.id}>
              <h4 className="font-medium">
                Matrícula {index + 1} · {enrollment.used} de 2 reprogramaciones usadas
              </h4>
              {enrollment.absences.length ? (
                <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                  {enrollment.absences.map((absence) => (
                    <li key={absence.id}>
                      {new Intl.DateTimeFormat("es-EC", {
                        timeZone: "America/Guayaquil",
                        dateStyle: "long",
                      }).format(new Date(absence.startsAt))}{" "}
                      · {formatSchoolTime(absence.startsAt)}–
                      {formatSchoolTime(
                        new Date(
                          Date.parse(absence.startsAt) + absence.hours * 3600000,
                        ).toISOString(),
                      )}{" "}
                      · {absence.hours} h
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-text-secondary">
                  Sin faltas registradas en esta matrícula.
                </p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p>No hay faltas registradas.</p>
      )}
    </Card>
  );
}
