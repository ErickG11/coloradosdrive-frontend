# Mi panel: estudiante, paso 2A

## Alcance y navegación

La nueva ruta es `/student/dashboard`. El primer enlace del alumno con acceso
usa el icono de tablero existente; no aparece cuando `studentEnrollmentRestricted`
es verdadero. El único cambio de aterrizaje es el valor de estudiante en
`getRoleHomePath`: `/student` pasa a `/student/dashboard`. No se modifica
`proxy.ts`, el login ni los controles de cuenta, contraseña o inscripción.
La página antigua `/student` y sus encuestas pendientes se conservan, así como
las acciones de calificación en Horarios e Historial.

Se crean la página, nueve archivos en `components/student-dashboard/` y esta
nota. Se modifican `Sidebar.tsx`, `roleRedirect.ts` y únicamente se añaden dos
valores del nuevo token global `--color-vehicle-contact-shadow` (claro/oscuro).
No se cambian los estilos de los módulos hermanos, sus operaciones o los PNG.

## Datos existentes y composición

- `useEnrollmentOverview` se reutiliza una vez para matrículas, catálogo público,
  usuario Auth verificado, franjas propias y sus eventos/actualizaciones.
  Matrículas se consultan por el endpoint existente del historial; se priorizan
  activas/pendientes de cohorte y, sin ellas, finalizadas. La selección se guarda
  por usuario en localStorage, con try/catch y validación contra las matrículas
  efectivamente recibidas. No se guardan notas, identidad ni credenciales allí.
- El nombre completo solo está disponible cuando una práctica propia embebe
  `studentName`. No se reconstruye a partir del correo. Sin nombre, el héroe
  saluda “¡Hola!”. La cohorte legible viene únicamente de la matrícula principal
  de `/estudiantes/estado-inscripcion`; no se atribuye su nombre a otra matrícula.
- La próxima práctica se busca entre franjas propias futuras asignadas o
  confirmadas de la cohorte seleccionada. Si varias matrículas comparten cohorte,
  se evita atribuirles esas prácticas. Saludo y fechas usan Guayaquil y es-EC.
- `usePracticePlan` se reutiliza para el resumen oficial del historial. Sus horas
  asistidas/objetivo/perdidas son agregados del servidor sobre el historial
  completo, aunque el endpoint pagine los elementos. No se suman únicamente las
  primeras 100 filas ni se solicitan páginas innecesarias. Asistencia se rotula
  como proporción de horas: asistidas/(asistidas+perdidas); con denominador cero
  se muestra “—”, sin porcentaje supuesto.
- `ownCatalog` se reutiliza una vez por curso visible. Un mismo snapshot alimenta
  héroe, ruta, indicadores, materias y notas. El catálogo y el historial se
  actualizan silenciosamente al volver a la pestaña. El catálogo y las consultas
  base conservan los datos previos ante fallos de actualización; si el hook
  existente de horas falla, se omite su resumen y se permite reintentar.
  Los errores son por sección.
- Materias y exámenes ya existen en frontend/backend. No hay un número fijo de
  materias: se representan las publicadas que devuelve el catálogo.
- El progreso oficial de materia incluye materiales y exámenes obligatorios,
  y puede reflejar avance parcial: por eso su 88,87 % no equivale necesariamente
  a los 2 de 3 materiales completados (66,67 %). El contrato no desglosa el peso
  exacto del progreso parcial. El panel elige una sola definición explícita de
  «Contenido»: materiales publicados completados / materiales publicados,
  incluyendo opcionales. `materialProgress` en `dashboardModel.ts` alimenta
  héroe, indicador, ruta y cada materia. Se cuentan las filas
  publicadas y su `completado` real; no se interpreta una apertura como lectura
  completa. Una materia sin materiales muestra esa situación sin anillo ficticio.
  El progreso global de materiales pondera cada material por igual. Este
  indicador descriptivo no reemplaza el progreso oficial del curso.
- La carretera representa el avance total estimado; debajo, materiales publicados,
  exámenes obligatorios aprobados y horas asistidas son frentes paralelos.
  «Avance estimado» es el promedio simple de los porcentajes **visibles** de esos
  tres frentes disponibles. Cada porcentaje se redondea primero al entero que ve
  el alumno; el promedio se redondea de nuevo al entero. Para 2/3 materiales,
  0/1 exámenes y 0/15 h: (67 + 0 + 0) / 3 → 22 %. El desglose revela cada valor,
  su peso 1/N y su aporte en puntos enteros; los restos de redondeo se reparten
  de forma estable para que los aportes visibles sumen exactamente el estimado.
  Si falta un frente, se omite y N disminuye;
  sin frentes, no se calcula porcentaje.
