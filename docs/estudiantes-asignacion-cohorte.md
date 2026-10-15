# C: asignación de cohorte desde la ficha

Ticket sugerido: «Frontend: asignar cohorte a matrículas pendientes».
Rama `feat/estudiantes-asignacion-cohorte-ui`, desde
`feat/estudiantes-acceso-eliminacion-ui`.

## Comportamiento

El listado existente con filtro de pendientes lleva a la ficha. Cada matrícula
pendiente ofrece «Asignar cohorte». Un alumno inactivo debe reactivarse primero.
La acción se bloquea durante edición, otras acciones o una eliminación conocida.
No añade rutas ni pantallas nuevas.

El modal reutiliza Modal, Select, Button, useFetch y el cliente API. Consulta al
abrirse, muestra sugerencia/aviso de cierre, opciones con ventana civil, cupos y
precio; al seleccionar muestra precio, descuento, neto, abono y saldo en dólares.
El cálculo de presentación usa centavos; el backend revalida los importes.
Sin opciones o ante error de lectura ofrece «Actualizar opciones».

Contrato leído del backend C:

- GET `/admin/estudiantes/:id/matriculas/:enrollmentId/cohortes`.
- POST `/admin/estudiantes/:id/matriculas/:enrollmentId/asignar-cohorte`, solo
  `{ cohortId }`. La versión y el día de validación son internos del backend.

El envío tiene un lock local inmediato para impedir doble clic. No permite cerrar
durante el POST y no reenvía mutaciones automáticamente. Al confirmar, cierra el
modal, muestra éxito y refresca la ficha.

COHORT_CHANGED vuelve a consultar opciones una sola vez, limpia selección y exige
elegir/confirmar de nuevo. COHORT_FULL, COHORT_WINDOW_CLOSED, ABONO_EXCEEDS_NET,
COHORT_COURSE_MISMATCH y LOCK_CONFLICT muestran un mensaje específico. El backend
sigue siendo fuente de verdad; la lista de opciones no reserva cupo ni precio.

ENROLLMENT_NOT_PENDING, DELETION_PENDING y ACCOUNT_INACTIVE bloquean el guardado y
ofrecen recargar la ficha; inactividad indica reactivar primero. Una eliminación
conocida bloquea también edición y asignaciones posteriores. UNCONFIRMED, red o
503 exigen recargar/verificar antes de repetir; cerrar el modal en esos casos
también refresca la ficha. Códigos desconocidos o ausentes conservan message.

## Verificación

Vitest usa mocks, sin backend ni datos reales. Cubre contrato/cuerpo, códigos y
fallback, centavos, sugerencia, opciones, importes, abono mayor/igual al neto,
carga/vacío/error, actualización manual, doble envío/cierre, recarga automática
solo de GET ante COHORT_CHANGED, bloqueo ante resultados inciertos e integración
con la ficha y las acciones existentes.

Comandos: `npm test`, `npm run lint`, `npm run build`. Resultado: 342 tests en 46
archivos; lint y build correctos. Sin dependencias nuevas ni prueba extremo a extremo.

Cuando el backend esté disponible, verificar en un entorno con datos ficticios:
listado de pendientes → ficha → selección → confirmación → matrícula activa con
importes actualizados; otra cohorte que toma el último cupo; cambio de versión;
abono superior al neto; alumno inactivo y eliminación pendiente. No usar alumnos
reales para una prueba destructiva.

## Archivos

- `types/studentCohort.ts`.
- `lib/api/studentCohort.ts`.
- `app/(admin)/admin/students/StudentCohortAssignment.tsx`.
- `app/(admin)/admin/students/StudentDetail.tsx`.
- `tests/fixtures/studentCohort.ts`.
- `tests/lib/api/studentCohort.test.ts`.
- `tests/app/(admin)/admin/students/StudentCohortAssignment.test.tsx`.
- Este documento.
