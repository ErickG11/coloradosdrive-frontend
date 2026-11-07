# ColoradosDrive · Traspaso del frontend

Fecha: 7 de noviembre de 2026. Defensa de titulación: **14 de noviembre de 2026**.
Este es el cliente web (Next.js 16). El backend y la base de datos se explican en `coloradosdrive-backend/docs/HANDOFF.md`; léelo primero para el contexto general (flujo de inscripción, base de datos compartida y pendientes de negocio).
No contiene secretos: los valores reales se piden al responsable por un canal seguro.

## 1. Ramas y PR

| Rama | Estado |
| --- | --- |
| `feat/inscripcion-en-linea-ui` | Punta de la inscripción en línea (publicada, PR en borrador). Parte de aquí para trabajo nuevo sobre la inscripción. |
| `fix/cohortes-color-y-foco` | Publicada, PR en borrador. |
| `fix/matricula-validaciones-ui` (7 commits) y `fix/toasts-exito` (16, contiene a la anterior) | **No publicadas**: al fusionarlas con `origin/main` dan conflictos en `app/(admin)/admin/enrollments/wizard/` (4 archivos en la primera, 16 en la segunda). Hay que resolver los conflictos en una rama nueva, con revisión de quien conozca ese asistente de matrícula manual. |
| `feat/instructores-agenda-simple` | Pertenece a otra persona: **no la toques**. |
| `worktree-agent-*`, `feature/design-system` | No se publican; no usar como base. |

Trabajo ajeno a la inscripción parte de `origin/main`. Los PR se abren en borrador y no se fusionan con el CI en rojo.

## 2. Cómo correr en local

```bash
npm install
cp .env.example .env.local   # pide los valores reales al responsable
npm run dev                  # http://localhost:3001
```

Variables (solo nombres):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase (única base compartida, ver HANDOFF del backend).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública. Nunca pongas aquí la service role.
- `NEXT_PUBLIC_API_URL`: URL del backend. En local, `http://localhost:3000`.

Para conectar con el backend local: levanta el backend en el puerto 3000 con los valores seguros de prueba (correo en consola, captcha apagado, pago simulado, cron desactivado) y asegúrate de que su `FRONTEND_URL` apunte a `http://localhost:3001`. Los códigos y enlaces de correo aparecerán en la terminal del backend.
La clave pública de Turnstile no está en `.env.example` del frontend: `components/inscripcion/pasos/CaptchaSlot.tsx` es el punto de enganche del widget (F43, pendiente).

Comandos: `npm run lint`, `npm test` (Vitest), `npm run test:tz`, `npm run build`, `npm run format:check`.

## 3. Rutas

Públicas

- `/` portada; `/privacidad`; `/inscripcion` (flujo de 7 pasos del postulante, acepta `?courseId=`); `/crear-contrasena` (enlace de un solo uso tras la aprobación).
- `/login`, `/mfa`, `/account-inactive`.

Administrador (`/admin/...`)

- `solicitudes` (revisión de inscripciones: lista, panel lateral, verificaciones, decisión, interruptor de inscripciones abiertas), `enrollments` (matrícula manual), `students` y `students/[id]`, `students/deletions`, `cohorts`, `instructors`, `exams`, `practice-slots`, `seguridad`.

Alumno (`/student/...`)

- `inscripcion` (estado, elegir horario, reserva y pago), `schedule`, `history`, `exams`, `documents`, `change-password`.

Instructor (`/instructor/...`)

- `schedule`, `change-password`.

## 4. Estructura relevante

- `app/`: rutas por grupos `(admin)`, `(student)`, `(instructor)`, `(auth)`.
- `components/inscripcion/`: flujo público (pasos, validaciones, subida de certificado, reanudación) y pantallas de estado del alumno.
- `components/solicitudes-admin/`: módulo de revisión del admin.
- `components/student-enrollment/`: reserva de horario, vista del plan, pago (Kushki Hosted Fields, simulado, efectivo).
- `components/ui/`: componentes compartidos del sistema de diseño (Button, Card, DataTable, Input, Modal, Select, Textarea, StatusBadge, Pagination, FilterChips, FormError, EmptyState…).
- `lib/api/`: clientes tipados del backend y traducción de errores a español; `lib/content/`: contenido y enlaces (p. ej. enlaces de verificación); `lib/supabase/`, `lib/auth/`: sesión.
- `proxy.ts`: protección de rutas por rol.
- `tests/`: Vitest.

## 5. Sistema de diseño

Las variables CSS globales (espaciado, anchos, colores) están en `app/globals.css` y los componentes base en `components/ui/` (se importan desde `components/ui/index.ts`). Reutilízalos antes de crear estilos nuevos. Accesibilidad es requisito: errores junto al campo, foco gestionado, objetivos táctiles de 44 px, respeto a movimiento reducido, textos en español claro.

