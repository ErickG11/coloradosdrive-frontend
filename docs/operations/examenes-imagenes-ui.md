# Imágenes de preguntas: interfaz de administración y alumno

Implementación contra `docs/operations/examenes-imagenes.md` del backend. Las pruebas de esta entrega usan fixtures locales; Erick debe comprobar la integración con datos nuevos. No se consultó ni modificó la base real.

## Contrato y guardado

- El administrador recibe `question.image: {url, alt} | null` de `GET /exams/:id`. Las imágenes se envían después de guardar el examen y releer sus preguntas con IDs confirmados.
- `POST /admin/exams/:examId/questions/:questionId/image`: multipart con `image` y `alt` opcional. `PATCH` en la misma ruta envía `{alt}`; `DELETE` quita la imagen. La respuesta de edición incluye `image`.
- Publicado: imagen y alt deshabilitados con «Despublica para editar». Con intentos y despublicado: solo se permite corregir alt; agregar, reemplazar o quitar queda bloqueado.
- Seleccionar, reemplazar o quitar deja un cambio pendiente hasta guardar. Reemplazar y quitar requieren confirmación. Archivos y URLs blob viven en memoria y se liberan al sustituir, descartar, guardar o desmontar. Duplicar una pregunta no copia su imagen.
- PNG/JPEG/WebP, máximo 3 MiB. Se comprueban bytes mágicos además del tamaño, sin confiar en extensión ni MIME declarado. No se agregó la reducción opcional de imágenes.
- Un fallo de imagen conserva el examen guardado y el archivo pendiente, muestra el error por pregunta y permite reintentar sin crear otro examen. No se publica mientras haya imágenes pendientes. Un conflicto exige recargar la imagen actual con confirmación; se conservan los demás cambios del formulario.
- El cliente traduce `EXAM_PUBLISHED_UNPUBLISH`, `EXAM_STRUCTURE_FROZEN`, `IMAGE_TOO_LARGE`, `IMAGE_TYPE_INVALID`, `IMAGE_REQUIRED`, `IMAGE_UPLOAD_INVALID`, `IMAGE_NOT_FOUND`, `IMAGE_CONFLICT`, `UPLOAD_DAILY_LIMIT`, `IMAGE_UPLOAD_FAILED` y `CONTENT_UNAVAILABLE`. La cuota de 50 subidas diarias por administrador se comparte con Contenido y la aplica el backend.

## Alumno y accesibilidad

`POST /exams/:id/attempts` entrega las imágenes al iniciar/reanudar. La renovación manual usa exclusivamente `GET /attempts/:id/images`, con respuesta `[{questionId,url,alt}]`. Un enlace fallido no provoca solicitudes automáticas en bucle. Las renovaciones simultáneas se agrupan; `ATTEMPT_EXPIRED` activa la reconciliación de estado existente. La consulta de estado no se usa para obtener imágenes.

Las URLs duran aproximadamente hasta cinco minutos después del plazo del intento y solo se mantienen en memoria; no se guardan en sessionStorage ni se registran. Las respuestas y el borrador conservan su mecanismo anterior. El resultado muestra las imágenes que ya estaban en memoria cuando incluye los enunciados; no se inventó un endpoint para renovarlas después de finalizar ni recuperarlas desde el historial.

El visor reserva espacio durante la carga, usa texto alternativo con fallback y permite ampliación con teclado, cierre mediante Escape y retorno del foco. La primera imagen carga eager y las siguientes lazy. La ampliación del alumno permanece operable durante el envío automático. La vista previa admin muestra imágenes sin claves de respuestas ni un segundo diálogo anidado.

## Verificación local

Chromium con respuestas simuladas: 43 capturas, 36 comprobaciones de disposición, 375/768/1280 px en claro y oscuro; sin desbordamientos ni excepciones de consola. Se comprobó selección, rechazo de SVG renombrado y archivo grande, guardado antes de subir, error parcial/reintento, reemplazo, borrado confirmado, estados publicado/congelado, ampliación, renovación sin perder respuestas y envío automático con la imagen abierta. Reduced motion sin animaciones activas.

La prueba visual detectó una imagen cargada antes de hidratar que permanecía detrás del esqueleto. El visor ahora reconoce `complete`/`naturalWidth`; se añadió una prueba de regresión. El arnés temporal se retiró de las rutas de la aplicación.

Evidencia local ignorada por Git: `.playwright-cli/visual/question-images/` contiene capturas y `evidence.json`. Vitest completo con `--maxWorkers=2`: 103 archivos aprobados y uno omitido; 929 pruebas aprobadas y nueve omitidas. TypeScript sin emisión, ESLint de los archivos tocados con cero advertencias, Prettier y `git diff --check`: correctos. Persisten dos avisos anteriores de JSDOM sobre navegación completa; no representan pruebas fallidas.

El typecheck inicial encontró una referencia a la ruta temporal de QA en los tipos generados del servidor de desarrollo. Tras retirar esos tipos obsoletos y regenerar las rutas de Next, el typecheck pasó. No se cambió la configuración de TypeScript.

## Prueba manual con datos nuevos (10 pasos)

1. Crear un borrador con dos preguntas y seleccionar PNG/JPEG/WebP. Comprobar nombre, vista local y texto alternativo sin revelar la respuesta.
2. Probar un archivo mayor de 3 MiB y un SVG renombrado `.png`: deben rechazarse antes de subir.
3. Guardar el borrador; comprobar en red que el guardado/relectura precede al POST multipart con IDs existentes. Recargar y comprobar la imagen.
4. Reemplazar y quitar una imagen, primero cancelando y luego confirmando. Guardar y verificar el resultado. Duplicar una pregunta y comprobar que la copia no tiene imagen.
5. Simular fallo de subida, conservar el borrador y reintentar. Confirmar que no se duplica el examen y que no se publica hasta completar las imágenes.
6. Editar desde dos pestañas para provocar conflicto. Recargar la imagen con confirmación; conservar los otros textos sin guardar.
7. Publicar: imagen y alt deben indicar «Despublica para editar». Despublicar y corregir alt. Con un intento existente, comprobar que solo alt sigue editable.
8. Iniciar/reanudar como alumno: comprobar imagen antes del enunciado, alt, carga y ampliación con Tab/Enter/Escape y retorno de foco.
9. Responder, provocar un enlace fallido y reintentar: verificar GET `/attempts/:id/images`, respuestas/borrador/reloj intactos y ausencia de URLs en sessionStorage. Con intento vencido comprobar el mensaje y la finalización existente.
10. Enviar manualmente y dejar vencer otro intento con la ampliación abierta. Verificar resultado sin claves, imágenes de la sesión y navegación. Repetir a 375/768/1280 px, claro/oscuro y reduced motion.
