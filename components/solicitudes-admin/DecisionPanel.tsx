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
import { ETIQUETA_MOTIVO, MOTIVOS_DEVOLVER, MOTIVOS_RECHAZAR, formatearFecha } from "./catalogo";
import type { ResultadoDecision } from "./decisionTipos";
import { horaGuayaquil, type RequestReviewLock } from "./useRequestReview";
import styles from "./solicitudes.module.css";

type Accion = "aprobar" | "devolver" | "rechazar";

const MIN_MENSAJE = 10;
const MAX_MENSAJE = 300;
const MAX_NOTA = 1000;

const ACCIONES: { id: Accion; label: string }[] = [
  { id: "rechazar", label: "Rechazar" },
  { id: "devolver", label: "Devolver para corregir" },
  { id: "aprobar", label: "Aprobar" },
];

// Requisitos que el servidor exige para aprobar. Es una guía visible para el admin: el
// servidor sigue siendo quien decide.
export function requisitosDeAprobacion(
  detalle: SolicitudAdminDetalle,
): { texto: string; ok: boolean }[] {
  const ultima = (tipo: "identidad" | "estudios") =>
    detalle.verificaciones
      .filter((v) => v.tipo === tipo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  const habilita = (tipo: "identidad" | "estudios") => {
    const v = ultima(tipo);
    if (!v || v.resultado !== "verificado" || v.vigente === false) return false;
    return true;
  };
  const lista = [
    { texto: "Identidad verificada", ok: habilita("identidad") },
    { texto: "Estudios verificados", ok: habilita("estudios") },
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
  if (detalle.estado === "aprobada" || detalle.estado === "archivada")
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
  candado,
  onDecidida,
  onConflicto,
}: {
  detalle: SolicitudAdminDetalle;
  candado: RequestReviewLock;
  onDecidida: (resultado: ResultadoDecision) => void;
  onConflicto: () => void;
}) {
  const baseId = useId();
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
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
  if (detalle.identityRulesActive && candado.phase !== "owned" && candado.phase !== "inactive")
    return (
      <p role="status" className={styles.note}>
        {candado.phase === "other"
          ? `Otro administrador está revisando esta solicitud hasta las ${horaGuayaquil(candado.until)}.`
          : candado.phase === "error"
            ? "No se pudo preparar la revisión. Cierra y vuelve a abrir la solicitud."
            : "Preparando la revisión…"}
      </p>
    );

  const motivos = accion === "devolver" ? MOTIVOS_DEVOLVER : MOTIVOS_RECHAZAR;
  const motivoActual = motivos.find((m) => m.codigo === motivo);
  const esOtro = motivo === "OTRO";
  const requisitos = requisitosDeAprobacion(detalle);
  const faltan = requisitos.filter((r) => !r.ok);

  function cambiarAccion(siguiente: Accion) {
    if (lock.current) return;
    setAbierto(true);
    setAccion(siguiente);
    requestAnimationFrame(() => formRef.current?.focus());
    setMotivo("");
    setMensaje("");
    setErrores({});
    setError("");
    setConfirmando(false);
  }

  // Devolver se envía directo; aprobar y rechazar piden una confirmación explícita antes.
  function continuar() {
    if (accion === "aprobar" && faltan.length > 0) return;
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
    if (lock.current || (accion === "aprobar" && faltan.length > 0)) return;
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
      <div
        className={styles.decisionForm}
        hidden={!abierto}
        ref={formRef}
        tabIndex={-1}
        aria-label="Preparar decisión"
      >
        <div className={styles.controls}>
          <h3>
            {accion === "aprobar"
              ? "Aprobar solicitud"
              : accion === "devolver"
                ? "Devolver para corregir"
                : "Rechazar solicitud"}
          </h3>
          <Button variant="ghost" disabled={ocupado} onClick={() => setAbierto(false)}>
            Cerrar acción
          </Button>
        </div>

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
              Al aprobar se crea la cuenta del alumno sin contraseña, la matrícula queda por
              agendar, sin cohorte ni monto, y se envía un enlace de un solo uso para crear la
              contraseña.
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
              <option value="" disabled>
                Seleccione…
              </option>
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
                disabled={accion === "aprobar" && faltan.length > 0}
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
              disabled={accion === "aprobar" && faltan.length > 0}
              isLoading={ocupado}
              onClick={continuar}
            >
              {etiquetaBoton}
            </Button>
          </div>
        )}
      </div>
      {faltan.length > 0 ? (
        <p id={`${baseId}-faltantes`} className={styles.note} role="status">
          Para aprobar falta: {faltan.map((r) => r.texto.toLowerCase()).join(", ")}.
        </p>
      ) : null}
      <div className={styles.decisionActions}>
        {ACCIONES.map((item) => (
          <Button
            key={item.id}
            variant={item.id === "aprobar" ? "primary" : "secondary"}
            className={item.id === "rechazar" ? styles.dangerOutline : undefined}
            disabled={ocupado || (item.id === "aprobar" && faltan.length > 0)}
            aria-describedby={
              item.id === "aprobar" && faltan.length > 0 ? `${baseId}-faltantes` : undefined
            }
            aria-expanded={abierto && accion === item.id}
            onClick={() => cambiarAccion(item.id)}
          >
            {item.id === "devolver" ? "Devolver para corregir" : item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
