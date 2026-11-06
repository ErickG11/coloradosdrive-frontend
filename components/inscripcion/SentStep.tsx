import { EnrollmentActionLink } from "@/components/inscripcion/EnrollmentActionLink";
import { Button } from "@/components/ui/Button";
import styles from "./inscripcion.module.css";
export function SentStep({ onDocuments }: { onDocuments: () => void }) {
  return (
    <div className={styles.form}>
      <p>
        Tu solicitud está disponible para revisión del administrador. Recibirás la respuesta en tu
        correo.
      </p>
      <p>
        Si se aprueba, te enviaremos las credenciales de acceso. Deberás cambiar la contraseña
        temporal al ingresar.
      </p>
      <p>
        La papeleta de votación y el tipo de sangre pendientes se entregan físicamente en la
        escuela, incluso con el curso iniciado.
      </p>
      <p>
        Si cierras o recargas esta página, verifica nuevamente tu correo para recuperar el progreso.
      </p>
      <Button variant="secondary" onClick={onDocuments}>
        Revisar mis documentos
      </Button>
      <EnrollmentActionLink href="/">Volver al inicio</EnrollmentActionLink>
    </div>
  );
}
