# Contenido y Exámenes: vista del alumno (Fase 3)

Contrato: backend hermano, `docs/operations/examenes-f1.md`, secciones
«Estudiante: curso y materiales» y «Exámenes existentes y cambios de contrato»,
y ADR 020. Las migraciones 065/066a/066b ya están aplicadas según confirmación
de Erick. Esta implementación no consulta la base directamente.

## Rutas y acceso

- `/student/course`: Mi curso. Consulta cursos elegibles del JWT, muestra selector
  solo si hay varios y consulta el catálogo con `course_id` explícito.
- `/student/course?course_id=uuid`: conserva el curso al volver del examen;
  solo selecciona entre los cursos devueltos para la cuenta autenticada.
- `/student/exams`: redirección a Mi curso para conservar enlaces antiguos.
- `/student/exams/:id?course_id=uuid`: iniciar/reanudar y resultado en la ruta
  existente. Sin query descubre la colocación entre los cursos propios.
- Avisos `contenido_habilitado`, `examen_habilitado`, `intento_extra`: Mi curso.
- Se mantienen proxy, verificación de cuenta y redirección a inscripción de
  alumnos con inscripción incompleta. El frontend nunca envía `student_id`.

El progreso utiliza exclusivamente el cálculo recibido: nunca muestra 100 salvo
`completa=true`. Opcionales y elementos cerrados conservan sus marcas. El catálogo
se actualiza al marcar/desmarcar, al volver a la pestaña y con «Actualizar progreso».
Las ventanas de acceso se vuelven a comprobar en el servidor al realizar acciones.

## Materiales, reloj y privacidad

Abrir un material no lo completa. Archivos/enlaces reservan una pestaña durante
el clic para evitar bloqueo de popups; se anula `opener` y se navega mediante un
enlace efímero con `noopener noreferrer` y política sin referente. Si el navegador
bloquea la pestaña se pide permitirla y reintentar. URLs firmadas solo se consumen
en esa navegación: no se guardan en estado, almacenamiento, logs ni texto de UI.
Los textos usan interpolación React y `white-space: pre-wrap`, nunca HTML.

El catálogo proporciona `server_now`. Se añade media latencia de la petición y
se ancla la cuenta regresiva a `performance.now()`, sin usar la hora civil del
equipo. Al volver a la pestaña se obtiene otra muestra del servidor, sin ampliar
el tiempo restante. `deadlineAt` es el plazo adquirido; se muestran los minutos y el máximo
aplicados a ese intento. Se mantiene el orden recibido de preguntas y opciones.
El envío automático se intenta a 10 segundos del plazo; los avisos cambian solo
en los umbrales de 5 minutos y 1 minuto. Un bloqueo inmediato impide envíos
simultáneos. Ante respuesta perdida se consulta el estado antes de ofrecer un
reintento manual. Un 409 terminal conduce a consulta de resultado, no a reenviar.

El único almacenamiento añadido es `sessionStorage[content-attempt:<attemptId>]`,
con respuestas propias (IDs de opción/texto). Se restaura al continuar un intento
vigente, validando IDs contra el examen recibido; se borra al enviar, vencer o
consultar un intento ya completado. Si Storage está bloqueado se avisa que no hay
borrador recuperable. Cerrar la pestaña elimina su almacenamiento y no detiene
el plazo del servidor. Suspensión del equipo, desconexión y restricciones del
navegador pueden impedir el envío automático: el alumno debe enviar a tiempo;
no existe gracia ni se promete una entrega fuera del plazo.

El resultado muestra nota/aprobación y puntos por pregunta solo si llegan en
la respuesta. El historial no trae esos puntos. Nunca se usan ni se infieren
indicadores de corrección o claves. Los tipos anteriores conservan propiedades
opcionales marcadas deprecadas únicamente para compatibilidad de fixtures.

## Límite del contrato actual

El catálogo no incluye `exam.type` ni `can_retry`. Después de iniciar un intento
se conoce su tipo y se oculta repetir un definitivo aprobado. Tras recargar un
resultado aprobado con cupo aparente, «Comprobar nuevo intento» deja la decisión
al POST atómico del servidor: `ALREADY_PASSED` impide siempre repetir un definitivo.
No se infiere el tipo desde notas o límites, ni se usa `/exams` como filtro del
curso: ese listado solo contempla la matrícula más reciente. No es imprescindible
cambiar backend; añadir tipo/posibilidad de repetir al catálogo permitiría ocultar
ese control antes de la comprobación. No se ha modificado backend.

