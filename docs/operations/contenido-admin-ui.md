# Contenido y Exámenes: panel administrativo (Fase 2)

Rama `feat/contenido-admin-ui`. Backend contractual: carpeta hermana
`coloradosdrive-backend-git/docs/operations/examenes-f1.md` y ADR 020.
Según confirmación de Erick, 065/066a/066b están aplicadas. Esta implementación
no consulta la base real, no aplica SQL y no modifica el backend.

## Rutas y archivos

- Nueva página `/admin/content`: pestañas Tipo A/B, selector de curso cuando hay
  más de uno del mismo tipo, y secciones Temario, Resultados y Progreso.
- `/admin/content?view=resultados&exam=uuid` abre los resultados del examen desde
  el listado existente; se valida el UUID y se deriva su curso de los metadatos.
- Se adaptan `/admin/exams`, `/admin/exams/new`, `/admin/exams/:id/edit`.
  Publicar no concede acceso por sí solo: requiere materia publicada y reglas.
- Menú solo admin y protección existente de `/admin/*` en `proxy.ts`. JWT/MFA
  se mantienen en `lib/api/client.ts`, que ahora acepta FormData sin imponer
  Content-Type (el navegador genera el boundary).

Archivos nuevos: `app/(admin)/admin/content/page.tsx`, `types/content.ts`,
`lib/api/content.ts`, `lib/utils/content.ts`, `tests/lib/utils/content.test.ts`,
este documento y `components/content-admin/`:
`ContentWorkspace.tsx`, `SubjectEditor.tsx`, `MaterialEditor.tsx`,
`AccessRulesDialog.tsx`, `ContentReports.tsx`, `ProgressChart.tsx`,
`ContentUI.tsx`, `ContentFeedback.tsx`, `useContentCatalog.ts`, `useContentResource.ts`.

Se actualizan el layout admin (toast reutilizado), Sidebar/NavigationIcon,
cliente de API, tipos de examen y los formularios/listado de exámenes existentes.
No se alteran los cambios previos de landing ni package-lock.json.

## Integración y comportamiento

Se usan únicamente las rutas de contenido documentadas: subjects, materials,
items, access-rules, results y progress. Los lookups reutilizan `/courses`,
`/cohorts`, `/exams`, `/users?rol=estudiante` (solo ID/nombre), y el listado
administrativo `/admin/estudiantes?courseId=…&activo=true&pendienteCohorte=false`.
Se recorren sus páginas de 100 y se conservan en memoria solo ID/nombre/cohorte
de quienes tienen matrícula activa del curso con cohorte.

La carga del temario lee colocaciones de todos los cursos antes de identificar
materiales sin colocar. No confunde materiales ya asignados a otro curso. Las
lecturas independientes se paralelizan; las dependientes respetan su orden.
Carga/error/vacío tienen estados propios y reintento. Los errores son mensajes
españoles definidos por código/HTTP; nunca se presenta el mensaje crudo recibido.

Las escrituras bloquean doble envío con una referencia inmediata además del
estado disabled. Cada operación que guarda cambios muestra el Toast verde
existente. PUT con changed=0 informa «0 cambios» sin éxito falso ni avisos nuevos.
Las eliminaciones/quitar elementos exigen escribir ELIMINAR; dependencias del
servidor se explican y se propone despublicar. Si queda una limpieza de Storage
pendiente, se informa sin fingir que el material sigue existiendo.

Crear material y colocarlo son dos llamadas. Si falla la segunda, se confirma
solo la creación real, se avisa que quedó sin colocar y se ofrece el reintento
desde la biblioteca. No se vuelve a subir el archivo. Si se pierde una respuesta,
actualizar la biblioteca antes de repetir la creación. PDF/PNG/JPG se validan en
cliente por tamaño, extensión y firma inicial; la validación final la hace el
backend. No se usan descargas firmadas en este panel. Texto y descripciones se
representan como texto/textarea, sin HTML ejecutable.

El orden se modifica con botones subir/bajar accesibles, enviando todos los IDs.
Al colocar/mover se selecciona una posición libre después de la última existente;
un conflicto concurrente pide actualizar, sin reintento de escritura automático.
Los exámenes de «Exámenes anteriores (sin clasificar)» pueden moverse a la materia
elegida; los exámenes sin item se colocan mediante POST. Los materiales no son
específicos de un curso hasta su primera colocación.

## Habilitaciones y fechas

Los datetime-local son fechas civiles de America/Guayaquil. El payload incluye
offset explícito -05:00, independientemente de la zona del navegador. Fechas
precargadas mantienen sus segundos/microsegundos si el campo no cambia. Se exige
cierre futuro y posterior a apertura; al bloquear, siempre se envía cierre null.
El servidor sigue siendo la autoridad temporal.

Al elegir un alumno se precarga su regla individual, si existe; de lo contrario,
la de su cohorte. Se advierte que la regla individual reemplaza completamente
la de cohorte, sin herencia. Si un alcance masivo tiene reglas heterogéneas o
reglas ausentes, no se inventa una configuración común: se advierte y se exige
definir valores explícitos. Para conservar ajustes diferentes por elemento,
gestionar las habilitaciones de cada elemento. El contrato masivo admite un solo
payload para todo el alcance. Intentos/minutos se ignoran para materiales y solo
se envían para exámenes; nota hasta 300, intentos 1–20/null y extra 0–180.

