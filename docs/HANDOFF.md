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
