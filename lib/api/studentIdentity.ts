import { api } from "./client";
import { ApiError } from "./errors";

export interface StudentIdentityResult {
  transicion: boolean;
  confirmadaAt: string;
  confirmadaPor: string;
  enrollmentId: string;
}

export function confirmStudentIdentity(studentId: string, motivo: string) {
  return api.post<StudentIdentityResult>(
    `/admin/estudiantes/${studentId}/identidad-presencial`,
    { motivo },
    { signal: AbortSignal.timeout(30_000) },
  );
}

const MESSAGES: Record<string, string> = {
  MOTIVO_INVALIDO: "Escribe un motivo de 10 a 300 caracteres.",
  ALUMNO_NO_ENCONTRADO: "Alumno no encontrado. Recarga la ficha.",
  ALUMNO_SIN_SOLICITUD: "La matrícula más reciente no proviene de una solicitud de inscripción.",
  VENTANA_IDENTIDAD_NO_VENCIDA:
    "La confirmación manual requiere una práctica cuyo plazo del instructor ya venció (48 horas después del fin).",
  ACCESO_DENEGADO: "Se requiere un administrador activo para confirmar la identidad.",
  MFA_REQUERIDA: "Verifica tu segundo factor antes de confirmar la identidad.",
  INVALID_FIELD: "Revisa los datos de la confirmación.",
  INVALID_JSON: "No pudimos leer la confirmación. Recarga la ficha.",
  CUERPO_INVALIDO: "No pudimos leer la confirmación. Recarga la ficha.",
  CAMPO_NO_PERMITIDO: "La confirmación contiene campos no permitidos. Recarga la ficha.",
};

export function studentIdentityError(error: unknown): { message: string; reload: boolean } {
  const uncertain = !(error instanceof ApiError) || error.status >= 500;
  if (uncertain)
    return {
      message: "No se pudo confirmar el resultado. Recarga la ficha y verifica antes de repetir.",
      reload: true,
    };
  if (error.code && MESSAGES[error.code])
    return {
      message: MESSAGES[error.code],
      reload: ["ALUMNO_NO_ENCONTRADO", "ALUMNO_SIN_SOLICITUD"].includes(error.code),
    };
  if (error.status === 401)
    return { message: "Tu sesión venció. Inicia sesión nuevamente.", reload: true };
  if (error.status === 403)
    return { message: "No tienes permiso para confirmar la identidad.", reload: false };
  return { message: "No pudimos guardar la confirmación. Recarga la ficha.", reload: true };
}
