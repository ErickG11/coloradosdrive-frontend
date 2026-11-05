# Alumno aprobado: guía del frontend (I01–I14)

El runbook principal vive en el backend:
`docs/operations/inscripcion-alumno-runbook.md`. Incluye estados, límites, variables,
orden de migraciones, incidentes y guion de aceptación. No se han ejecutado suites
en esta tanda; las pruebas existentes permanecen intactas.

## Acceso y pasos

`/student/inscripcion` tiene tres pasos: documentos verificados y físicos, selección
de horario y pago. El servidor informa la etapa y controla el acceso a las demás
rutas; ocultar el menú no concede ni sustituye autorización. Antes de pagar solo
se permite inscripción, contraseña, notificaciones y salir. Tras aprobación del
pago se refrescan estado y layout para mostrar el menú completo. Si otra matrícula
propia sigue incompleta, la cuenta conserva la restricción.

El selector reutiliza modalidad, inicio y horas por día del motor manual. Exige
el plan completo, incluido el último día parcial; no muestra instructores. Al
reservar aparecen cohorte tentativa y contador sincronizado con `serverNow`.
Vencimiento, ampliación y liberación dependen del servidor, incluso con cron apagado.
Una reserva vencida vuelve al paso 2 y conserva solicitud y sesión.

## Pago y recuperación

- Configuración, cotización y desglose llegan del backend; no se envían importes,
  moneda, instructor ni cohorte elegidos por el cliente.
- Se crea un UUID por intento antes de tokenizar. Una respuesta incierta se recupera
  consultando ese mismo intento, sin generar otro cobro. El pago se consulta por
  matrícula propia cada 30 segundos y al recuperar visibilidad.
- Simulado ofrece aprobado, rechazado y pendiente. Rechazado permite otro intento
  dentro del vencimiento original; pendiente o revisión bloquea otro pago. Un pago
  pendiente sigue visible aunque venza su reserva.
- La migración 062 caduca un checkout abandonado únicamente si nunca se envió.
  `puedeCobrar=false` impide presentar tarjeta nuevamente tras reclamar dispatch.
- Manual indica que el administrador registra efectivo desde la ficha del alumno;
  antes muestra el total servidor y pide confirmación, con referencia opcional.
- Aprobado refresca el acceso. Revisión conserva el dinero y pide contactar a la
  escuela; no muestra éxito académico ni invita a pagar nuevamente.

Kushki usa `@kushki/js-sdk` 1.10.0 fijado en el lockfile. Se importa solo al montar
el checkout Kushki del paso 3. Hosted Fields recoge la tarjeta en sus campos; el
backend recibe únicamente el token opaco, mantenido en memoria y nunca en URL,
almacenamiento o logs. Claves privadas y secreto de webhook no llegan al navegador.
La CSP report-only de `/student/inscripcion` incluye los orígenes del SDK, Hosted
Fields, Sift y Cardinal. Debe comprobarse con el comercio en UAT, incluidos OTP/3DS,
antes de producción. Fuentes oficiales y firma documentadas en el backend, en
`docs/operations/inscripcion-pagos-proveedores.md`.

## Después del pago

Horarios muestra el plan propio asignado e instructor. Historial conserva asistencia
y objetivos de horas; Documentos para llevar muestra estados físicos y, para
solicitudes, la fecha de la primera práctica propia como plazo. Si aún no existe
práctica, no se inventa fecha. El aviso de carné de Cruz Roja destaca cuando el
alumno declaró que no conoce su tipo de sangre. No hay subida de documentos aquí.

En Alumnos, las etiquetas Por agendar y Reservado distinguen las etapas incompletas.
El filtro de pendientes de cohorte requiere 061 y solo considera etapa activa.
Reducir cupo bajo matrículas y reservas vigentes muestra IC409 en español.

## Inicio y aceptación manual por el operador

Aplicar manualmente 058 → 059 → 060 → 061 → 062 siguiendo los preflight y scripts
con ROLLBACK del backend. 057 está aplicada y no se modifica. No iniciar el runtime
nuevo sobre un esquema sin estas dependencias.

Desde este repositorio, con el backend local en el puerto 3000:

```sh
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

Abrir `http://localhost:3001/inscripcion`, aprobar la solicitud de ensayo en admin
y entrar con el enlace impreso en la terminal del backend (`EMAIL_PROVIDER=console`).
Recorrer los tres pasos, reservar y usar el checkout simulado; comprobar rechazo,
pendiente, éxito, vencimiento y refresco del menú. En otra cuenta, registrar efectivo
y liberar una reserva sin pago desde Alumnos. El guion completo y las condiciones
de prueba están en el runbook del backend; no se ejecutaron estos ensayos aquí.

Para Kushki se necesitan credenciales UAT del comercio y URL HTTPS de webhook,
conservando `metadata.drivePaymentId`. Usar solo los
[datos de prueba oficiales](https://docs.kushki.com/ec/getting-started/testing-your-integration).
No usar una tarjeta real ni sustituir el token por un valor inventado.

## Límites de esta entrega

Los builds y el typecheck de aplicación excluyen temporalmente los tests heredados
con errores de tipos; se restaura `tsconfig.json` al terminar. Las suites y la
corrección de esos tests quedan para la fase final autorizada. Turnstile F43 sigue
aplazado y es requisito antes de producción. No se implementa contenido descargable
de profesores ni asignación de exámenes por alumno: los ganchos futuros son
`courseId`/`enrollmentId` y la misma guarda de cuenta, propiedad y etapa.
