import type { StudentDetail, StudentPractice } from "@/types/student";
import { studentProfile } from "./studentProfile";
import { pendingEnrollment } from "./studentCohort";
const practice = (
  id: string,
  status: StudentPractice["status"],
  scheduledAt: string,
): StudentPractice => ({
  id,
  status,
  scheduledAt,
  instructor: "Instructor ficticio",
  durationMinutes: 60,
  attended: null,
  reason: null,
});
export const graduationStudent: StudentDetail = {
  ...studentProfile,
  enrollments: [
    {
      ...pendingEnrollment,
      status: "activo",
      cohortId: "cohort",
      cohorte: {
        id: "cohort",
        nombre: "Cohorte de prueba",
        fecha_inicio_curso: "2026-10-01",
        fecha_fin_curso: "2026-12-31",
      },
      montoTotal: 100,
      montoAbonado: 30,
      saldo: 70,
      documentosPendientes: 1,
      documentos: [
        { tipo: "cedula", estado: "pendiente", fechaMarcado: null, marcadoPor: null },
        ...(["papeleta_votacion", "tipo_sangre", "titulo_bachiller"] as const).map((tipo) => ({
          tipo,
          estado: "entregado" as const,
          fechaMarcado: null,
          marcadoPor: null,
        })),
      ],
    },
  ],
  graduation: {
    pendingCount: 4,
    enrollments: [
      {
        enrollmentId: pendingEnrollment.enrollmentId,
        courseName: "Curso ficticio",
        checks: [
          { key: "cohort", label: "Cohorte", fulfilled: true, detail: "Cohorte asignada" },
          {
            key: "payments",
            label: "Pagos",
            fulfilled: false,
            detail: "Saldo pendiente $70.00; abonado $30.00",
          },
          { key: "practice", label: "Práctica", fulfilled: false, detail: "6 de 10 horas" },
          {
            key: "exams",
            label: "Exámenes definitivos",
            fulfilled: false,
            detail: "1 de 2 aprobados",
          },
          { key: "documents", label: "Documentos", fulfilled: false, detail: "Falta: cédula" },
        ],
      },
    ],
  },
  practiceSchedule: {
    upcoming: [
      practice("next", "reservada", "2026-10-17T15:00:00Z"),
      practice("confirmed", "confirmada", "2026-10-18T15:00:00Z"),
    ],
    recovery: [
      { ...practice("released", "liberada", "2026-10-19T15:00:00Z"), durationMinutes: null },
      {
        ...practice("pending", "pendiente_reprogramar", "2026-10-20T15:00:00Z"),
        durationMinutes: null,
        reason: "ocupada",
      },
    ],
    recent: Array.from({ length: 6 }, (_, i) => ({
      ...practice(
        "done-" + i,
        "completada",
        "2026-10-" + String(15 - i).padStart(2, "0") + "T15:00:00Z",
      ),
      attended: true,
    })),
  },
};
