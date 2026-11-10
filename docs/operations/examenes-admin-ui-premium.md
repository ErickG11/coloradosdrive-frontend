# Exámenes del administrador: auditoría y rediseño

Rama: `feat/examenes-admin-ui-premium`, creada desde `main` actualizado (`4010afb`). Solo frontend. Sin commits, push ni PR. El backend se leyó en el checkout hermano; no se consultó la base ni se hicieron peticiones a servicios reales. Erick debe validar la integración con datos nuevos.

## Auditoría (puntos 1–4)

1. El formulario enviaba `maxAttemptsDefault: null` al dejar el campo vacío. `exam.service.ts`, en `insertExamRow`, conserva ese null incluso para definitivos: solo omitir la propiedad activa el valor 1. Se conserva el valor explícito al crear; al editar se envían únicamente los campos modificados, incluido null si se borra un máximo anterior. Al elegir Definitivo nuevo se precarga 1; borrarlo muestra la advertencia de ilimitado hasta aprobar.
2. Los endpoints existentes permiten enriquecer la lista: `GET /admin/content/courses/:id/subjects`, `GET /admin/content/subjects/:id/items`, `GET /admin/content/items/:id/rules`, `GET /exams/:id` y `GET /admin/content/exams/:id/results`. Este último permite sumar los intentos usados. No se requirió backend nuevo.
3. Carga inicial: 2 peticiones base (`/exams`, `/courses`) y, para el curso seleccionado, `1 + S + 2E + P` adicionales, donde S son materias, E exámenes y P exámenes colocados. El contrato requiere solicitudes por examen; se limita su alcance al curso elegido, con hasta cuatro solicitudes de enriquecimiento concurrentes, cancelación al cambiar de curso y caché de 30 segundos al volver. Buscar y filtrar tipo/estado no genera peticiones. Actualizar invalida la caché.
4. No se encontró una contradicción con el contrato indicado. Publicar no garantiza acceso individual: la matrícula elegible y la precedencia estudiante/cohorte siguen decidiéndose en el servidor. Por eso se muestra «Listo para alumnos habilitados», con checklist y explicación. Se conservaron bloqueo por publicación, congelación tras intentos, recuperación del conflicto y relectura tras guardados completos/parciales. Se corrigió el PATCH de metadatos para excluir campos sin cambios y se añadió reordenación sin colisiones con el índice único inmediato.

## Archivos

Modificados:

- `app/(admin)/admin/exams/page.tsx`: entrada del listado.
- `app/(admin)/admin/exams/ExamForm.tsx`: secciones, reglas, resumen, vista previa, duplicación/reordenación, guardado y recuperación.
- `app/(admin)/admin/exams/QuestionBuilder.tsx`: tarjetas colapsables, controles y validación en línea.
- `app/(admin)/admin/exams/new/page.tsx` y `[id]/edit/page.tsx`: encabezados y contenedor del editor.
- `components/content-admin/ContentWorkspace.tsx`: el enlace con `?exam=` también preselecciona la materia colocada; conserva la selección del curso existente.
- `tests/app/(admin)/admin/exams/ExamForm.test.tsx` y `page.test.tsx`: se mantuvieron los casos existentes, adaptados a radios/menú y PATCH mínimo, y se añadieron regresiones.

Nuevos:

- `components/exams-admin/ExamList.tsx`, `useExamOverview.ts`, `useUnsavedExam.ts`, `exam-admin.module.css`.
- `lib/utils/examAdmin.ts`: defaults explícitos, validación, cambios de metadatos y disponibilidad orientativa.
- `types/examDraft.ts`: tipos neutrales; se conservan las exportaciones previas del formulario/constructor.
- `tests/lib/utils/examAdmin.test.ts`, `tests/hooks/useExamOverview.test.tsx` y este informe.

No se añadieron dependencias. `package-lock.json` y el backend no se modificaron. La ruta temporal de QA se retiró al terminar.

## Comprobaciones

- Suite completa Vitest (`run --maxWorkers=2`): 100 archivos correctos, 901 pruebas correctas y 9 omisiones previas en un archivo omitido; 196.25 segundos. No se añadieron omisiones ni se retiraron casos existentes.
- TypeScript sin emitir (`--noEmit --incremental false`): correcto tras retirar la ruta temporal y regenerar los tipos de rutas.
- ESLint en los archivos TS/TSX tocados, con `--max-warnings 0`: correcto, sin errores ni advertencias.
- `git diff --check`: correcto.
- Chromium con fixtures: 44 capturas y 20 comprobaciones de disposición; listado y formulario a 375/768/1280/1536 px en claro/oscuro, más drawer a 375/1280. Sin desbordamiento horizontal, texto mínimo de 12 px, sin excepciones de consola. Contraste de texto medido mínimo 5.60:1 en las vistas comprobadas. No constituye una auditoría completa de accesibilidad.
- Navegador: búsqueda sin tildes, menú con teclado/Escape, retorno de foco del drawer, preview sin claves ni opciones marcadas, bloqueo de publicación/congelación, PATCH de título únicamente, relectura, aviso verde y reduced motion. Enlace interno y Atrás muestran el aviso de cambios sin guardar; cancelar conserva el borrador.
- Las peticiones de API del arnés se respondieron con fixtures; no se ejecutó ningún DELETE. No se probó el tramo API → base real.