- La certificación no se declara lista por el porcentaje. El catálogo tiene
  `certificado_listo`, pero hoy coincide con contenido completo y no acredita
  todas las comprobaciones administrativas: cohorte, pagos, documentos y horas.
  La explicación desplegable aclara la distinción y no emite certificados.
- Exámenes: el catálogo entrega mejor nota, intentos usados/permitidos, acceso,
  ventanas, intento activo y aprobación (`completado`). La escala real es
  `scorePercent`, 0–100, sin convertir a otra escala. Promedio = media de la mejor
  nota de cada examen rendido; mejor nota = máximo de esos valores, incluido cero.
- Solo al entrar en “Mis notas” se consulta `/exams/:id/attempts/me` para exámenes
  con intentos registrados, en lotes de tres. Se proyectan inmediatamente id,
  número, estado, nota, aprobado y fechas. No se conservan ni renderizan preguntas,
  respuestas, opciones o claves. El gráfico usa la mejor nota del catálogo; los
  intentos enriquecen sus tooltips y el último intento. Un fallo de detalle no
  elimina las notas del catálogo ni derriba el resto del panel.
- El umbral no viene en el catálogo. `/exams` es un listado legado del curso
  principal y no permite seleccionar de forma fiable la segunda matrícula: no
  se añade esa consulta para adivinar un umbral. No se dibuja línea de aprobación.
  Aprobado/no aprobado procede del estado del catálogo, no de una nota supuesta.
- El globo del héroe dice «Mejor nota» porque ese valor sí viene del catálogo.
  «Última nota» requiere el detalle de intentos, que se carga solo al entrar en
  Notas. Se omite el tercer globo cuando no hay una nota real. El número total de
  materias futuras sin publicar tampoco figura en el catálogo; no se muestra.
- “Continuar” y disponibilidad enlazan a `/student/course?course_id=...`. No se
  inicia ningún examen, se marca material ni se cambia asistencia desde el panel.

## Imágenes y movimiento

`public/images/auto-colorados-drive.png`: tipo B, 1448×1086, 1 404 986 bytes.
`public/images/moto-colorados-drive.png`: tipo A, 1448×1086, 1 855 962 bytes.
El mapeo se verifica con el contenido de cursos existente en `lib/content/landing`.
Se mantienen intactas las imágenes RGBA y se usa next/image, dimensiones y
aspect ratio reservados, sizes responsive y priority solo en la imagen visible.
No se añade `unoptimized`; `next.config.ts` conserva el optimizador predeterminado.
La configuración está comprobada; no se ha verificado una respuesta del
optimizador desde el navegador.

El escenario da contraste al vehículo blanco en claro y usa superficie y
resplandor adaptados a los tokens en oscuro. Hay llegada con desaceleración,
cambio de vehículo con salida/entrada, sombra de contacto, carretera, HUD y
parallax de puntero fino. El movimiento del puntero se agrupa con rAF y lee el
rectángulo una vez al entrar, evitando lecturas/escrituras de layout por frame.
Los bucles de HUD, resplandor y carretera se pausan fuera de pantalla o con la
pestaña oculta. IntersectionObserver monta las secciones una vez; sus componentes
se importan dinámicamente y los intentos no se cargan antes de entrar en Notas.
Con reduced motion se usan posiciones/valores finales, sin conteos, dibujos,
flotación ni parallax. El selector conserva un fundido corto sin desplazamiento.
Se omiten reflejo y spotlight, y no se añade blur animado al intercambio.

## Propuestas de backend

- Nombre propio disponible sin depender de prácticas, y nombre de cohorte por
  matrícula, mediante una ficha autorizada para el alumno.
- Resumen del curso por matrícula si se necesita separar dos matrículas del
  mismo curso: hoy contenido/progreso se identifican por alumno y course_id.
- Umbral y escala explícitos en el catálogo, y un resumen de mejor/último intento
  sin recuperar las respuestas propias para obtener únicamente metadatos.
- Un estado de certificación propio del alumno que consolide todos los requisitos
  administrativos y académicos. El panel actual no lo sustituye.

## Validación y pruebas existentes

Por instrucción del usuario, no se crean, modifican ni ejecutan tests.
`tests/proxy.test.ts` contiene expectativas de `/student` para el aterrizaje y
redirecciones al home del alumno que quedan desactualizadas por la constante.
Los tests del login o de `getRoleHomePath` que esperen esa misma ruta también
podrían necesitar ajustes. Los tests de la página antigua, títulos y encuestas
siguen apuntando a `/student`, que no se elimina ni se reemplaza.
Los tests de Sidebar mantienen sus enlaces actuales, pero no cubren el nuevo
primer elemento ni su ocultación en inscripción restringida.

La inspección visual real en 375/768/1440+, temas y reduced motion queda pendiente:
el host de navegador no está disponible en esta sesión. No se declaran esas
comprobaciones como realizadas.
