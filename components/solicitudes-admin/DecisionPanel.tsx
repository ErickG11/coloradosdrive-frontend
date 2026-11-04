"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { decidirSolicitud } from "@/lib/api/inscripcion";
import type {
  DecisionInput,
  MotivoDevolucion,
  MotivoRechazo,
  SolicitudAdminDetalle,
} from "@/types/inscripcion";
import { adminErrorMessage, esConflictoDeEstado } from "./adminErrors";
import {
  ETIQUETA_MOTIVO,
  MOTIVOS_DEVOLVER,
  MOTIVOS_RECHAZAR,
  formatearFecha,
  metodosParaVerificacion,
} from "./catalogo";
import type { ResultadoDecision } from "./decisionTipos";
import styles from "./solicitudes.module.css";

type Accion = "aprobar" | "devolver" | "rechazar";

const MIN_MENSAJE = 10;
const MAX_MENSAJE = 300;
const MAX_NOTA = 1000;

const ACCIONES: { id: Accion; label: string }[] = [
  { id: "aprobar", label: "Aprobar" },
  { id: "devolver", label: "Devolver" },
  { id: "rechazar", label: "Rechazar" },
];

// Requisitos que el servidor exige para aprobar. Es una guía visible para el admin: el
// servidor sigue siendo quien decide.
function requisitosDeAprobacion(detalle: SolicitudAdminDetalle): { texto: string; ok: boolean }[] {
  const ultima = (tipo: "identidad" | "estudios") =>
    detalle.verificaciones
      .filter((v) => v.tipo === tipo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const habilita = (tipo: "identidad" | "estudios") => {
    const v = ultima(tipo);
    if (!v || v.resultado !== "verificado") return false;
    if (v.metodo === "registro_civil_web_service") return tipo === "identidad";
    return metodosParaVerificacion(tipo, detalle.nivelEstudios).some(
      (m) => m.metodo === v.metodo && m.habilita,
    );
  };
  const lista = [
    { texto: "Identidad verificada en el Registro Civil", ok: habilita("identidad") },
    { texto: "Estudios verificados con un método válido", ok: habilita("estudios") },
  ];
  if (detalle.documentoRequerido)
    lista.push({
      texto: "Certificado de estudios presente",
      ok: detalle.certificado !== null && !detalle.documentoEstudiosPendientePorCupo,
    });
  return lista;
}

function SoloLectura({ detalle }: { detalle: SolicitudAdminDetalle }) {
  if (detalle.estado === "borrador")
    return (
      <p className={styles.note}>
        Todavía es un borrador: el postulante no la ha enviado, por eso no se puede decidir.
      </p>
    );
  if (detalle.estado === "aprobada")
    return (
      <p className={styles.note}>
        Solicitud aprobada. La decisión es definitiva y el expediente queda en solo lectura.
      </p>
    );
  const motivo =
    detalle.estado === "devuelta" ? detalle.devolucionMotivoCodigo : detalle.rechazoMotivoCodigo;
  const nota =
    detalle.estado === "devuelta" ? detalle.devolucionNotaInterna : detalle.rechazoNotaInterna;
  return (
    <div className={styles.detail}>
      <p className={styles.note}>
        {detalle.estado === "devuelta"
          ? "Devuelta al postulante: espera su corrección. No se puede decidir hasta que la reenvíe."
          : "Solicitud rechazada. La decisión es definitiva y el expediente queda en solo lectura."}
      </p>
      <dl className={styles.dataGrid}>
        {motivo ? (
          <div>
            <dt>Motivo</dt>
            <dd>{ETIQUETA_MOTIVO[motivo] ?? motivo}</dd>
          </div>
        ) : null}
        {detalle.estado === "devuelta" ? (
          <div>
            <dt>Devuelta</dt>
            <dd>{formatearFecha(detalle.devueltaAt)}</dd>
          </div>
        ) : null}
        {detalle.estado === "devuelta" && detalle.devolucionMensaje ? (
          <div>
            <dt>Mensaje que ve el postulante</dt>
            <dd>{detalle.devolucionMensaje}</dd>
          </div>
        ) : null}
        {nota ? (
          <div>
            <dt>Nota interna (el postulante no la ve)</dt>
            <dd>{nota}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function DecisionPanel({
  detalle,
  onDecidida,
  onConflicto,
}: {
  detalle: SolicitudAdminDetalle;
  onDecidida: (resultado: ResultadoDecision) => void;
  onConflicto: () => void;
}) {
  const baseId = useId();
  const [accion, setAccion] = useState<Accion>("aprobar"),
    [motivo, setMotivo] = useState(""),
    [mensaje, setMensaje] = useState(""),
    [nota, setNota] = useState(""),
    [errores, setErrores] = useState<{ motivo?: string; mensaje?: string; nota?: string }>({}),
    [confirmando, setConfirmando] = useState(false),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const lock = useRef(false);

  if (detalle.estado !== "enviada") return <SoloLectura detalle={detalle} />;

  const motivos = accion === "devolver" ? MOTIVOS_DEVOLVER : MOTIVOS_RECHAZAR;
  const motivoActual = motivos.find((m) => m.codigo === motivo);
  const esOtro = motivo === "OTRO";
  const requisitos = requisitosDeAprobacion(detalle);
  const faltan = requisitos.filter((r) => !r.ok);

  function cambiarAccion(siguiente: Accion) {
    setAccion(siguiente);
    setMotivo("");
    setMensaje("");
    setErrores({});
    setError("");
    setConfirmando(false);
  }

  // Devolver se envía directo; aprobar y rechazar piden una confirmación explícita antes.
  function continuar() {
    const nuevos: typeof errores = {};
    if (accion !== "aprobar" && !motivo) nuevos.motivo = "Selecciona el motivo.";
    if (esOtro) {
      const largo = mensaje.trim().length;
      if (largo < MIN_MENSAJE || largo > MAX_MENSAJE)
        nuevos.mensaje = `El mensaje debe tener entre ${MIN_MENSAJE} y ${MAX_MENSAJE} caracteres.`;
    }
    if (nota.length > MAX_NOTA) nuevos.nota = `La nota admite hasta ${MAX_NOTA} caracteres.`;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    if (accion === "devolver") void enviar();
    else setConfirmando(true);
  }

  async function enviar() {
    if (lock.current) return;
    lock.current = true;
    setOcupado(true);
    setError("");
    const notaInterna = nota.trim() ? { notaInterna: nota.trim() } : {};
    let input: DecisionInput;
    if (accion === "aprobar") input = { accion, ...notaInterna };
    else {
      // El mensaje solo viaja con OTRO: los demás motivos usan el texto predefinido del servidor.
      const extra = esOtro ? { mensaje: mensaje.trim() } : {};
      input =
        accion === "devolver"
          ? { accion, motivoCodigo: motivo as MotivoDevolucion, ...extra, ...notaInterna }
          : { accion, motivoCodigo: motivo as MotivoRechazo, ...extra, ...notaInterna };
    }
    try {
      const resultado = await decidirSolicitud(detalle.id, input);
      onDecidida(resultado);
    } catch (e) {
      setError(adminErrorMessage(e));
      setConfirmando(false);
      if (esConflictoDeEstado(e)) onConflicto();
    } finally {
      lock.current = false;
      setOcupado(false);
    }
  }

  const etiquetaBoton =
    accion === "aprobar"
      ? "Aprobar solicitud"
      : accion === "devolver"
        ? "Devolver solicitud"
        : "Rechazar solicitud";
  const sinCorreo =
    accion === "rechazar" && motivoActual && "correo" in motivoActual && !motivoActual.correo;

  return (
    <div className={styles.detail}>
      <fieldset className={styles.actionGroup} disabled={ocupado}>
        <legend className="sr-only">Acción de la decisión</legend>
        {ACCIONES.map((item) => (
          <label
            key={item.id}
            className={styles.actionOption}
            data-action={item.id}
            data-checked={accion === item.id}
          >
            <input
              type="radio"
              name={`${baseId}-accion`}
              className="sr-only"
              checked={accion === item.id}
              onChange={() => cambiarAccion(item.id)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>

      {accion === "aprobar" ? (
        <div className={styles.detail}>
          <ul className={styles.checklist} aria-label="Requisitos para aprobar">
            {requisitos.map((r) => (
              <li key={r.texto} data-ok={r.ok}>
                <span aria-hidden="true">{r.ok ? "✔" : "✖"}</span>
                <span>
                  {r.texto}
                  <span className="sr-only">{r.ok ? ": cumplido" : ": pendiente"}</span>
                </span>
              </li>
            ))}
          </ul>
          {faltan.length > 0 ? (
            <p className={styles.note}>
              Faltan requisitos: el servidor rechazará la aprobación hasta que estén completos.
            </p>
          ) : null}
          <p className={styles.note}>
            Al aprobar se crea la cuenta del alumno sin contraseña, la matrícula queda por agendar,
            sin cohorte ni monto, y se envía un enlace de un solo uso para crear la contraseña.
          </p>
        </div>
      ) : (
        <div className={styles.detail}>
          <Select
            label="Motivo"
            value={motivo}
            error={errores.motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setMensaje("");
              setErrores((previo) => ({ ...previo, motivo: undefined, mensaje: undefined }));
            }}
          >
            <option value="">Selecciona un motivo…</option>
            {motivos.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.label}
              </option>
            ))}
          </Select>
          {motivoActual?.mensaje ? (
            <p className={styles.preview}>
              <strong>Mensaje para el postulante:</strong> {motivoActual.mensaje}
            </p>
          ) : null}
          {esOtro ? (
            <div className={styles.detail}>
              <Textarea
                label="Mensaje para el postulante"
                value={mensaje}
                maxLength={MAX_MENSAJE}
                error={errores.mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                aria-describedby={`${baseId}-contador`}
                required
              />
              <p id={`${baseId}-contador`} className="text-sm text-text-secondary">
                Texto plano, de {MIN_MENSAJE} a {MAX_MENSAJE} caracteres ({mensaje.trim().length}/
                {MAX_MENSAJE}). El postulante lo verá.
              </p>
            </div>
          ) : null}
          {accion === "devolver" ? (
            <p className={styles.note}>
              Se envía un correo corto sin datos: le indica que ingrese a la página de inscripción
              con su correo para ver la corrección.
            </p>
          ) : null}
          {sinCorreo ? (
            <p className={styles.note}>
              Este motivo no envía correo
              {motivo === "SPAM" ? " y bloquea el correo del postulante durante 30 días" : ""}.
            </p>
          ) : null}
        </div>
      )}

      <Textarea
        label="Nota interna (opcional, el postulante no la ve)"
        value={nota}
        maxLength={MAX_NOTA}
        error={errores.nota}
        onChange={(e) => setNota(e.target.value)}
      />

      <FormError>{error}</FormError>

      {confirmando ? (
        <div
          className={styles.confirmBox}
          role="group"
          aria-label={`Confirmar: ${etiquetaBoton.toLowerCase()}`}
        >
          <p>
            {accion === "aprobar"
              ? "¿Confirmas que quieres aprobar esta solicitud? Se creará la cuenta del alumno y se enviará el enlace para crear su contraseña."
              : "¿Confirmas el rechazo? Es definitivo: el postulante no podrá corregir esta solicitud."}
          </p>
          <div className={styles.controls}>
            <Button
              autoFocus
              variant={accion === "rechazar" ? "danger" : "primary"}
              isLoading={ocupado}
              onClick={() => void enviar()}
            >
              {accion === "aprobar" ? "Confirmar aprobación" : "Confirmar rechazo"}
            </Button>
            <Button variant="ghost" disabled={ocupado} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.controls}>
          <Button
            variant={accion === "rechazar" ? "danger" : "primary"}
            isLoading={ocupado}
            onClick={continuar}
          >
            {etiquetaBoton}
          </Button>
        </div>
      )}
    </div>
  );
}
