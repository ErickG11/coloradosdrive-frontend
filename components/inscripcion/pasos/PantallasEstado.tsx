"use client";
import { EnrollmentActionLink } from "@/components/inscripcion/EnrollmentActionLink";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getInscripcionConfig, getProgreso, reenviarSolicitud } from "@/lib/api/inscripcion";
import {
  inscripcionErrorMessage,
  requiereVerificarCorreoDeNuevo,
} from "@/lib/api/inscripcionErrors";
import type { ProgresoSolicitud } from "@/types/inscripcion";
import { ContactoWhatsApp } from "./ContactoWhatsApp";
import { faltantesSolicitud } from "./faltantesSolicitud";
import formStyles from "../inscripcion.module.css";
import styles from "./pasos.module.css";

export interface PantallasEstadoProps {
  solicitudId: string;
  progreso: ProgresoSolicitud;
  onProgreso: (progreso: ProgresoSolicitud) => void;
  onAvanzar: () => void;
  onVolver: () => void;
  irAPaso: (paso: number) => void;
}

const PASO_CORREO = 1;
const PASO_DATOS = 4;
const PASO_ESTUDIOS = 5;
const PASO_REVISAR = 6;

const MOTIVOS_RECHAZO: Record<string, string> = {
  NO_CUMPLE_NIVEL_ESTUDIOS: "Tu nivel de estudios no cumple el requisito del curso.",
  NO_CUMPLE_EDAD: "No cumples la edad mínima del curso.",
  SOLICITUD_DUPLICADA: "Ya existe otra solicitud con tus datos.",
  VENCIDA: "Tu solicitud venció porque no se completó a tiempo.",
};
const MOTIVO_RECHAZO_GENERICO =
  "No pudimos aprobar tu solicitud. Contacta a la escuela para conocer el detalle.";

function formatearFechaHora(valor: string | null): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString("es-EC", { timeZone: "America/Guayaquil" });
}

// Lleva el foco al título al mostrar cada pantalla.
function useFocoEnTitulo() {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus();
  }, []);
  return titulo;
}

function Titulo({
  referencia,
  id,
  children,
}: {
  referencia: React.RefObject<HTMLHeadingElement | null>;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} ref={referencia} tabIndex={-1} className={styles.titulo}>
      {children}
    </h2>
  );
}

const SEGUIMIENTO = [
  "Recibida",
  "Identidad verificada",
  "Estudios verificados",
  "Lista para pagar",
];

