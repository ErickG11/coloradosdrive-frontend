import type { InscripcionConfig } from "@/types/inscripcion";

// Textos en BORRADOR, pendientes de revisión legal. Los plazos de borradores, devoluciones y
// certificados reflejan los trabajos de retención del servidor; el plazo general viene de la
// configuración pública. Los términos citan solo reglas que el sistema ya aplica.

export function AvisoPrivacidad({ config }: { config: InscripcionConfig }) {
  return (
    <>
      <h3>Quién trata tus datos</h3>
      <p>
        Colorados Drive, escuela de conducción de Santo Domingo, trata tus datos para revisar tu
        solicitud, comunicarte la decisión y, si se aprueba, crear tu cuenta y tu matrícula.
      </p>
      <h3>Qué datos pedimos</h3>
      <p>
        Correo, nombres, apellidos, cédula, fecha de nacimiento, teléfono (opcional), nacionalidad,
        nivel de estudios y, cuando corresponde, un certificado de estudios. Si eres menor de edad,
        también los datos y la autorización de tu representante legal.
      </p>
      <h3>Dato de salud</h3>
      <p>
        Te pedimos tu tipo de sangre, que es un dato de salud. Lo usamos solo para tu expediente de
        conducción y para emergencias durante las prácticas. Si no lo conoces puedes indicarlo; la
        ANT exige el carné de la Cruz Roja para la licencia.
      </p>
      <h3>Quién lo ve</h3>
      <p>
        Solo el personal autorizado de la escuela revisa tu solicitud y tu certificado. Usamos
        servicios de alojamiento, almacenamiento y correo para operar la plataforma.
      </p>
      <h3>Cuánto tiempo lo conservamos</h3>
      <p>
        Los borradores se eliminan a los 7 días y las solicitudes devueltas a los 15. Los
        certificados verificados se borran a los 30 días de verificados y solo queda el registro de
        la verificación. Las demás solicitudes se conservan hasta {config.retencionDias} días según
        su estado.
      </p>
      <h3>Tus derechos</h3>
      <p>
        Puedes pedir acceso, corrección o eliminación de tus datos escribiendo a{" "}
        <a className="underline" href={`mailto:${config.contactoDerechos}`}>
          {config.contactoDerechos}
        </a>
        . Verificaremos tu identidad antes de actuar.
      </p>
    </>
  );
}

export function TerminosCondiciones() {
  return (
    <>
      <h3>Reprogramaciones</h3>
      <p>
        Puedes reprogramar una práctica hasta 2 veces. No se admiten más reprogramaciones después de
        ese límite.
      </p>
      <h3>Cancelación</h3>
      <p>
        Puedes cancelar una práctica desde la plataforma; el cupo se libera según las reglas
        vigentes de la escuela.
      </p>
      <h3>Asistencia</h3>
      <p>
        La asistencia a clases y prácticas es obligatoria para completar el curso. La escuela
        registra tu asistencia en cada sesión.
      </p>
      <h3>Reembolsos</h3>
      <p>
        La política de reembolso será comunicada por la escuela antes de cualquier pago. Este
        apartado se completará tras la revisión legal.
      </p>
      <h3>Veracidad</h3>
      <p>
        Los datos y documentos que presentes deben ser verdaderos. La escuela puede devolver o
        rechazar una solicitud con datos inconsistentes.
      </p>
    </>
  );
}