## 6. Qué no se toca sin coordinar

- El asistente de matrícula manual del admin (`app/(admin)/admin/enrollments/wizard/`): tiene conflictos pendientes con `main`.
- `proxy.ts` y el layout raíz (afectan a todos los roles).
- La agenda de instructores (rama de otra persona).
- Los contratos con el backend en `lib/api/`: cambian junto con el backend.

## 7. Pendientes del frontend

1. **CI en verde:** hay pruebas heredadas con **9 errores de tipos** que impiden pasar el chequeo; corregirlas sin cambiar el comportamiento.
2. Resolver los conflictos de `fix/matricula-validaciones-ui` y `fix/toasts-exito` con `main` y publicarlas.
3. **Widget Turnstile (F43)** en `CaptchaSlot` con la clave pública real.
4. Despliegue en Vercel (variables públicas, dominio y redirects de Supabase Auth).
5. Confirmar la URL del Registro Civil en `lib/content/verificacion-links.ts` (hoy provisional).
6. Recorrido de ensayo completo con el backend (guion en el HANDOFF del backend, correo en consola).
7. Trabajo futuro: contenido descargable de profesores, exámenes asignados por alumno, cuotas, IVA, feriados.

## 8. Reglas para contribuir

- Nunca subas `.env*` ni claves. El `.gitignore` ya excluye `.env*` (salvo `.env.example`), claves, sesiones de prueba y `.claude/`.
- Commits en español con prefijo convencional en inglés y última línea `Tarea: Pxx · Historia: ...`.
- Sin `Co-Authored-By` ni marcas de herramientas. Sin `push --force`, sin `--no-verify`, sin empujar a `main`.
- Solo datos ficticios en pruebas y documentos.

## 9. Ramas de validaciones y avisos de éxito

- `fix/matricula-validaciones-ui` (7 commits: validación por paso del asistente de matrícula manual, errores accesibles con foco y aria, edad mínima 15) y `fix/toasts-exito` (16 commits: contiene los 7 anteriores más avisos de éxito accesibles con pausa al pasar el cursor o enfocar) están **publicadas como respaldo** y **sin PR**.
- Dan conflictos con `main` (34 commits más nuevos): 16 archivos y 36 bloques. Causa: `main` rediseñó el sistema de diseño (tokens de estado), movió cohortes y alumnos a `CohortsWorkspace`/`StudentsWorkspace` con su propio aviso de éxito y cambió `DashboardShell`. La fusión se intentó en la rama local `fix/ui-validaciones-y-toasts` y se abortó para no adivinar; esa rama no está publicada y no tiene commits propios.
- Siguiente paso recomendado: rehacer los avisos sobre `main` (portar `Toast` con los tokens nuevos y reubicar los avisos en los workspaces) y fusionar aparte la validación por paso del asistente. Debe revisarse y fusionarse antes de nuevo trabajo en esos módulos. Detalle por archivo: `conflictos-p06.md` (carpeta de publicación, fuera del repositorio).

## 10. Estado del CI

Pendiente de revisión manual en la pestaña Checks de cada PR.

## 11. Deuda de pruebas

`npx tsc --noEmit`, `npm test` y `npm run build` pasan. Hay 9 casos saltados con `TODO(F23)` porque pertenecen a la pantalla de solicitudes anterior (panel modal y revisión documento por documento), eliminada en el rediseño. Hay que reescribirlos contra el panel acoplado, las pestañas y las verificaciones.

| Archivo | Casos saltados | Motivo |
| --- | --- | --- |
| `tests/components/solicitudes-admin/SolicitudDetail.test.tsx` | 6 | Capa con bloqueo de fondo, trampa de foco, acciones por documento y bloqueo por estado documental ya no existen. |
| `tests/components/solicitudes-admin/SolicitudesAdmin.test.tsx` | 2 | Decisión desde el panel y refresco por revisión de documento en otra pestaña. |
| `tests/components/solicitudes-admin/DocumentReviewAfterApproval.test.tsx` | 1 | La revisión de documentos tras la aprobación se eliminó. |

Se retiraron `DocumentViewer.test.tsx` y `ReviewActions.test.tsx` (componentes eliminados en `ef49c14`).
Nota: `npm test` local también recorre las copias de `.claude/worktrees/`; el CI no las tiene.

## 12. Despliegue

La guía de despliegue (Railway + Vercel, modo demostración y correo por la API de Gmail) está en el backend: `coloradosdrive-backend/docs/DESPLIEGUE.md`. Variables del frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