## Verificación permitida

Ejecutar únicamente helpers puros de reloj/margen/etiquetas/fechas, typecheck y
lint sobre archivos tocados. No ejecutar suites DOM antiguas de exámenes: sus
expectativas sobre listado, reloj local y definitivos de un intento pertenecen
al contrato anterior. Tampoco ejecutar pruebas de integración ni pruebas contra
el backend o la base real. La validación visual e integración quedan para Erick.

## Archivos de esta fase

- Nuevos: `app/(student)/student/course/page.tsx`,
  `components/student-content/StudentCourse.tsx`, `StudentExam.tsx`,
  `StudentContentUI.tsx`, `lib/api/studentContent.ts`,
  `lib/utils/studentContent.ts`, `types/studentContent.ts`,
  `tests/lib/utils/studentContent.test.ts` y este documento.
- Modificados: `app/(student)/layout.tsx`, `app/(student)/student/page.tsx`,
  `app/(student)/student/exams/page.tsx`,
  `app/(student)/student/exams/[id]/page.tsx`, `components/layout/Sidebar.tsx`,
  `components/layout/DashboardShell.tsx`,
  `components/notifications/NotificationBell.tsx`, `types/examAttempt.ts`
  y `types/notification.ts`.
- Reutilizados sin editar: cliente JWT, helpers de fase 2, componentes UI,
  `ContentFeedback` y controles de inscripción. No se editan package-lock,
  landing ni backend; se conservan los cambios previos del panel administrador.

## Prueba manual con alumno nuevo (Erick)

1. Con inscripción sin completar, intentar entrar en Mi curso y en un examen
   directo: debe regresar a inscripción. Con matrícula elegible y cohorte asignada
   debe aparecer Mi curso; una cuenta sin cursos muestra el estado vacío.
2. Asignar cursos A y B al alumno: comprobar selector, temarios diferentes y
   regreso al curso correcto después de rendir. Con un curso no hay selector.
   Abrir un enlace antiguo `/student/exams` y uno `/student/exams/:id`.
3. Publicar materias con elementos obligatorios y opcionales, sin regla, con
   apertura futura, abiertos y cerrados: revisar orden, textos de estado y fechas
   Guayaquil. «Continuar donde lo dejaste» debe desplegar, desplazar y enfocar.
4. Abrir archivo, enlace y texto (incluyendo texto con etiquetas HTML): pestaña
   nueva sin acceso a opener/referente; texto literal. Revisar que abrir no suba
   el progreso y que una URL firmada no quede en sessionStorage ni en la UI.
5. Marcar/desmarcar material: respuesta inmediata, toast verde y progreso del
   servidor. Con red desconectada verificar reversión y error en español.
   Completar todos los obligatorios y confirmar 100 solo con completa=true.
6. Iniciar examen con barajado y minutos extra: revisar número, máximo, minutos
   y plazo adquiridos. Responder, recargar y pulsar Continuar intento: recuperar
   respuestas y orden sin reiniciar tiempo. Cambiar el reloj civil del equipo.
7. Usar un examen corto: revisar avisos de 5/1 minuto según duración, envío cerca
   de los últimos 10 segundos y un único POST simultáneo al pulsar repetidamente.
   Cerrar/volver no reinicia plazo; borradores vencidos deben desaparecer.
8. Enviar manualmente, simular pérdida de respuesta y consultar resultado:
   nota/aprobación y puntos si existen; jamás claves ni Correcta/Incorrecta.
   Intento vencido muestra resultado del servidor y mensaje claro, sin aceptar
   respuestas tardías. Sin red se mantiene una acción para consultar después.
9. Probar práctica ilimitada, máximo configurado, definitivo reprobado sin cupo,
   ampliación individual y definitivo aprobado con ampliación. Verificar los
   mensajes de agotado/aprobado. Revocar acceso durante un intento: su plazo
   adquirido se conserva y se puede continuar mientras siga siendo elegible.
10. Crear los tres tipos de aviso y pulsarlos: llevan a Mi curso. Recorrer con
    teclado en 375/768/1280 px, claro/oscuro y movimiento reducido: sin desborde,
    foco visible, acordeones anunciados y reloj sin anuncios cada segundo.
