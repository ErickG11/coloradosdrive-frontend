---
version: 1
slug: "app-admin-admin-instructors-page-tsx"
primary_target: "app/(admin)/admin/instructors/page.tsx"
related_targets: ["app/(admin)/admin/instructors/InstructorProfile.tsx", "app/(admin)/admin/instructors/InstructorMetrics.tsx", "app/(admin)/admin/instructors/InstructorVisual.tsx", "app/(admin)/admin/instructors/instructors.module.css", "app/(admin)/admin/instructors/InstructorForm.tsx"]
---
# Instructores

Modo Operate, code-first. Extensión del sistema aprobado de Cohortes y Alumnos, sin nueva identidad global. No hay referencia específica de Instructores en docs/design-references en el momento de implementar; se heredan los colores, tipografía e iconografía administrativos existentes.

## Direction contract

THESIS: Encontrar un instructor, consultar sus datos y acceder a sus acciones en un modal centrado, sin panel lateral ni funciones nuevas.
OWN-WORLD: Carbón frío #0c1117/#111820/#1a222d, líneas #26313e, texto #f5f6fa/#bbc6d5, Inter y rojo intencional heredados de Cohortes y Alumnos. Tema claro equivalente con tokens existentes. Estados con verde/gris y texto, avatar estable por cédula. Sidebar existente de 218 px sin modificar su componente ni navegación.
FIRST VIEWPORT: Cabecera de 34 px, subtítulo confirmado, contador del listado y acción roja Nuevo instructor. Tres estadísticas independientes, zona de búsqueda/estado agrupada y tabla de cinco columnas con filas de alrededor de 80 px. Márgenes de 32 px y escala administrativa contenida. En móvil, estadísticas horizontales apiladas y registros en tarjetas legibles, conservando todos los campos.
STORY: Buscar por nombre o cédula conserva el envío explícito mediante Buscar, filtro de estado y paginación de 10 registros. Totales globales reales desde la API actual con pageSize=1 y activo true/false; se refrescan después de guardar o confirmar acciones. Sin tendencias ni cifras ilustrativas.
FORM: Ver y gestionar abre el modal centrado de 620 px (adaptado al viewport), con avatar, nombre, cédula, estado, información personal y acciones de cuenta. Correo a ancho completo. Editar, activar/desactivar y restablecer contraseña conservan estados de diálogo, permisos, endpoints y confirmaciones originales. Restablecer solo existe para activos, como antes. InstructorForm y sus validaciones/payload intactos. Modales compartidos mantienen foco, Escape, overlay y cierres originales.
SIGNATURE: Modal con entrada de opacidad y escala .985 de 200 ms, salida con opacidad del componente compartido; tarjetas con entrada escalonada corta. Hover y feedback de 140–160 ms. Reduced-motion elimina desplazamiento y escala, conservando información y foco.
QUALITY BAR: Verificar listado y modal en 1536/1280 oscuro, 1280 claro, 768 oscuro y 375 claro. Revisar búsqueda por nombre/cédula, estado, paginación, creación/edición, confirmaciones, foco, error, vacío y reduced-motion. Las escrituras de QA se interceptan; no se crean cuentas ni se envían correos reales. Lint y build, sin ejecutar ni editar tests. Sin dependencias, backend o cambios en otros módulos.

El contador de cabecera refleja el listado filtrado; las tarjetas son globales, con carga, error y reintento independientes. Confirmación de 520 px frente a detalle de 620 px. Nombre y correo completos a ancho de fila. Ajustes de densidad hasta 1099 px y tarjetas móviles hasta 767 px; padding del modal 26 px en escritorio y 20 px en móvil. Cabecera de modal persistente y espacio de scroll para el foco.
