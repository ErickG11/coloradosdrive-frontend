import { Card } from "@/components/ui";
import type { StudentGraduation as Graduation } from "@/types/student";
export function StudentGraduation({ graduation }: { graduation: Graduation }) {
  return (
    <Card title="Requisitos para graduarse">
      {graduation.pendingCount === null ? (
        <p>No hay matrículas vigentes para evaluar los requisitos.</p>
      ) : (
        <>
          <p className="mb-4 font-semibold text-text-primary">
            {graduation.pendingCount
              ? "Faltan " + graduation.pendingCount + " requisitos"
              : "Todos los requisitos cumplidos"}
          </p>
          {[...graduation.enrollments]
            .sort(
              (a, b) =>
                Number(b.checks.some((c) => !c.fulfilled)) -
                Number(a.checks.some((c) => !c.fulfilled)),
            )
            .map((e) => (
              <section
                key={e.enrollmentId}
                className="mb-4"
                aria-label={"Requisitos de " + e.courseName}
              >
                <h3 className="mb-2 font-medium">{e.courseName}</h3>
                <ul className="space-y-2">
                  {[...e.checks]
                    .sort((a, b) => Number(a.fulfilled) - Number(b.fulfilled))
                    .map((check) => (
                      <li
                        key={check.key}
                        className={
                          check.fulfilled
                            ? "text-sm text-text-secondary"
                            : "rounded border border-accent-red p-2 text-sm text-text-primary"
                        }
                      >
                        <span className="font-semibold">
                          {check.fulfilled ? "Cumplido" : "Pendiente"} · {check.label}:{" "}
                        </span>
                        {check.detail}
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </>
      )}
    </Card>
  );
}
