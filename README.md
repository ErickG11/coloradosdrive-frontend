# ColoradosDrive — Frontend

Frontend de ColoradosDrive, plataforma de gestión de una escuela de conducción en Ecuador (proyecto de titulación). Consume exclusivamente la API REST del backend ([coloradosdrive-backend](https://github.com/ErickG11/coloradosdrive-backend)) y usa Supabase Auth para el login del lado del cliente.

## Arquitectura

Frontend desacoplado, desplegado en Vercel. No accede directo a la base de datos: toda lectura/escritura de datos de negocio pasa por el backend REST, autenticado con el JWT de la sesión activa de Supabase.

## Stack

- **Next.js 16** (App Router) + **TypeScript 5** + **React 19**
- **Tailwind CSS 4**
- **Framer Motion 12** — animaciones
- **Recharts 3.8** — gráficas del panel admin (a partir de sprints posteriores)
- **Supabase client** (`@supabase/ssr`) — Auth del lado del cliente (login/signup, sesión/JWT)
- **ESLint** (flat config, ESLint 9) + **Prettier**
- **Vitest** + **React Testing Library** — testing

## Estructura de carpetas

```
app/
  (auth)/         login/registro, layout propio sin sidebar de la app
  (admin)/        panel de administrador
  (student)/      panel de estudiante
  (instructor)/   panel de instructor
  layout.tsx
  page.tsx        redirige a /login o al panel según el rol de la sesión
components/
  ui/             componentes atómicos reutilizables (Button, Input, Card)
  layout/         sidebar, shells por rol
  theme/          ThemeProvider/ThemeToggle (tema claro/oscuro persistido)
lib/
  supabase/       cliente de Supabase (browser y server)
  api/            cliente para el backend REST (fetch wrapper con manejo de errores y token)
  utils/
hooks/            useFetch: GET client-side reutilizable (data/isLoading/error)
types/            tipos compartidos que reflejan las entidades del backend (User, Course, Cohort, Enrollment)
tests/
proxy.ts          protección de rutas por sesión y rol (Next.js 16 renombró `middleware` a `proxy`)
```

## Cómo levantar el entorno local

### Requisitos previos

- Node.js 20.9+ (Next.js 16 ya no soporta Node 18)
- Un proyecto de Supabase (URL y anon key — en Project Settings → API)
- El backend corriendo localmente (ver [coloradosdrive-backend](https://github.com/ErickG11/coloradosdrive-backend))

### Pasos

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone https://github.com/ErickG11/coloradosdrive-frontend.git
   cd coloradosdrive-frontend
   npm install
   ```

2. Copiar `.env.example` a `.env.local` y completar los valores reales:

   ```bash
   cp .env.example .env.local
   ```

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app queda disponible en `http://localhost:3000`.

### Otros scripts disponibles

| Script                 | Descripción                                |
| ---------------------- | ------------------------------------------ |
| `npm run build`        | Compila la app para producción             |
| `npm start`            | Corre el build compilado                   |
| `npm run lint`         | Corre ESLint                               |
| `npm run lint:fix`     | Corre ESLint con `--fix`                   |
| `npm run format`       | Formatea el código con Prettier            |
| `npm run format:check` | Verifica el formato sin modificar archivos |

## Cómo correr los tests

```bash
npm test          # corre toda la suite una vez
npm run test:watch # modo watch
```

Los tests no requieren un backend ni un proyecto de Supabase real: usan mocks (`vi.mock`) sobre `lib/supabase/client.ts` y `global.fetch`.

## Panel de administrador

Rutas bajo `/admin`, protegidas por `proxy.ts` (sesión + rol admin):

| Ruta                      | Descripción                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `/admin/cohorts`          | Lista las cohortes (curso, precio, fecha de creación)                 |
| `/admin/cohorts/new`      | Crea una cohorte                                                      |
| `/admin/cohorts/:id/edit` | Edita una cohorte                                                     |
| `/admin/enrollments`      | Matricula un estudiante (crea su cuenta y lo inscribe en una cohorte) |

## Imagen del login

La columna izquierda del login (visible desde 768px) muestra
`public/images/login-hero.jpg` con `next/image` (`fill`, `object-cover`). Si
el archivo no existe todavía, se ve un degradado con los colores de la
paleta en su lugar — no hace falta el archivo para que el layout funcione.

Dimensiones recomendadas: **1200×1600px** (proporción 3:4, orientación
vertical — la columna ocupa la mitad de la pantalla en toda su altura).
Formato JPG, peso objetivo <300KB.

## Backend

Repositorio del backend: https://github.com/ErickG11/coloradosdrive-backend

## Estudiantes admin: acceso y eliminación

Ticket sugerido: «Frontend: acceso, reservas y eliminación reintentable de alumnos».
Se amplía `/admin/students/:id` y se añade `/admin/students/deletions`, bajo la
protección admin existente. Se reutilizan Modal, controles, tokens, cliente API y
useFetch; sin dependencias nuevas. El frontend no reintenta mutaciones automáticamente.

La confirmación de cédula solo vive en memoria y en el POST requerido por el
backend, con autoComplete="off". No se guarda en URL, almacenamiento ni logs.
La navegación de éxito usa `/admin/students?aviso=alumno-eliminado`: el parámetro
es un aviso fijo, sin datos del alumno. El listado muestra el éxito y al cambiar
filtros se elimina ese aviso. UUID y fechas de operaciones siguen visibles aunque
el perfil ya no exista. Copiar UUID requiere permiso del navegador; si falla, se
ofrece copiar el texto manualmente.

Las pruebas Vitest usan mocks del contrato B/D; no conectan al backend ni a datos
reales. D requiere 026 y sus endpoints desplegados antes de publicar esta UI. No
se ha hecho prueba extremo a extremo mientras D continúa sin desplegar.

Verificar con `npm run lint`, `npm run build` y `npm test`.
Cuando el backend esté disponible, probar con datos ficticios: desactivar/reactivar,
reservas con conflictos, modal con coincidencia exacta/cancelación, éxito de borrado
con redirección, reintento sin perfil, filtros/paginación y copiar UUID.

Archivos de esta entrega:

- `hooks/useFetch.ts`, `tests/hooks/useFetch.test.ts`.
- `types/student.ts`, `lib/api/studentActions.ts`, `lib/api/studentProfile.ts`.
- `app/(admin)/admin/students/StudentDetail.tsx`, `StudentActions.tsx`,
  `StudentReservations.tsx`, `StudentEditForm.tsx`, `page.tsx` y `deletions/page.tsx`.
- `tests/lib/api/studentActions.test.ts`.
- `tests/app/(admin)/admin/students/StudentActions.test.tsx`,
  `StudentReservations.test.tsx`, `StudentDeletions.test.tsx`,
  `StudentEditForm.test.tsx` y `students.test.tsx`.
- Este README.
