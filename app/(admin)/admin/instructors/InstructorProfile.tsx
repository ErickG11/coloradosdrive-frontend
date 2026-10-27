import { Button, StatusBadge } from "@/components/ui";
import type { InstructorDetail } from "@/types";
import { InstructorAvatar, InstructorIcon } from "./InstructorVisual";
import styles from "./instructors.module.css";

export function InstructorProfile({
  instructor,
  onEdit,
  onAsk,
}: {
  instructor: InstructorDetail;
  onEdit: () => void;
  onAsk: (action: "desactivar" | "reactivar" | "restablecer-password") => void;
}) {
  return (
    <div className={styles.profile}>
      <header className={styles.profileHeader}>
        <InstructorAvatar instructor={instructor} />
        <div>
          <h3>{instructor.nombreCompleto}</h3>
          <p>Cédula · {instructor.cedula}</p>
        </div>
        <StatusBadge status={instructor.activo ? "activo" : "inactivo"} />
      </header>
      <section className={styles.personal} aria-labelledby="instructor-personal-title">
        <h3 id="instructor-personal-title">
          <InstructorIcon name="instructor" />
          Información personal
        </h3>
        <dl>
          <div className={styles.fullField}>
            <dt>Nombre</dt>
            <dd>{instructor.nombreCompleto}</dd>
          </div>
          <div>
            <dt>Cédula</dt>
            <dd>{instructor.cedula}</dd>
          </div>
          <div>
            <dt>
              <InstructorIcon name="phone" />
              Teléfono
            </dt>
            <dd>{instructor.telefono ?? "—"}</dd>
          </div>
          <div className={styles.fullField}>
            <dt>
              <InstructorIcon name="mail" />
              Correo electrónico
            </dt>
            <dd>{instructor.correo}</dd>
          </div>
          <div>
            <dt>Estado de cuenta</dt>
            <dd>{instructor.activo ? "Activo" : "Inactivo"}</dd>
          </div>
        </dl>
      </section>
      <section className={styles.actions} aria-labelledby="instructor-actions-title">
        <h3 id="instructor-actions-title">Acciones de la cuenta</h3>
        <div className={styles.primaryActions}>
          <Button variant="secondary" onClick={onEdit}>
            <InstructorIcon name="edit" />
            Editar
          </Button>
          <Button
            variant={instructor.activo ? "danger" : "secondary"}
            onClick={() => onAsk(instructor.activo ? "desactivar" : "reactivar")}
          >
            <InstructorIcon name={instructor.activo ? "inactive" : "check"} />
            {instructor.activo ? "Desactivar" : "Reactivar"}
          </Button>
        </div>
        {instructor.activo && (
          <button
            type="button"
            className={styles.passwordAction}
            aria-label="Restablecer contraseña"
            aria-describedby="instructor-reset-password-help"
            onClick={() => onAsk("restablecer-password")}
          >
            <span className={styles.passwordIcon}>
              <InstructorIcon name="key" />
            </span>
            <span>
              <strong>Restablecer contraseña</strong>
              <small id="instructor-reset-password-help">
                Enviar una contraseña temporal a su correo.
              </small>
            </span>
            <span className={styles.passwordArrow} aria-hidden="true">
              <InstructorIcon name="mail" />
            </span>
          </button>
        )}
      </section>
    </div>
  );
}