Antes de PUT se muestra destinatario, alcance, ventana, intentos y extra. La tabla
del elemento resuelve nombres en cliente, muestra estado informativo calculado,
permite editar/bloquear y no permite borrar reglas. No se añaden endpoints.

## Exámenes, resultados y progreso

El editor exige despublicar antes de editar y permite guardar borrador o guardar
y publicar. Agrega descripción, máximo por defecto, barajados, tiempo y nota.
Comprueba resultados para saber si ya hay intentos; si no puede comprobarlo,
no habilita una edición estructural a ciegas. Tras intentos, claves/puntos/
duración/máximo/barajados quedan deshabilitados. Los cambios de texto de opciones
usan `optionTexts` con IDs originales, sin sustituir opciones históricas.

Las escrituras del banco se secuencian, manteniendo índices de preguntas existentes
y asignando nuevos índices libres. Si hay un fallo parcial, se informa lo realmente
guardado y se recarga el estado canónico antes de permitir continuar; no es una
transacción única del backend. Si falla esa recuperación, se bloquea la repetición
hasta recargar la página. EXAM_STRUCTURE_FROZEN explica la necesidad de otro examen
para cambios estructurales. El aviso verde queda visible al navegar por el admin.

Resultados: filtro de cohorte, mejor nota, usados/permitidos (∞), detalle de cada
intento con fechas Guayaquil. Dar intento extra se habilita cuando el máximo está
agotado y permite usados+1, con los otros valores precargados. No reduce un máximo
ya superior, no limita una práctica ilimitada y no repite un definitivo aprobado.

Progreso usa los valores y banderas del servidor, nunca deriva completitud de un
redondeo. Un incompleto se limita visualmente a 99.99; 100 requiere completa=true.
El promedio de cohorte solo se presenta como 100 si todos sus alumnos están
completos. Recharts se carga bajo demanda; los mismos conteos están en texto.
Las barras por alumno y materia tienen valores accesibles. Sin obligatorios no
se presenta como completo. No se agrega persistencia local ni registros de datos
personales/URLs; las selecciones y datos de consulta viven solo en memoria.

## Comprobación local y pruebas manuales

Solo tests puros de fechas, mapeo de errores y payload de habilitación:
`node node_modules/vitest/vitest.mjs run tests/lib/utils/content.test.ts`.
Typecheck: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
Lint: `node node_modules/eslint/bin/eslint.js .`.
No se ejecutan pruebas de API, base real, sesión real ni la suite completa.

Erick debe realizar estos diez recorridos con datos nuevos:

1. Entrar como admin, abrir Contenido y cambiar Tipo A/B. Revisar a 375/768/1280 px,
   claro/oscuro y teclado. Un estudiante/instructor no debe ver ni abrir el panel.
2. Crear/editar/publicar dos materias; ordenar arriba/abajo. Confirmar toast verde,
   conteo publicado y peso igual solo entre materias con obligatorios publicados.
   La materia vacía se advierte y no pesa.
3. Agregar PDF/PNG/JPG, enlace HTTPS y texto. Rechazar firma inválida, >10 MB,
   HTTP y >20000 caracteres; escribir etiquetas HTML y comprobar que no se ejecutan.
4. Simular fallo al colocar después de crear (p. ej. conflicto de posición desde
   otra pestaña). Comprobar material sin colocar y reintentar sin volver a subir.
5. Colocar y mover material/examen del curso, ordenar lista completa y marcar
   obligatorio. Intentar quitar con reglas/progreso; explicar despublicación.
   Eliminar solo un material/examen de prueba sin dependencias, con confirmación fuerte.
6. Habilitar un elemento para cohorte con apertura/cierre. Comprobar vista previa,
   JSON -05:00 y tabla en Guayaquil aun con navegador en otra zona. Rechazar cierre
   pasado o anterior a apertura; bloquear una regla vencida sin enviar cierre.
7. Crear regla individual: precargar cohorte, advertir reemplazo y comprobar
   precedencia. Probar alcances materia/curso y reglas heterogéneas. Repetir PUT
   idéntico: «0 cambios», sin toast verde falso ni nuevas notificaciones.
8. Crear examen con campos nuevos; despublicar → editar → publicar. Rechazar banco
   inválido. Tras un intento, corregir prompt/opciones conservando IDs; impedir
   claves/puntos/tiempo y comprobar el mensaje de congelación.
9. Abrir Resultados desde Exámenes, filtrar cohorte y desplegar intentos. Ver mejor
   nota e ∞. Agotar un máximo y dar usados+1 con los demás valores precargados;
   definitivo aprobado no permite ampliación para repetir.
10. Abrir Progreso por cohorte y alumno: promedio, rangos, barras y materias.
    Comprobar 20 puntos por una materia de cinco, vacías excluidas, obligatorios
    no habilitados incluidos y ningún 100 cuando completa=false. Revisar vacíos,
    fallos de red y reintentos sin duplicar escrituras.

Backend requerido: ningún cambio para esta implementación. Pendiente para Erick:
integración y validación visual con la sesión y datos nuevos de la base aplicada.
El pulido visual fino y el panel de contenido del alumno quedan fuera de esta fase.
