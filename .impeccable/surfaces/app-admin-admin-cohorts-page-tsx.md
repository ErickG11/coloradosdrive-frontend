---
version: 1
slug: "app-admin-admin-cohorts-page-tsx"
primary_target: "app/(admin)/admin/cohorts/page.tsx"
related_targets: ["app/(admin)/admin/cohorts/CohortForm.tsx", "app/(admin)/admin/cohorts/CohortVisual.tsx", "app/(admin)/admin/cohorts/cohorts.module.css", "app/(admin)/admin/cohorts/new/page.tsx", "app/(admin)/admin/cohorts/[id]/edit/page.tsx"]
---
# Cohortes

Modo Operate. Administrador: consultar, crear y editar cohortes. Extensión del sistema visual existente y de las referencias del usuario. Code-first; páginas dedicadas conservan rutas y procesos. Sin cambios de backend, validaciones, permisos, dependencias ni tests.

## Direction contract

THESIS: Identificar rápidamente cada cohorte y completar sus condiciones y ventanas de fechas con confianza.
OWN-WORLD: Inter, tokens existentes, carbón en oscuro y superficies claras en claro, marca roja en acciones y filtros; Tipo A ámbar, Tipo B azul, texto siempre presente. Sidebar existente intacto.
STORY: Encabezado y creación principal; conteos reales total/A/B; búsqueda y filtro local; tabla con curso, precio USD, creación, fechas de curso y cupo máximo conocido. Sin ocupación, estados ni tendencias inventados.
FIRST VIEWPORT: Listado ancho, jerarquía de títulos y filas legibles, edición textual visible. Móvil y tablet usan tarjetas con los mismos datos. Nueva/editar: enlace al listado, título propio, formulario amplio en cuatro fieldsets; dos columnas cuando caben y una en móvil.
FORM: Se conservan doce campos, requisitos, mínimos, pasos, validaciones, conversión de opcionales a null, POST/PATCH y redirecciones. Aclaraciones existentes intactas. Foco de marca, hover y presión 120–160 ms, reduced-motion sin transición. Creación/edición verificadas con intercepción de escritura, sin persistir registros QA.
FINISH: revisión independiente y contraste con DESIGN/PRODUCT sin cambiar el sistema global.
