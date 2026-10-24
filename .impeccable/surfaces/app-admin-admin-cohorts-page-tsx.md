---
version: 1
slug: "app-admin-admin-cohorts-page-tsx"
primary_target: "app/(admin)/admin/cohorts/page.tsx"
related_targets: ["app/(admin)/admin/cohorts/CohortsWorkspace.tsx", "app/(admin)/admin/cohorts/CohortForm.tsx", "app/(admin)/admin/cohorts/CohortVisual.tsx", "app/(admin)/admin/cohorts/cohorts.module.css", "app/(admin)/admin/cohorts/new/page.tsx", "app/(admin)/admin/cohorts/[id]/edit/page.tsx"]
---
# Cohortes

Modo Operate. Code-first, composición fijada por docs/design-references/cohortes-referencia.png. El usuario rechazó la franja anterior y la creación en página separada. Esta corrección reconstruye el módulo a partir de esa referencia. No hay cambio de backend, API, datos ni autenticación. Las rutas directas siguen vigentes.

## Direction contract

THESIS: Consultar cohortes y crear o editar una sin abandonar el contexto del listado.
OWN-WORLD: Reproducir el carbón frío, profundidad contenida, tipografía Inter, cuatro tarjetas independientes, iconos rojos y tabla compacta de la referencia. Paleta acotada al módulo; conservar ambos temas y navegación existente. Sidebar de 218 px solo en Cohortes.
STORY: Banda superior de 68 px, título de 36 px, acción principal, cuatro tarjetas de 102 px de alto, barra de filtros separada y tabla con filas cercanas a 78 px. Total, en curso, próximas y finalizadas son conteos reales. Períodos calculados por fechas civiles del curso en America/Guayaquil; no equivalen a disponibilidad de matrícula. Nunca ocupación o tendencias inventadas.
FIRST VIEWPORT: A 1536x1024, sidebar 218 px, margen principal 34 px y panel derecho integrado de 440 px desde x1096; a 1280, panel de 420 px. Listado visible en escritorio. Tablet y móvil emplean panel casi completo sin sombreado, con foco contenido y Escape. Doce campos y acciones inferiores siempre accesibles mediante scroll propio.
FORM: Creación/edición normal mediante panel sin navegación; Ctrl/Cmd y URL directa conservan rutas. Cinco grupos visuales como la referencia (general, precio/capacidad, matrícula, curso, ANT opcional). Requisitos, mínimos, pasos, fechas, payload y POST/PATCH intactos. Callback de éxito refresca el listado con useFetch y cierra el panel; mantiene router.refresh. Interacciones de 140-160 ms y reduced-motion.
FINISH: Comparar capturas desktop, tablet y móvil con la referencia; revisión independiente completa después de reconstruir. Toda prueba de escritura se intercepta en QA y nunca persiste datos. No tests ni dependencias nuevas. Documentación global conservada al ser una extensión local.
