# Rediseño visual de Mi curso y examen

Alcance: presentación de `/student/course` y `/student/exams/[id]`, en la rama
`feat/contenido-admin-ui`. Sin cambios en API, helpers compartidos, contratos,
tipos, dependencias ni permisos. Sin commits, push o PR.

## Archivos

- Modificados: `components/student-content/StudentCourse.tsx`,
  `StudentContentUI.tsx` y `StudentExam.tsx`.
- Nuevos: `components/student-content/CourseVisuals.tsx`,
  `student-learning.module.css` y este informe.
- Las herramientas, datos de muestra y rutas de previsualización se usan solo
  para verificar localmente; la ruta temporal no forma parte de la entrega.

## Decisiones de diseño

Contenedor de hasta 1200 px. Desde 1024 px hay una lista lateral sticky de
materias y un panel de contenido; en móvil/tablet la lista se convierte en chips
horizontales con scroll. La materia activa tiene `aria-current` y cada botón
controla su panel etiquetado; la navegación funciona con Tab/Enter. Continuar
selecciona la materia, desplaza y enfoca el elemento del catálogo existente.

Inter sigue siendo la tipografía de interfaz. Cuerpo de 15–16 px, títulos de
materia de 20 px y metadatos de 12–14 px. Ningún texto nuevo baja de 12 px.
Las materias utilizan rojo, azul, ámbar, verde, violeta y cian por orden,
con tintas claras en el tema oscuro y fondos suaves. Los botones de cada materia
usan tonos sólidos que conservan contraste con blanco. Los iconos son SVG propios:
libro, señal, volante, llave, botiquín y ruta, elegidos por el nombre de la materia.
El libro es el respaldo. Los títulos se presentan en caja normal sin editar el dato.

La cabecera contiene porcentaje grande, materias completas y una carretera
con línea central discontinua y meta a cuadros. Cada materia con obligatorios
pesa lo mismo; los hitos se sitúan en `(índice + 1) / N`. Un carrito SVG original
se posiciona con el porcentaje recibido, con techo visual de 97 hasta
`completa=true`; el ancho del coche se compensa para que su frente permanezca
antes de la meta. Al completar la cruza y aparece «¡Completaste el curso!».

El carrito aparece directamente en su posición inicial (`initial=false`).
Solo los cambios posteriores se interpolan durante un segundo con ease-out,
también al retroceder; las ruedas giran sobre su propio centro. No se guarda
progreso adicional en Storage. La pista es un progressbar y el SVG decorativo.
Los hitos destellan y notifican únicamente cuando el servidor cambia una materia
de incompleta a completa, evitando anunciar completitud a partir del porcentaje.
Con movimiento reducido los cambios son inmediatos, las ruedas no giran y no hay
destello. Barras, anillos y skeletons permanecen estáticos.

Los elementos forman una timeline, con estado semántico independiente del color
de la materia. Una acción principal por tarjeta; visto/quitar marca y resultado
son acciones discretas. El examen tiene fondo/borde propios, intentos, nota y
plazo del intento cuando están disponibles. No se inventa una duración que el
catálogo no proporciona. Abrir y marcar siguen ejecutando sus manejadores previos.

El examen conserva reloj del servidor, borrador, orden de preguntas/opciones,
envío anticipado y reconciliación de estado. Solo añade contador visual de
preguntas respondidas, opciones más amplias, avisos ámbar/rojo y confirmación
ligera para el envío manual. El automático no espera confirmación. El resultado
muestra un anillo con la nota y colores basados en `passed`, con puntos solo si
la respuesta los contiene; no se muestran ni infieren claves.

## Validación

- Los 36 tests de helpers de alumno pasan.
- Typecheck y lint de TSX tocados: correctos. `git diff --check`: correcto.
- Comparación por hashes: API, helpers, DTOs, package.json y package-lock sin cambios.
- Comparación por AST: manejadores de inicio/reanudación, apertura/marca de
  materiales, borrador, envío, reconciliación y vencimiento idénticos.
- Chromium local, con peticiones interceptadas y datos de muestra: 375, 768,
  1280 y 1536 px en claro/oscuro, sin desbordamiento. Texto visible mínimo 12 px.
- Contraste calculado desde estilos efectivos de los textos visibles del curso:
  mínimo 5.48:1 en claro y 5.62:1 en oscuro; supera AA para texto normal.
- Verificados selector de materia, foco de Continuar, actualización del carrito,
  aviso de materia completa, movimiento reducido, techo visual 97 y meta solo
  cuando completa=true. Examen a 375/1280 en ambos temas: respuesta marcada,
  contador, confirmación y resultado.
- Ninguna consulta al backend o base real. No se repite la integración real ya
  validada por Erick. Las capturas se obtuvieron con una previsualización temporal
  de los componentes reales y shell local; su rótulo identifica datos de muestra.

## Capturas locales

Las imágenes están fuera de seguimiento en `.playwright-cli/visual/mi-curso/`.

- 375 claro: [Mi curso](../../.playwright-cli/visual/mi-curso/mi_curso_375_light.png).
  Cabecera compacta, progreso visible, materias como chips y timeline en una columna.
- 375 oscuro: [Mi curso](../../.playwright-cli/visual/mi-curso/mi_curso_375_dark.png).
  Superficies negras, acentos legibles, acciones principales separadas de visto.
- 1280 claro: [Mi curso](../../.playwright-cli/visual/mi-curso/mi_curso_1280_light.png).
  Carretera ancha, materias laterales y tarjetas amplias con examen diferenciado.
- 1280 oscuro: [Mi curso](../../.playwright-cli/visual/mi-curso/mi_curso_1280_dark.png).
  Misma composición con tintas claras y fondos de acento adaptados.
- Examen: [375 claro](../../.playwright-cli/visual/mi-curso/examen_375_light.png),
  [375 oscuro](../../.playwright-cli/visual/mi-curso/examen_375_dark.png),
  [1280 claro](../../.playwright-cli/visual/mi-curso/examen_1280_light.png),
  [1280 oscuro](../../.playwright-cli/visual/mi-curso/examen_1280_dark.png).
- Resultado: [375 claro](../../.playwright-cli/visual/mi-curso/resultado_375_light.png),
  [375 oscuro](../../.playwright-cli/visual/mi-curso/resultado_375_dark.png),
  [1280 claro](../../.playwright-cli/visual/mi-curso/resultado_1280_light.png),
  [1280 oscuro](../../.playwright-cli/visual/mi-curso/resultado_1280_dark.png).

Pendiente: confirmación final de Erick con su contenido real y sus dispositivos.
No se necesita ningún cambio de backend para este rediseño.
