# Mi inscripción: ficha del alumno con acceso

## Alcance

`app/(student)/student/inscripcion/page.tsx` monta `StudentEnrollmentWizard`.
La decisión sigue dependiendo exclusivamente de `accesoCompleto` de
`GET /estudiantes/estado-inscripcion`. Solo esa rama monta `EnrollmentWorkspace`.
El asistente sin acceso, sus pasos, validaciones y operaciones se conservan.
Antes, la rama con acceso mostraba una frase que afirmaba matrícula activa y
un enlace al panel; no mostraba credenciales ni cédula.

## Fuentes y límites verificados

- Cuenta: el cliente Auth existente, mediante `getUser`, verifica el usuario.
  Se seleccionan únicamente id, correo, rol de `app_metadata.role` y
  `created_at`. Este último es el alta de Auth, nunca el primer ingreso ni la
  fecha de habilitación del acceso. No se conservan tokens ni objetos completos
  de sesión en los componentes nuevos.
- Matrículas: `/estudiantes/practice-history/enrollments` entrega id, estado,
  courseId, tipo A/B, cohortId y horas objetivo individuales. Incluye matrículas
  activas, pendientes de cohorte, finalizadas y retiradas.
- Curso legible: `/public/courses`, unido por id y tipo. No se consultan
  `/courses`, `/cohorts`, `/users` ni el detalle administrativo, que son privados
  del administrador. El contenido existente de la landing confirma A para
  motocicletas y B para vehículos livianos; se usa para el icono y etiqueta.
- Nombre: `/practice-slots` embebe `studentName`. Solo se acepta en una fila con
  `studentId` igual al id del usuario verificado y estado propio asignado,
  confirmado o completado. Sin esas filas se omite el nombre personal, sin
  reconstruirlo del correo ni consultar tablas directamente.
- Próxima práctica: primera franja propia futura asignada/confirmada de la
  cohorte de la matrícula activa. No se usan franjas libres ni de otros alumnos.
  Este listado cubre cohortes activas: no acredita la primera práctica histórica
  ni la fecha oficial de inicio o fin del curso.
  Si varias matrículas activas comparten cohorte, no se atribuyen las prácticas
  a una de ellas: se pide confirmar la asociación con la escuela.
- Cohorte: nombre de `estado-inscripcion` solo para la matrícula principal,
  o de la reserva confirmada existente cuando coincide matrícula y cohorte.
  Un cohortId acredita asignación, no el nombre, estado o fechas de la cohorte.
- Documentos: se reutiliza el estado que ya carga el asistente y el cálculo
  compartido `documentProgress` de `student-documents/documentsModel`.
  Las exenciones no entran en el denominador. La consulta no admite enrollmentId:
  para otra matrícula se muestra la limitación, nunca el resumen de la principal.
- Reserva: se reutiliza el hook ya montado por el asistente. Una reserva
  confirmada coincidente puede entregar horas por día; no entrega modalidad.
  Sus límites de prácticas no se convierten en vigencia oficial del curso.
- Pago: se reutiliza el snapshot ya obtenido por `useStudentPayment`; no se
  añade otra consulta. Su total en centavos corresponde a la última transacción,
  no al costo completo del curso, monto acumulado abonado o saldo de matrícula.
  Solo una respuesta aprobada acredita el hito de pago, con `confirmedAt` si existe.
  `pasos.pago` no sustituye un comprobante: también es verdadero para matrículas
  manuales activas. El GET existente de pagos incluye un mecanismo de correo de
  bienvenida del backend, por eso no se incorpora otro consumidor por matrícula.
- Ruta: el origen solicitud acredita que hubo solicitud y aprobación, sin fecha.
  El acceso es conocido por la rama autorizada. La creación de cuenta y el pago
  conservan sus fechas distintas. No se simulan fechas ni hitos futuros.
  El hito de horarios necesita una reserva confirmada o franjas propias realmente
  asignadas. `pasos.horario` no basta, porque también es verdadero para una
  matrícula manual activa sin reservas.

## Componentes reutilizables

`EnrollmentCard` recibe identidad, matrícula, cohorte y vigencia opcional;
la cédula opcional se enmascara por defecto y su revelado vive solo en memoria.
El selector remonta el contenido al cambiar matrícula y vuelve a ocultarla.
`EnrollmentJourney` recibe hitos reales con estado y fecha opcional.
`EnrollmentDataCard`, `EnrollmentDocuments`, `EnrollmentStatusPanel`, iconos,
badges y conteo se pueden reutilizar desde el próximo panel del estudiante.
`courseClock` calcula días civiles en Guayaquil solamente con inicio y fin
oficiales; actualmente esos valores no llegan al alumno y el indicador se omite.

El cambio de contraseña enlaza al flujo existente `/student/change-password`.
Se permite abrirlo voluntariamente al alumno con acceso, suprimiendo únicamente
la redirección anterior que lo devolvía al panel cuando no tenía clave temporal.
Se mantienen los controles de sesión, rol, cuenta activa e inscripción, así como
el formulario, petición y cierre de sesión existentes. Su título se generaliza a
“Cambiar contraseña”. Los puntos de la ficha son texto decorativo constante,
sin contraseña de origen.

## Propuestas de backend, fuera del alcance implementado

Un endpoint de ficha propia por enrollmentId podría entregar nombre/cédula,
modalidad, horas por día, vigencia y estado oficial de cohorte, fechas verificadas
de solicitud/aprobación/reserva/asignación/habilitación y primer ingreso.
También permitiría consultar documentos y un resumen contable explícito
(total, abonado, saldo) de cada matrícula y resolver prácticas de matrículas que
compartan cohorte. No hace falta exponer contraseñas ni datos financieros sensibles.

## Validación

No se encontraron tests directos de `StudentEnrollmentWizard` o de la antigua
frase de acceso. Las pruebas existentes de navegación del estudiante mantienen
las mismas rutas. Los tests nuevos del panel, cuando se soliciten, deberán
simular Auth, matrículas, catálogo público, prácticas propias y los snapshots
de inscripción/pago/reserva. No se escriben, modifican ni ejecutan tests en
esta entrega, por instrucción del usuario.
La aserción del encabezado “Cambiar contraseña temporal” en
`tests/app/(student)/student/change-password/page.test.tsx` queda desactualizada.
`tests/proxy.test.ts` no prueba el cambio voluntario del alumno y requeriría
esa cobertura cuando se autorice trabajar en tests.

La revisión visual real en claro/oscuro, 375/768/1440 y movimiento reducido queda
pendiente: el host de acceso al navegador no está disponible en esta sesión.
