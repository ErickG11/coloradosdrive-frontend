"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { enviarSolicitud, getProgreso, reenviarSolicitud } from "@/lib/api/inscripcion";
import {
  inscripcionErrorMessage,
  requiereVerificarCorreoDeNuevo,
} from "@/lib/api/inscripcionErrors";
import type { ProgresoSolicitud, TipoSangre } from "@/types/inscripcion";
import { faltantesSolicitud } from "./faltantesSolicitud";
import { etiquetaNivel, tieneCertificado } from "./nivelesEstudios";
import formStyles from "../inscripcion.module.css";
import styles from "./pasos.module.css";

export interface PasoRevisarProps {
  solicitudId: string;
  progreso: ProgresoSolicitud;
  onProgreso: (progreso: ProgresoSolicitud) => void;
  onAvanzar: () => void;
  onVolver: () => void;
  irAPaso: (paso: number) => void;
}

const PASO_CORREO = 1;
const PASO_CONSENTIMIENTO = 3;
const PASO_DATOS = 4;
const PASO_ESTUDIOS = 5;

const NACIONALIDAD: Record<string, string> = {
  ecuatoriana: "Ecuatoriana",
  extranjero_con_cedula: "Extranjera o extranjero con cédula",
};

function etiquetaSangre(valor: TipoSangre | null): string {
  if (!valor) return "Sin completar";
  return valor === "no_sabe" ? "No lo sé (llevarás el carné de la Cruz Roja)" : valor;
}

function formatearFecha(valor: string | null): string {
  const iso = valor?.slice(0, 10);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Sin completar";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div>
      <dt>{etiqueta}</dt>
      <dd>{valor || "Sin completar"}</dd>
    </div>
  );
}

function Bloque({
  titulo,
  accion,
  onEditar,
  children,
}: {
  titulo: string;
  accion: string;
  onEditar: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.resumenBloque}>
      <div className={styles.resumenCabecera}>
        <h3>{titulo}</h3>
        <Button type="button" variant="secondary" size="sm" onClick={onEditar}>
          {accion}
        </Button>
      </div>
      {children}
    </section>
  );
}

export function PasoRevisar({
  solicitudId,
  progreso,
  onProgreso,
  onAvanzar,
  onVolver,
  irAPaso,
}: PasoRevisarProps) {
  const [intentado, setIntentado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const alerta = useRef<HTMLDivElement>(null);

  const faltantes = faltantesSolicitud(progreso);
  const datos = progreso.datos;
  const reenvio = progreso.estado === "devuelta";
  const nombre = [datos.nombres, datos.apellidos].filter(Boolean).join(" ");

  function enfocarResumen() {
    // Espera a que el resumen de validación esté en el DOM.
    requestAnimationFrame(() => alerta.current?.focus());
  }

  async function enviar() {
    if (bloqueo.current) return;
    setIntentado(true);
    setErrorGeneral("");
    if (faltantes.length > 0) {
      enfocarResumen();
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    try {
      if (reenvio) await reenviarSolicitud(solicitudId);
      else await enviarSolicitud(solicitudId);
      onProgreso(await getProgreso(solicitudId));
      onAvanzar();
    } catch (error) {
      if (requiereVerificarCorreoDeNuevo(error)) {
        irAPaso(PASO_CORREO);
        return;
      }
      setErrorGeneral(inscripcionErrorMessage(error));
      // El servidor es la fuente de verdad: se refresca para mostrar lo que realmente falta.
      try {
        onProgreso(await getProgreso(solicitudId));
      } catch {
        // Se conserva el resumen actual.
      }
      enfocarResumen();
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  const mostrarResumen = intentado && (faltantes.length > 0 || errorGeneral !== "");

  return (
    <div className={formStyles.form}>
      <p>
        Revisa tu información. Si algo no es correcto, usa «Editar» en la sección que corresponda.
      </p>

      <div className={styles.resumen}>
        <Bloque
          titulo="Datos personales"
          accion="Editar datos"
          onEditar={() => irAPaso(PASO_DATOS)}
        >
          <dl className={styles.resumenDatos}>
            <Dato etiqueta="Nombres y apellidos" valor={nombre} />
            <Dato
              etiqueta={
                datos.documentType === "pasaporte"
                  ? "Pasaporte"
                  : datos.documentType === "otro"
                    ? "Otro documento"
                    : "Cédula"
              }
              valor={datos.documentNumber ?? datos.cedula}
            />
            <Dato etiqueta="Fecha de nacimiento" valor={formatearFecha(datos.fechaNacimiento)} />
            <Dato etiqueta="Teléfono" valor={datos.telefono ?? "No indicado"} />
            <Dato
              etiqueta="Nacionalidad"
              valor={datos.nacionalidadTipo ? NACIONALIDAD[datos.nacionalidadTipo] : null}
            />
            <Dato etiqueta="Tipo de sangre" valor={etiquetaSangre(datos.tipoSangre)} />
            {datos.representante ? (
              <>
                <Dato etiqueta="Representante legal" valor={datos.representante.nombre} />
                <Dato
                  etiqueta={`Documento del representante (${datos.representante.documentType ?? "cedula"})`}
                  valor={datos.representante.documentNumber ?? datos.representante.cedula}
                />
              </>
            ) : null}
          </dl>
        </Bloque>

        <Bloque titulo="Estudios" accion="Editar estudios" onEditar={() => irAPaso(PASO_ESTUDIOS)}>
          <dl className={styles.resumenDatos}>
            <Dato etiqueta="Nivel de estudios" valor={etiquetaNivel(progreso.nivelEstudios)} />
            {progreso.documentoRequerido || tieneCertificado(progreso) ? (
              <Dato
                etiqueta="Certificado"
                valor={
                  tieneCertificado(progreso)
                    ? "Archivo enviado"
                    : progreso.documentoEstudiosPendientePorCupo
                      ? "Pendiente: la escuela te lo pedirá después"
                      : "Falta subirlo"
                }
              />
            ) : (
              <Dato etiqueta="Certificado" valor="No se requiere archivo" />
            )}
          </dl>
        </Bloque>

        <Bloque
          titulo="Consentimiento"
          accion="Ver aviso y términos"
          onEditar={() => irAPaso(PASO_CONSENTIMIENTO)}
        >
          <p className="text-sm">
            {progreso.consentimientoVigente
              ? "Aceptaste el aviso de privacidad y los términos vigentes."
              : "Falta aceptar el aviso de privacidad y los términos vigentes."}
          </p>
        </Bloque>
      </div>

      <div
        ref={alerta}
        tabIndex={-1}
        role={mostrarResumen ? "alert" : undefined}
        className={mostrarResumen ? styles.avisoAlerta : undefined}
      >
        {mostrarResumen ? (
          <>
            <strong>
              {faltantes.length > 0
                ? "Antes de enviar, completa lo siguiente:"
                : "No pudimos enviar tu solicitud."}
            </strong>
            {errorGeneral ? <span>{errorGeneral}</span> : null}
            {faltantes.length > 0 ? (
              <ul className={styles.listaFaltantes}>
                {faltantes.map((faltante) => (
                  <li key={faltante.clave}>
                    <span>{faltante.texto}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => irAPaso(faltante.paso)}
                    >
                      Completar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={formStyles.stepActions}>
        <Button type="button" onClick={() => void enviar()} isLoading={ocupado}>
          {reenvio ? "Reenviar solicitud" : "Enviar solicitud"}
        </Button>
        <Button type="button" variant="secondary" disabled={ocupado} onClick={onVolver}>
          Volver
        </Button>
      </div>
    </div>
  );
}
