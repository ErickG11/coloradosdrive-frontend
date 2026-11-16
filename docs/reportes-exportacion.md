# Exportar reportes (RF-08 · CD-346)

Decisiones y definiciones: ADR 025 del backend (`docs/adr/025-reportes-exportacion.md`). Contrato: `docs/operations/reportes-exportacion.md` del backend.

## Piezas

| Archivo                               | Qué hace                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/reports/ReportExport.tsx` | `ReportExportMenu` (botón «Exportar» con resumen de filtros, estados y errores) y `ReportExport` (el menú más un formulario de filtros propio) |
| `lib/api/reports.ts`                  | Validación de filtros, parámetros enviados, mensajes de error y descarga autenticada (fetch + `Authorization` → blob → archivo)                |
| `types/report.ts`                     | Contrato de reportes con el backend                                                                                                            |
| `app/(admin)/admin/page.tsx`          | Monta `ReportExport` bajo el resumen administrativo, con el mes que se está viendo                                                             |

## Cómo lo reutiliza CD-345

El panel de reportes debe montar **solo** `ReportExportMenu` con sus propios filtros:

```tsx
<ReportExportMenu
  filters={filters}
  cohortName={cohortName}
  errors={errors}
  onFieldError={onFieldError}
/>
```

- `filters` son exactamente los que se envían al servidor; el panel no debe transformarlos.
- `onFieldError(field, message)` recibe el campo que el servidor rechazó (400) para mostrarlo junto a ese campo.
- Para las cifras en pantalla, el panel debe consumir `GET /admin/reportes` (misma estructura que el PDF y el Excel) en lugar de recalcular indicadores.

## Comportamiento

- Solo se muestra al administrador (rol del JWT de la sesión); el servidor lo vuelve a verificar. El ranking de instructores solo está en este control.
- Descarga: `fetch` con el token, nombre tomado de `Content-Disposition` (solo si es un nombre simple; si no, uno propio). Tras descargar se ofrece un enlace «Abrir …» por si Safari de iOS o un Android bloquea la descarga automática.
- Un solo clic efectivo: mientras exporta, el botón queda deshabilitado (`aria-busy`) y un guardián evita exportaciones solapadas. Al desmontar se cancela la petición y se libera el archivo en memoria.
- Éxito: toast verde «Reporte descargado». Errores 400, 401, 403, 413, 429 y 5xx: mensajes en español.
- Validación en cliente: fechas obligatorias y válidas, `desde` ≤ `hasta`, máximo 366 días, no anterior al año 2000.
- El menú se maneja con teclado (flechas, Inicio, Fin, Escape) y usa los controles del sistema de diseño.
