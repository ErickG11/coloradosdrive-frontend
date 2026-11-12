import type { ConsentimientoAdmin } from "@/types/inscripcion";
import { formatearFecha } from "./catalogo";
import styles from "./solicitudes.module.css";

export function ConsentimientoPanel({
  consentimiento,
}: {
  consentimiento: ConsentimientoAdmin | null;
}) {
  return (
    <section className={styles.section} aria-labelledby="consent-title">
      <h3 id="consent-title">Consentimiento</h3>
      {consentimiento ? (
        <>
          <dl className={styles.dataGrid}>
            <div>
              <dt>Aviso de privacidad</dt>
              <dd>Versión {consentimiento.versionAviso}</dd>
            </div>
            <div>
              <dt>Términos</dt>
              <dd>Versión {consentimiento.versionTerminos}</dd>
            </div>
            <div>
              <dt>Aceptado</dt>
              <dd>{formatearFecha(consentimiento.aceptadoAt)}</dd>
            </div>
          </dl>
          {consentimiento.representanteNombre ? (
            <div className={styles.representative}>
              <h4>Representante legal</h4>
              <p>Nombre: {consentimiento.representanteNombre}</p>
              <p>
                Documento ({consentimiento.representanteDocumentType ?? "cedula"}):{" "}
                {consentimiento.representanteDocumentNumber ??
                  consentimiento.representanteCedula ??
                  "No registrado"}
              </p>
              <p>Autorización: {consentimiento.representanteAcepta ? "Registrada" : "Pendiente"}</p>
            </div>
          ) : (
            <p className={styles.note}>Sin representante registrado.</p>
          )}
        </>
      ) : (
        <p>No hay consentimiento registrado.</p>
      )}
    </section>
  );
}
