# ColoradosDrive · Traspaso del frontend

Fecha: 7 de noviembre de 2026. Defensa de titulación: **14 de noviembre de 2026**.
Este es el cliente web (Next.js 16). El backend y la base de datos se explican en `coloradosdrive-backend/docs/HANDOFF.md`; léelo primero para el contexto general (flujo de inscripción, base de datos compartida y pendientes de negocio).
No contiene secretos: los valores reales se piden al responsable por un canal seguro.

## 1. Ramas y PR

| Rama | PR | Estado |
| --- | --- | --- |
| `main` | | Línea estable; incluye la inscripción en línea. No se empuja a mano. |
| `feat/inscripcion-en-linea-ui` | #38 | **Fusionado en `main`**. Flujo público, administrativo y del alumno. Ya no hace falta; se conserva, no se borra. |
| `fix/cohortes-color-y-foco` | #47 | **Fusionado en `main`**. Se conserva. |
| `fix/matricula-validaciones-ui` (7 commits) y `fix/toasts-exito` (16, contiene a la anterior) | sin PR | **NO están en `main`, a propósito.** Publicadas solo como respaldo; ver la sección 9. |
| `feat/instructores-agenda-simple` | | Pertenece a otra persona: **no la toques**. |
| `worktree-agent-*`, `feature/design-system` | | No se publican; no usar como base. |

Todo trabajo nuevo **parte de `main`**: `git checkout main && git pull`, y crear una rama nueva. Los PR se abren en borrador.

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

1. **Pruebas:** el CI de `main` está en verde. Queda reescribir los 9 casos saltados (sección 11).
2. Portar a `main` los avisos de éxito y la validación por paso de la matrícula manual (plan en la sección 9).
3. **Widget Turnstile (F43)** en `CaptchaSlot` con la clave pública real.
4. Despliegue en Vercel desde `main` (variables públicas, dominio y redirects de Supabase Auth; ver la guía del backend).
5. Confirmar la URL del Registro Civil en `lib/content/verificacion-links.ts` (hoy provisional).
6. Recorrido de ensayo completo con el backend (guion en el HANDOFF del backend, correo en consola).
7. Trabajo futuro: contenido descargable de profesores, exámenes asignados por alumno, cuotas, IVA, feriados.

## 8. Reglas para contribuir

- Nunca subas `.env*` ni claves. El `.gitignore` ya excluye `.env*` (salvo `.env.example`), claves, sesiones de prueba y `.claude/`.
- Commits en español con prefijo convencional en inglés y última línea `Tarea: Pxx · Historia: ...`.
- Sin `Co-Authored-By` ni marcas de herramientas. Sin `push --force`, sin `--no-verify`, sin empujar a `main`.
- Solo datos ficticios en pruebas y documentos.

## 9. Ramas de validaciones y avisos de éxito (pendientes, NO fusionadas)

- `fix/matricula-validaciones-ui` (7 commits: validación por paso del asistente de matrícula manual, errores accesibles con foco y aria, edad mínima 15) y `fix/toasts-exito` (16 commits: contiene los 7 anteriores más avisos de éxito accesibles con pausa al pasar el cursor o enfocar) están **publicadas como respaldo** y **sin PR**. **No están en `main`.**
- **Por qué no se fusionaron:** dan 16 archivos y 36 bloques en conflicto con `main`. `main` rediseñó el sistema de diseño (tokens `--color-status-*` y tema nuevo en `app/globals.css`), movió cohortes y alumnos a `CohortsWorkspace` y `StudentsWorkspace` (cada uno con su propio aviso de éxito) y cambió `components/layout/DashboardShell.tsx`. Ambos lados cambian la misma lógica de forma incompatible, así que no se resolvió a ciegas.
- **Plan:** crear una rama nueva desde `main` que (1) porte el `Toast` con los tokens vigentes y reubique los avisos en los workspaces, y (2) aparte, porte la validación por paso del asistente de matrícula manual. El backend ya valida lo mismo (PR #44 del backend), así que la validación del cliente es de usabilidad. Las dos ramas originales se conservan como referencia; no se borran. Detalle por archivo: `conflictos-p06.md` (carpeta de publicación, fuera del repositorio).

## 10. Estado del CI

El CI de `main` pasó en verde tras los merges (revisado por el responsable en GitHub). CircleCI aparece en rojo porque no tiene configuración: se ignora. Los casos de prueba saltados están en la sección 11.

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

## 13. Dependabot

Dependabot abre PR automáticos de dependencias. Antes de la defensa **no se fusionan saltos de versión mayor** (por ejemplo React o TypeScript 7). Los PR con el CI en rojo no se tocan. Solo se aceptan actualizaciones menores o de parche con el CI en verde y revisadas por el responsable.
