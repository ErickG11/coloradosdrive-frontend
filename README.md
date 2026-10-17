# ColoradosDrive — Frontend

Frontend de ColoradosDrive, construido con Next.js 16, TypeScript y Tailwind CSS 4.

## Requisitos

- Node.js 20.9 o superior.
- URL y anon key de Supabase para el inicio de sesión.
- Backend de ColoradosDrive disponible; consulta su [repositorio](https://github.com/ErickG11/coloradosdrive-backend).

## Levantar localmente

```bash
npm install
cp .env.example .env.local
```

Completa las variables de `.env.local` y ejecuta:

```bash
npm run dev
```

La app queda en `http://localhost:3000`.

## Probar y validar

```bash
npm test
npm run lint
npm run build
```

Vitest usa mocks para las llamadas a Supabase y al backend; la suite no requiere datos reales.

## Rutas del panel admin

Las rutas `/admin` requieren una sesión con rol de administrador.

| Ruta | Descripción |
| --- | --- |
| `/admin/cohorts` | Lista las cohortes. |
| `/admin/cohorts/new` | Crea una cohorte. |
| `/admin/cohorts/:id/edit` | Edita una cohorte. |
| `/admin/enrollments` | Matricula un estudiante. |
| `/admin/students` | Busca y lista estudiantes. |
| `/admin/students/:id` | Muestra la ficha del estudiante. |
| `/admin/students/deletions` | Revisa y reintenta eliminaciones pendientes. |