Las primeras ejecuciones completas detectaron una importación de tipo desde una frontera cliente (corregida moviendo los tipos) y, después, un timeout de la prueba de arquitectura bajo carga simultánea de navegador/servidor. La ejecución final limita los workers a dos; no se cambió el test, su timeout ni sus aserciones. Persisten dos avisos existentes de JSDOM sobre navegación completa; PowerShell los etiqueta como `NativeCommandError` al redirigir stderr. El resumen final de Vitest no registra pruebas fallidas.

## Evidencia local

En 375 px se apilan las tarjetas, el resumen va arriba, el curso ocupa una fila completa y las acciones permanecen abajo. En 1280 px el editor tiene panel lateral y el listado muestra métricas/checklist en horizontal. Ambos usan tokens compartidos, interruptores de 150 ms y drawer de 120 ms; reduced motion elimina esas transiciones.

- Listado 375: [claro](../../.playwright-cli/visual/exams-premium/list_375_light_viewport.png), [oscuro](../../.playwright-cli/visual/exams-premium/list_375_dark_viewport.png).
- Listado 1280: [claro](../../.playwright-cli/visual/exams-premium/list_1280_light_viewport.png), [oscuro](../../.playwright-cli/visual/exams-premium/list_1280_dark_viewport.png).
- Formulario 375: [claro](../../.playwright-cli/visual/exams-premium/form_375_light_viewport.png), [oscuro](../../.playwright-cli/visual/exams-premium/form_375_dark_viewport.png).
- Formulario 1280: [claro](../../.playwright-cli/visual/exams-premium/form_1280_light_viewport.png), [oscuro](../../.playwright-cli/visual/exams-premium/form_1280_dark_viewport.png).
- En esa carpeta están también las capturas completas, preview, publicados/congelados, `evidence.json` y `guard-evidence.json`. Son artefactos locales ignorados por Git.

## Pendientes e impacto de backend

Pendiente: prueba de Erick con datos nuevos y sesión admin real, especialmente reglas y elegibilidad de alumnos concretos. La disponibilidad es una ayuda orientativa tomada al cargar/actualizar; no sustituye la autorización del servidor.

No hay cambios de backend necesarios para esta entrega. Si el volumen por curso aumenta, la mejora mínima propuesta es un endpoint agregado de resumen por curso que devuelva por examen cantidad de preguntas, puntos, intentos, materia/publicación y estado de habilitaciones. Reemplazaría el abanico de lecturas de metadatos; no se implementó ni se cambió ningún contrato.

La extensión de imágenes de preguntas tiene su contrato, restricciones y pruebas en [Imágenes de preguntas](examenes-imagenes-ui.md).

## Prueba manual con datos nuevos (10 pasos)

1. Entrar como admin en `/admin/exams`. Cambiar curso, tipo y estado; buscar títulos con/sin tilde. Confirmar contador, resultados vacíos, carga y reintento ante fallo de red.
2. Crear un examen de Práctica. Completar curso/título/tiempo y nota 0. Dejar intentos vacío; guardar y comprobar que sigue siendo ilimitado tras la relectura.
3. En otro examen nuevo elegir Definitivo: debe precargar 1. Vaciarlo: aparece aviso ámbar de ilimitado hasta aprobar. Restaurar 1 y comprobar el resumen.
4. Añadir preguntas múltiples y abiertas, opciones y sinónimos. Verificar mínimo de dos opciones, una correcta, puntos positivos y validaciones en español. Colapsar una pregunta e ir a su validación desde el resumen.
5. Duplicar y reordenar preguntas. Quitar una escribiendo ELIMINAR. Guardar; recargar y confirmar orden, contenido y que no se duplicaron preguntas en el servidor.
6. Abrir Vista previa: no debe revelar claves ni marcar correctas. Probar Tab/Escape y retorno de foco. Hacer un cambio y cancelar la salida por enlace, Atrás y recarga.
7. Guardar y publicar. Confirmar aviso verde y campos bloqueados. Despublicar para editar, corregir un texto y volver a publicar.
8. Desde la tarjeta pulsar Ir a Contenido: confirmar curso/materia preseleccionados cuando ya está colocado. Colocar/publicar materia/habilitar un examen nuevo; volver y pulsar Actualizar para revisar el checklist. Publicado por sí solo no afirma acceso para todos.
9. Con un examen de prueba que ya tenga un intento, confirmar banner y estructura deshabilitada. Corregir título/enunciado/texto de opción; guardar. Revisar Resultados en Contenido y comprobar el recuento de intentos.
10. En un borrador de prueba sin vínculos ni intentos, revisar el menú Eliminar y la confirmación ELIMINAR. Comprobar también el conflicto de un examen con dependencias sin retirar datos reales. Repetir las vistas a 375/1280 px, ambos temas, teclado y reduced motion.
