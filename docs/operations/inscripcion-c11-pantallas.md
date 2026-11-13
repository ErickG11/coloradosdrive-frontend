# C11: inventario de interfaces de inscripción

- `/inscripcion`: InscripcionWizard, IndicadorPasos, PasoRequisitos, PasoCorreo, PasoCodigo, PasoConsentimiento, PasoDatos, PasoEstudios, PasoRevisar y PantallasEstado.
- Estados de solicitud: borrador, enviada, devuelta con correcciones y reenvío, aprobada, rechazada, archivada y revocada; PantallasEstado conserva sus decisiones y controles.
- `/crear-contrasena`: CrearContrasena; carga, enlace válido, inválido o caducado, errores y contraseña creada.
- `/student/inscripcion`: StudentEnrollmentWizard; documentos, horario y pago; espera por curso, falta de cupo, reserva vigente/vencida, pago pendiente/en revisión/fallido/confirmado y EnrollmentWorkspace para acceso completo.
- Componentes de horario: StudentSchedulePicker, PlanFields, ScheduleDurationTable, SchedulePlanView y ReservationBanner.
- Componentes de pago: StudentPaymentStep, KushkiHostedFields y BillingPanel.
- `InscripcionFlow` y sus pasos alternativos son componentes heredados sin una ruta pública que los monte; no se alteran sus contratos ni se habilitan nuevas rutas.

El marco EnrollmentFlowFrame usa tokens locales, logo existente, selector de tema y acompañamiento responsive. Las normas legales, captcha, APIs y validaciones se conservan. No se añade un campo de dirección que el formulario/API actual no admite. Un archivo ya subido se reemplaza mediante la operación existente; Quitar archivo solo retira un intento local fallido, sin fingir borrar el certificado del servidor.
