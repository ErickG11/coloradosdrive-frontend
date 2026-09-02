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
  (auth)/         login/registro, layout propio sin navbar de la app
  (admin)/        panel de administrador
  (student)/      panel de estudiante
  (instructor)/   panel de instructor
  layout.tsx
  page.tsx        redirige a /login o al panel según el rol de la sesión
components/
  ui/             componentes atómicos reutilizables (Button, Input, Card)
  layout/         navbar, shells por rol
lib/
  supabase/       cliente de Supabase (browser y server)
  api/            cliente para el backend REST (fetch wrapper con manejo de errores y token)
  utils/
hooks/
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

## Backend

Repositorio del backend: https://github.com/ErickG11/coloradosdrive-backend
