# Rediseño visual de Contenido administrativo

Rama: `feat/contenido-admin-ui`. Alcance de presentación para `/admin/content`.
No se modifican las consultas, el cliente de API, los hooks de datos/mutaciones,
los contratos, DTOs, helpers, dependencias o package-lock. Sin commits, push ni PR.

## Composición

Selector A/B segmentado, cuatro pestañas con iconos y subrayado de 160 ms,
actualización discreta y resumen con métricas independientes. La pluralización
respeta singular/plural y el peso muestra hasta dos decimales. Los avisos se
agrupan en banners semánticos con las materias afectadas como chips.

Las materias tienen número, icono, acento y estado; la lista es sticky en
escritorio. Publicación usa un switch y editar/eliminar se agrupan en «⋯».
Las flechas conservan la reordenación anterior y aparecen al hover/foco en
escritorio; en dispositivos pequeños permanecen visibles. El detalle muestra
su cabecera de acento y una lista compacta de materiales/exámenes. Eliminar solo
usa rojo sólido dentro de la confirmación con «ELIMINAR»; fuera es texto de menú.
La biblioteca sin colocar se reduce a una línea cuando no tiene pendientes.

Resultados conserva sus filtros y añade métricas calculadas sobre las respuestas
ya recibidas, distribución de notas, búsqueda y orden local por columna. El
promedio y la tasa de aprobación indican que se refieren a intentos completados.
No se deduce aprobación desde una nota: se usa `passed` del servidor.

Progreso se presenta en tabla, con búsqueda local y las barras compartidas del
alumno. El detalle existente se abre en un drawer con colores por materia y
estado de certificado recibido. `safeProgress` sigue evitando presentar 100
cuando `completa` no es true.

Los formularios conservan sus validaciones y payloads. Añaden una previsualización
en lenguaje natural, zona de Ecuador visible, ayudas y avisos de fecha/rango en
línea; esos avisos son orientativos. La revisión final sigue ejecutando el helper
original con la hora actual, conservando fechas con segundos/microsegundos.
Los modales conservan el foco atrapado y Esc. Sus pies distinguen cancelar y
confirmar; los guardados mantienen los toasts verdes de `useContentMutation`.

## Componentes compartidos

- `components/learning/SubjectIdentity.tsx`: iconos SVG, presentación de títulos
  y selección del acento. Se extraen del alumno, conservando exportaciones
  compatibles desde `CourseVisuals.tsx`.
- `components/learning/subject-identity.module.css`: única paleta rojo, azul,
  ámbar, verde, violeta y cian, con variantes claras/oscuras.
- `components/learning/LearningProgress.tsx`: barra estática accesible común a
  alumno y administrador. Reutiliza `safeProgress` sin modificarlo.
- El acento usa `order_index`, estable entre admin y alumno aunque haya materias
  borrador no visibles para el alumno. No cambia el orden ni los datos del temario.

Inter sigue siendo la fuente de interfaz. Títulos principales de 20–24 px,
cuerpo de 14–15 px y metadatos de al menos 12 px. Superficies blancas/negras,
bordes discretos y sombras mínimas; el tema oscuro usa bordes. No hay entradas
escalonadas ni rebotes. Indicadores, menús y drawer respetan movimiento reducido.

## Límites de datos que se mantienen

- El catálogo admin no contiene reglas ni un estado de acceso por destinatario.
  Los elementos muestran «Consultar habilitación» y abren el diálogo original,
  que sí consulta sus reglas. No se añade una consulta por cada item ni se
  inventan estados «Abierto» o «Sin habilitar» desde su publicación.
- La respuesta de progreso de cohorte no incluye materias completas ni
  `certificado_listo` por alumno. La tabla ofrece «Materias y certificado →
  Ver detalle»; el drawer muestra ambos a partir de la respuesta existente
  de progreso individual. `completa` no se usa para inventar un certificado listo.
- La nueva pestaña Habilitaciones elige alcance y reutiliza el diálogo de destino,
  fechas y reglas. No introduce endpoints, permisos ni reglas nuevas.

## Archivos de esta entrega

Nuevos:

- `components/learning/SubjectIdentity.tsx`
- `components/learning/subject-identity.module.css`
- `components/learning/LearningProgress.tsx`
- `components/content-admin/AdminContentUI.tsx`
- `components/content-admin/admin-content.module.css`
- `components/content-admin/AccessDraftPreview.tsx`
- `components/content-admin/ReportViews.tsx`
- `components/content-admin/ResultsChart.tsx`
- Este informe.

Modificados:

- `components/content-admin/ContentWorkspace.tsx`
- `components/content-admin/ContentReports.tsx`
- `components/content-admin/ContentUI.tsx`
- `components/content-admin/AccessRulesDialog.tsx`
- `components/content-admin/SubjectEditor.tsx`
- `components/content-admin/MaterialEditor.tsx`
- `components/student-content/CourseVisuals.tsx`
- `components/student-content/StudentContentUI.tsx`
- `components/student-content/StudentCourse.tsx`
- `components/student-content/student-learning.module.css`

Los cambios del alumno se limitan a extraer/reutilizar su identidad y barra, y a
aplicar el acento por posición persistida. Su carrito y lógica no se modifican.

## Verificación

- 71 tests de helpers pasan (35 de Contenido y 36 de alumno).
- Typecheck y lint de archivos TS/TSX tocados: correctos. CSS formateado y compilado
  por Next.js. `git diff --check`: correcto.
- Hashes de API, helpers, hooks, DTOs y dependencias sin cambios. Comparación AST
  de mutaciones, alcance, orden, colocación y validaciones: manejadores idénticos.
  Las tres consultas de reportes también se compararon sin diferencias.
- Chromium con datos de muestra interceptados: cuatro pestañas a 375, 768, 1280
  y 1536 px en ambos temas, sin desbordamiento de página ni textos bajo 12 px.
  Las tablas mantienen su desplazamiento horizontal dentro del contenedor.
- Texto visible revisado en temario, resultados, habilitaciones, progreso y reglas:
  contraste mínimo de 5.48:1 en claro y 5.62:1 en oscuro, sin fallos AA.
- Menús por teclado y Esc, drawer, reglas existentes, búsqueda/orden sin nuevas
  peticiones, singular «1 materia publicada», guardado con toast verde, advertencias
  de fecha/intentos/minutos y movimiento reducido: comprobados localmente.
- Se abrió la confirmación de eliminación para verificar su protección; no se
  ejecutó ningún DELETE. No se consultó el backend ni la base real.

## Capturas y aspecto

Capturas locales ignoradas por Git en `.playwright-cli/visual/admin-content/`.
Usan los componentes reales en una ruta temporal con respuestas de muestra,
rotulada como tal; esa ruta se elimina al terminar.

- 375 claro: [Temario](../../.playwright-cli/visual/admin-content/temario_375_light.png),
  selector compacto, métricas en dos columnas, materias y detalle apilados.
- 375 oscuro: [Temario](../../.playwright-cli/visual/admin-content/temario_375_dark.png),
  superficies negras, estados y acentos claros; las acciones secundarias se retiran al menú.
- 1280 claro: [Temario](../../.playwright-cli/visual/admin-content/temario_1280_light.png),
  resumen horizontal y lista lateral con detalle amplio.
- 1280 oscuro: [Temario](../../.playwright-cli/visual/admin-content/temario_1280_dark.png),
  misma composición, bordes definidos y colores de materia adaptados.
- Resultados: [375](../../.playwright-cli/visual/admin-content/resultados_375_light.png)
  y [1280 oscuro](../../.playwright-cli/visual/admin-content/resultados_1280_dark.png).
- Habilitaciones: [375](../../.playwright-cli/visual/admin-content/habilitaciones_375_light.png)
  y [1280 oscuro](../../.playwright-cli/visual/admin-content/habilitaciones_1280_dark.png).
- Progreso: [375](../../.playwright-cli/visual/admin-content/progreso_375_light.png)
  y [drawer oscuro](../../.playwright-cli/visual/admin-content/detalle_1280_dark.png).

Pendiente: revisión final de Erick con sus datos reales. Los dos límites de datos
anteriores se conservan deliberadamente para respetar este alcance visual; no se
ha hecho ningún cambio de backend.