function Seguimiento({ progreso }: { progreso: ProgresoSolicitud }) {
  const completadas = [
    Boolean(progreso.enviadaAt),
    progreso.identidadVerificada,
    progreso.estudiosVerificados,
    progreso.estado === "aprobada",
  ];
  return (
    <ol className={styles.seguimiento} aria-label="Seguimiento de tu solicitud">
      {SEGUIMIENTO.map((etapa, indice) => (
        <li key={etapa} data-estado={completadas[indice] ? "hecho" : "pendiente"}>
          <span className={styles.marca} aria-hidden="true">
            {completadas[indice] ? "✓" : indice + 1}
          </span>
          <span>
            {etapa}
            <span className="sr-only">
              {completadas[indice] ? " (completado)" : " (pendiente)"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function PantallaEnviada({ progreso }: { progreso: ProgresoSolicitud }) {
  const titulo = useFocoEnTitulo();
  const fecha = formatearFechaHora(progreso.enviadaAt);
  return (
    <section className={formStyles.form} aria-labelledby="estado-titulo">
      <StatusBadge status="pendiente" label="Pendiente de revisión" tone="warning" />
      <Titulo referencia={titulo} id="estado-titulo">
        Tu solicitud está pendiente de revisión
      </Titulo>
      {fecha ? <p>Enviada el {fecha.replace(/\.$/, "")}.</p> : null}
      {progreso.curso ? <p>Curso: {progreso.curso.nombre}</p> : null}
      <p>
        La escuela verificará tu identidad y tus estudios. Puedes consultar los avances en esta
        página; no necesitas hacer nada más por ahora.
      </p>
      {progreso.documentoEstudiosPendientePorCupo ? (
        <div className={styles.aviso} role="note">
          <strong>Falta tu certificado de estudios.</strong>
          <span>
            Hoy no pudimos recibir archivos. La escuela te lo pedirá y podrás subirlo cuando tu
            solicitud sea devuelta.
          </span>
        </div>
      ) : null}
      <h3 className="font-semibold">Seguimiento</h3>
      <Seguimiento progreso={progreso} />
      <p className="text-sm text-text-secondary">
        Si cierras esta página, verifica tu correo otra vez para consultar el estado.
      </p>
      <EnrollmentActionLink href="/">Volver al inicio</EnrollmentActionLink>
    </section>
  );
}

function PantallaDevuelta({
  solicitudId,
  progreso,
  onProgreso,
  irAPaso,
}: Pick<PantallasEstadoProps, "solicitudId" | "progreso" | "onProgreso" | "irAPaso">) {
  const titulo = useFocoEnTitulo();
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const faltantes = faltantesSolicitud(progreso);
  const mensaje = progreso.devolucion?.mensaje;

  async function reenviar() {
    if (bloqueo.current) return;
    if (faltantes.length > 0) {
      irAPaso(PASO_REVISAR);
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      await reenviarSolicitud(solicitudId);
      onProgreso(await getProgreso(solicitudId));
    } catch (e) {
      if (requiereVerificarCorreoDeNuevo(e)) irAPaso(PASO_CORREO);
      else setError(inscripcionErrorMessage(e));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  return (
    <section className={formStyles.form} aria-labelledby="estado-titulo">
      <StatusBadge status="pendiente" label="Necesita una corrección" tone="warning" />
      <Titulo referencia={titulo} id="estado-titulo">
        Tu solicitud necesita una corrección
      </Titulo>
      <div className={styles.aviso} role="note">
        <strong>Motivo</strong>
        <span>
          {mensaje ??
            "La escuela necesita que revises tu información. Contáctanos si tienes dudas."}
        </span>
      </div>
      <p>
        Corrige lo que se indica y reenvía tu solicitud. Conservamos la fecha en que la enviaste por
        primera vez.
      </p>
      <div className={formStyles.actions}>
        <Button type="button" variant="secondary" onClick={() => irAPaso(PASO_DATOS)}>
          Corregir mis datos
        </Button>
        <Button type="button" variant="secondary" onClick={() => irAPaso(PASO_ESTUDIOS)}>
          Estudios y documento
        </Button>
      </div>
      <FormError>{error}</FormError>
      <div className={formStyles.stepActions}>
        <Button type="button" onClick={() => void reenviar()} isLoading={ocupado}>
          Reenviar solicitud
        </Button>
      </div>
    </section>
  );
}

function PantallaAprobada({ progreso }: { progreso: ProgresoSolicitud }) {
  const titulo = useFocoEnTitulo();
  return (
    <section className={formStyles.form} aria-labelledby="estado-titulo">
      <StatusBadge status="activo" label="Aprobada" tone="success" />
      <Titulo referencia={titulo} id="estado-titulo">
        Tu solicitud fue aprobada
      </Titulo>
      <Seguimiento progreso={progreso} />
      <div className={styles.avisoExito} role="status">
        <strong>Revisa tu correo para crear tu contraseña.</strong>
        <span>
          Te enviamos un enlace de un solo uso. Si no lo encuentras, revisa la carpeta de correo no
          deseado o escríbenos.
        </span>
      </div>
      <div className={formStyles.actions}>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-sm bg-brand-primary px-4 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Iniciar sesión
        </Link>
      </div>
    </section>
  );
}

function PantallaRechazada({ progreso }: { progreso: ProgresoSolicitud }) {
  const titulo = useFocoEnTitulo();
  const [contacto, setContacto] = useState("");
  const motivo =
    (progreso.motivoRechazo && MOTIVOS_RECHAZO[progreso.motivoRechazo]) || MOTIVO_RECHAZO_GENERICO;

  useEffect(() => {
    let activo = true;
    getInscripcionConfig()
      .then((config) => {
        if (activo) setContacto(config.contactoDerechos);
      })
      .catch(() => {
        // Sin el correo de contacto, los enlaces de WhatsApp siguen disponibles.
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <section className={formStyles.form} aria-labelledby="estado-titulo">
      <StatusBadge status="rechazado" label="Rechazada" tone="error" />
      <Titulo referencia={titulo} id="estado-titulo">
        Tu solicitud no fue aprobada
      </Titulo>
      <div className={styles.aviso} role="note">
        <strong>Motivo</strong>
        <span>{motivo}</span>
      </div>
      <p>Si crees que hubo un error o quieres más información, contáctanos.</p>
      <ContactoWhatsApp mensaje="Hola, Colorados Drive. Mi solicitud de inscripción no fue aprobada y quiero más información." />
      {contacto ? (
        <a className="inline-flex min-h-11 items-center underline" href={`mailto:${contacto}`}>
          {contacto}
        </a>
      ) : null}
    </section>
  );
}

export function PantallaInscripcionesCerradas() {
  const titulo = useFocoEnTitulo();
  return (
    <section className={formStyles.form} aria-labelledby="cerradas-titulo">
      <Titulo referencia={titulo} id="cerradas-titulo">
        Las inscripciones en línea están cerradas por ahora
      </Titulo>
      <p>Escríbenos por WhatsApp y te atendemos para inscribirte directamente en la escuela.</p>
      <ContactoWhatsApp mensaje="Hola, Colorados Drive. Las inscripciones en línea están cerradas y quiero inscribirme en un curso de conducción." />
      <EnrollmentActionLink href="/">Volver al inicio</EnrollmentActionLink>
    </section>
  );
}

// Pantalla de estado y seguimiento (paso 7) según el estado de la solicitud.
function ContenidoEstado({
  solicitudId,
  progreso,
  onProgreso,
  onVolver,
  irAPaso,
}: PantallasEstadoProps) {
  switch (progreso.estado) {
    case "enviada":
      return <PantallaEnviada progreso={progreso} />;
    case "devuelta":
      return (
        <PantallaDevuelta
          solicitudId={solicitudId}
          progreso={progreso}
          onProgreso={onProgreso}
          irAPaso={irAPaso}
        />
      );
    case "aprobada":
      return <PantallaAprobada progreso={progreso} />;
    case "rechazada":
      return <PantallaRechazada progreso={progreso} />;
    default:
      return (
        <section className={formStyles.form}>
          <p>Tu solicitud todavía no fue enviada.</p>
          <div className={formStyles.stepActions}>
            <Button type="button" onClick={() => irAPaso(PASO_REVISAR)}>
              Revisar y enviar
            </Button>
            <Button type="button" variant="secondary" onClick={onVolver}>
              Volver
            </Button>
          </div>
        </section>
      );
  }
}

// Conserva el último resultado visible durante la consulta: no desmonta la pantalla.
export function PantallasEstado(props: PantallasEstadoProps) {
  const { solicitudId, onProgreso, irAPaso } = props;
  const callbacks = useRef({ onProgreso, irAPaso });
  useEffect(() => {
    callbacks.current = { onProgreso, irAPaso };
  }, [onProgreso, irAPaso]);
  const [revision, setRevision] = useState(0);
  const [actualizando, setActualizando] = useState(true);
  const [error, setError] = useState("");
  const [ultima, setUltima] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true,
      consultando = false;
    let intervalo: ReturnType<typeof setInterval> | undefined;
    async function actualizar() {
      if (!vivo || consultando || document.visibilityState !== "visible") return;
      consultando = true;
      setActualizando(true);
      try {
        const progreso = await getProgreso(solicitudId);
        if (!vivo) return;
        if (!progreso?.estado) throw new Error("Respuesta de progreso vacía");
        callbacks.current.onProgreso(progreso);
        setUltima(new Date().toISOString());
        setError("");
      } catch (e) {
        if (!vivo) return;
        if (requiereVerificarCorreoDeNuevo(e)) callbacks.current.irAPaso(PASO_CORREO);
        else setError(inscripcionErrorMessage(e));
      } finally {
        consultando = false;
        if (vivo) setActualizando(false);
      }
    }
    function visibilidad() {
      clearInterval(intervalo);
      if (document.visibilityState === "visible") {
        void actualizar();
        intervalo = setInterval(() => void actualizar(), 60000);
      }
    }
    visibilidad();
    document.addEventListener("visibilitychange", visibilidad);
    return () => {
      vivo = false;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", visibilidad);
    };
  }, [solicitudId, revision]);
  return (
    <div className={formStyles.form}>
      <FormError>{error}</FormError>
      <div className={formStyles.actions}>
        <Button
          type="button"
          variant="secondary"
          disabled={actualizando}
          onClick={() => setRevision((n) => n + 1)}
        >
          Actualizar
        </Button>
        <p role="status" className="text-sm text-text-secondary">
          {actualizando
            ? "Actualizando estado…"
            : ultima
              ? `Última actualización: ${formatearFechaHora(ultima)}`
              : "Aún no se pudo actualizar el estado."}
        </p>
      </div>
      <ContenidoEstado {...props} />
    </div>
  );
}
