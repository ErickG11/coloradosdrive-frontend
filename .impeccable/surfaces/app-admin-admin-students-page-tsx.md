---
version: 1
slug: "app-admin-admin-students-page-tsx"
primary_target: "app/(admin)/admin/students/page.tsx"
related_targets: ["app/(admin)/admin/students/StudentTable.tsx", "app/(admin)/admin/students/StudentDetail.tsx", "app/(admin)/admin/students/StudentFilters.tsx", "app/(admin)/admin/students/StudentDrawer.tsx", "app/(admin)/admin/students/StudentMetrics.tsx", "app/(admin)/admin/students/StudentPagination.tsx", "app/(admin)/admin/students/students.module.css", "app/(admin)/admin/students/deletions/page.tsx", "app/(admin)/admin/students/[id]/page.tsx"]
---
# Alumnos

Modo Operate, code-first. Referencia fijada por el usuario: docs/design-references/alumnos-referencia.png. Extensión del sistema aprobado de Cohortes; DESIGN.md y PRODUCT.md conservan su autoridad. No se inventan comparaciones históricas, acciones masivas, notificaciones, guardado global de la ficha ni módulos de navegación ausentes.

## Direction contract

THESIS: Consultar alumnos y gestionar su ficha sin perder el listado, sus filtros ni las confirmaciones de seguridad.
OWN-WORLD: Carbón frío de Cohortes (#0c1117, #111820, #1a222d), líneas #26313e, texto #f5f6fa y secundario #bbc6d5; superficies claras equivalentes del sistema en tema claro. Inter, rojo intencional, verde para activo/completo, ámbar para pendientes, azul Tipo B y ámbar Tipo A. Avatar estable por cédula.
FIRST VIEWPORT: A 1536×1024, sidebar existente de 218 px, banda superior de 64 px con un solo buscador, márgenes centrales de 30 px, cuatro tarjetas independientes y ficha integrada de 440 px. El listado sigue visible a su izquierda. A 1280 px el panel mide 410 px; tablet y móvil muestran la ficha sobre el área de contenido con scroll propio. No hay desbordamiento horizontal del documento; la tabla admite scroll propio.
SIGNATURE: Abrir la ficha desplaza suavemente el panel desde la derecha en 220 ms, actualiza la URL de detalle conservando los filtros y mantiene el contexto del listado. Pestañas Información (resumen), Matrículas, Documentos y Reservas. Escape cierra la ficha; los modales existentes conservan la propiedad del foco. Reduced-motion elimina desplazamientos.
DATA: Cuatro totales globales desde GET /admin/estudiantes con pageSize=1 y filtros existentes: total, activo=true, activo=false y documentosPendientes=true. Sin tendencias falsas. Documentos de tabla mediante los detalles de los alumnos visibles, máximo cuatro consultas simultáneas y cancelación al cambiar el listado; solo matrículas coincidentes. Progreso entregado/exigible, excluye no_aplica. Error no equivale a cero.
INTEGRITY: Contratos, permisos y formularios de edición, asignación, acceso y eliminación conservados. La ficha directa sigue cargando por su ruta, con recarga e historial. Cédula de confirmación obligatoria para eliminar; no hay operaciones destructivas de QA. Sin dependencias nuevas, sin ejecutar ni editar tests. Lint, build y revisión de navegador.
QUALITY BAR: Comparar listado y ficha a 1536×1024 con la referencia. Verificar también 1280 claro/oscuro, 768 oscuro y 375 claro, pestañas, búsqueda, filtros, confirmaciones, errores y vacíos. Las cifras reales sustituyen los ejemplos de la imagen. No se agrega ilustración de coche al sidebar global.

Acciones de cuenta al final de la ficha en orden DOM y pie persistente; correo a ancho completo sin truncar; cabecera y cierre sticky accesibles durante el scroll, con espacio de scroll para el foco. Overlay hasta 1099 px, contención/restauración del foco y bloqueo del scroll de fondo.
