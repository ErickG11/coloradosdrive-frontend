"use client";
import { useId, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Select } from "@/components/inscripcion/EnrollmentField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getProgreso, guardarDatos, subirCertificado } from "@/lib/api/inscripcion";
import {
  inscripcionErrorCode,
  inscripcionErrorMessage,
  requiereVerificarCorreoDeNuevo,
} from "@/lib/api/inscripcionErrors";
import type { NivelEstudios, ProgresoSolicitud, SubtipoCertificado } from "@/types/inscripcion";
import {
  ArchivoRechazado,
  formatearTamano,
  prepararArchivo,
  TAMANO_MAXIMO_BYTES,
} from "./archivoCertificado";
import type { ArchivoPreparado } from "./archivoCertificado";
import { ContactoWhatsApp } from "./ContactoWhatsApp";
import { datosConNivel, infoNivel, NIVELES, tieneCertificado } from "./nivelesEstudios";
import formStyles from "../inscripcion.module.css";
import styles from "./pasos.module.css";

export interface PasoEstudiosProps {
  solicitudId: string;
  progreso: ProgresoSolicitud;
  onProgreso: (progreso: ProgresoSolicitud) => void;
  onAvanzar: () => void;
  onVolver: () => void;
  irAPaso: (paso: number) => void;
}

const PASO_CORREO = 1;
const PASO_DATOS = 4;

interface ArchivoLocal {
  nombre: string;
  tamano: number;
  estado: "subiendo" | "subido" | "error";
  preparado: ArchivoPreparado;
}

const ETIQUETA_ESTADO: Record<ArchivoLocal["estado"], string> = {
  subiendo: "Subiendo…",
  subido: "Archivo enviado",
  error: "No se pudo enviar",
};

export function PasoEstudios({
  solicitudId,
  progreso,
  onProgreso,
  onAvanzar,
  onVolver,
  irAPaso,
}: PasoEstudiosProps) {
  const [nivel, setNivel] = useState<NivelEstudios | "">(
    NIVELES.some((opcion) => opcion.nivel === progreso.nivelEstudios)
      ? (progreso.nivelEstudios ?? "")
      : "",
  );
  const [subtipo, setSubtipo] = useState<SubtipoCertificado | "">("");
  const [archivo, setArchivo] = useState<ArchivoLocal | null>(null);
  const [errorNivel, setErrorNivel] = useState("");
  const [errorArchivo, setErrorArchivo] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
  const [sinCupo, setSinCupo] = useState(false);
  const [faltanDatos, setFaltanDatos] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const bloqueo = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);
  const grupo = useRef<HTMLFieldSetElement>(null);
  const id = useId();

  const info = infoNivel(nivel);
  const bloqueado = nivel === "menos_de_decimo";
  const requiereZona = info !== undefined && info.archivo !== "ninguno";
  const subtipoActual: SubtipoCertificado | "" =
    subtipo && info?.subtipos.some((s) => s.valor === subtipo)
      ? subtipo
      : (info?.subtipos[0]?.valor ?? "");
  const certificadoEnServidor = progreso.nivelEstudios === nivel && tieneCertificado(progreso);
  const pendientePorCupo = sinCupo || progreso.documentoEstudiosPendientePorCupo;
  const subiendo = archivo?.estado === "subiendo";

  function elegirNivel(valor: NivelEstudios) {
    setNivel(valor);
    setSubtipo("");
    setArchivo(null);
    setErrorNivel("");
    setErrorArchivo("");
    setErrorGeneral("");
    setFaltanDatos(false);
  }

  function manejarError(error: unknown): boolean {
    if (requiereVerificarCorreoDeNuevo(error)) {
      irAPaso(PASO_CORREO);
      return true;
    }
    return false;
  }

  // Guarda el nivel elegido (los datos se reenvían completos). Devuelve false si faltan datos.
  async function asegurarNivel(seleccionado: NivelEstudios): Promise<boolean> {
    if (seleccionado === "menos_de_decimo") return false;
    if (progreso.nivelEstudios === seleccionado) return true;
    const datos = datosConNivel(progreso, seleccionado);
    if (!datos) {
      setErrorGeneral("Primero completa tus datos personales.");
      setFaltanDatos(true);
      return false;
    }
    await guardarDatos(solicitudId, datos);
    onProgreso(await getProgreso(solicitudId));
    return true;
  }

  async function subir(preparado: ArchivoPreparado) {
    if (!info || bloqueo.current || !subtipoActual || nivel === "") return;
    bloqueo.current = true;
    setOcupado(true);
    setErrorArchivo("");
    setErrorGeneral("");
    setArchivo({
      nombre: preparado.nombre,
      tamano: preparado.blob.size,
      estado: "subiendo",
      preparado,
    });
    try {
      if (!(await asegurarNivel(nivel))) {
        setArchivo(null);
        return;
      }
      await subirCertificado(solicitudId, preparado.blob, preparado.nombre, subtipoActual);
      setArchivo((actual) => (actual ? { ...actual, estado: "subido" } : actual));
      onProgreso(await getProgreso(solicitudId));
    } catch (error) {
      if (manejarError(error)) return;
      if (inscripcionErrorCode(error) === "CUPO_DIARIO_AGOTADO") {
        setSinCupo(true);
        setArchivo(null);
        return;
      }
      setArchivo((actual) => (actual ? { ...actual, estado: "error" } : actual));
      setErrorArchivo(inscripcionErrorMessage(error));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  async function elegirArchivo(file: File | undefined) {
    if (!file || ocupado) return;
    setErrorArchivo("");
    try {
      await subir(await prepararArchivo(file));
    } catch (error) {
      setArchivo(null);
      setErrorArchivo(
        error instanceof ArchivoRechazado ? error.message : "No pudimos leer ese archivo.",
      );
    }
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastrando(false);
    void elegirArchivo(evento.dataTransfer.files[0]);
  }

  async function continuar() {
    if (bloqueo.current || ocupado) return;
    setErrorGeneral("");
    if (nivel === "") {
      setErrorNivel("Selecciona tu nivel de estudios.");
      grupo.current?.querySelector("input")?.focus();
      return;
    }
    if (nivel === "menos_de_decimo" || !info) return;
    const tieneArchivo = archivo?.estado === "subido" || (!archivo && certificadoEnServidor);
    if (info.archivo === "obligatorio" && !tieneArchivo && !pendientePorCupo) {
      setErrorArchivo("Adjunta el archivo para continuar.");
      entrada.current?.focus();
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    try {
      if (!(await asegurarNivel(nivel))) return;
      onProgreso(await getProgreso(solicitudId));
      onAvanzar();
    } catch (error) {
      if (!manejarError(error)) setErrorGeneral(inscripcionErrorMessage(error));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  const estadoVisible = archivo
    ? { etiqueta: ETIQUETA_ESTADO[archivo.estado], tono: archivo.estado }
    : certificadoEnServidor
      ? { etiqueta: "Archivo enviado", tono: "subido" as const }
      : null;

  return (
    <div className={formStyles.form}>
      {faltanDatos ? (
        <div>
          <Button type="button" variant="secondary" onClick={() => irAPaso(PASO_DATOS)}>
            Completar mis datos
          </Button>
        </div>
      ) : null}
      <fieldset
        ref={grupo}
        aria-describedby={errorNivel ? `${id}-nivel-error` : undefined}
        aria-invalid={Boolean(errorNivel)}
      >
        <legend className="font-semibold">Nivel de estudios</legend>
        <div className={styles.opciones}>
          {NIVELES.map((opcion) => (
            <label key={opcion.nivel} className={styles.opcion}>
              <input
                type="radio"
                name="nivelEstudios"
                value={opcion.nivel}
                checked={nivel === opcion.nivel}
                onChange={() => elegirNivel(opcion.nivel)}
                aria-describedby={`${id}-${opcion.nivel}`}
              />
              <div>
                <strong>{opcion.titulo}</strong>
                <span id={`${id}-${opcion.nivel}`}>{opcion.ayuda}</span>
              </div>
            </label>
          ))}
        </div>
        <FormError id={`${id}-nivel-error`}>{errorNivel}</FormError>
      </fieldset>

      {bloqueado ? (
        <div className={styles.avisoAlerta} role="alert">
          <strong>Aún no puedes inscribirte en línea.</strong>
          <span>
            Necesitas haber aprobado al menos décimo año. Si tienes dudas, escríbenos y te
            orientamos.
          </span>
          <ContactoWhatsApp mensaje="Hola, Colorados Drive. Tengo una consulta sobre el nivel de estudios para inscribirme." />
        </div>
      ) : null}

      {requiereZona && info ? (
        <section
          className={formStyles.documentSlot}
          data-invalid={Boolean(errorArchivo)}
          aria-labelledby={`${id}-archivo-titulo`}
        >
          <h3 id={`${id}-archivo-titulo`}>
            {info.archivo === "obligatorio"
              ? "Sube tu documento (obligatorio)"
              : "Sube tu documento (opcional, recomendado)"}
          </h3>
          {info.subtipos.length > 1 ? (
            <Select
              name="subtipo"
              label="Tipo de documento"
              value={subtipoActual}
              onChange={(e) => setSubtipo(e.target.value as SubtipoCertificado)}
              disabled={ocupado}
            >
              {info.subtipos.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.etiqueta}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm text-text-secondary">{info.subtipos[0]?.etiqueta}</p>
          )}
          {pendientePorCupo ? (
            <div className={styles.aviso} role="status">
              <strong>Hoy no podemos recibir más archivos.</strong>
              <span>
                Puedes continuar sin subirlo y enviar tu solicitud. La escuela te pedirá el
                documento después.
              </span>
            </div>
          ) : null}
          <div
            className={formStyles.uploadZone}
            data-dragging={arrastrando}
            aria-disabled={ocupado || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              if (!ocupado) setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 16V3m0 0L7 8m5-5 5 5M4 15v5h16v-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p>{archivo ? archivo.nombre : "Arrastra tu archivo aquí o selecciónalo"}</p>
            {archivo ? (
              <p className={formStyles.fileSize}>{formatearTamano(archivo.tamano)}</p>
            ) : null}
            <div role="status">
              {estadoVisible ? (
                <StatusBadge
                  status={estadoVisible.tono}
                  label={estadoVisible.etiqueta}
                  tone={
                    estadoVisible.tono === "subido"
                      ? "success"
                      : estadoVisible.tono === "error"
                        ? "error"
                        : "info"
                  }
                />
              ) : null}
            </div>
            <input
              ref={entrada}
              id={`${id}-archivo`}
              className={formStyles.fileInput}
              type="file"
              accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
              disabled={ocupado}
              aria-label="Seleccionar archivo del certificado"
              aria-invalid={Boolean(errorArchivo)}
              aria-describedby={`${id}-ayuda${errorArchivo ? ` ${id}-archivo-error` : ""}`}
              onChange={(e) => {
                void elegirArchivo(e.currentTarget.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <div className={formStyles.actions}>
              <Button
                type="button"
                variant="secondary"
                disabled={ocupado}
                onClick={() => entrada.current?.click()}
              >
                {archivo || certificadoEnServidor ? "Reemplazar archivo" : "Seleccionar archivo"}
              </Button>
              {archivo?.estado === "error" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={ocupado}
                  onClick={() => void subir(archivo.preparado)}
                >
                  Reintentar
                </Button>
              ) : null}
            </div>
            <p id={`${id}-ayuda`} className={formStyles.fileSize}>
              JPG, PNG o PDF · Máximo {String(TAMANO_MAXIMO_BYTES / (1024 * 1024))} MiB. Las fotos
              se reducen automáticamente.
            </p>
          </div>
          <FormError id={`${id}-archivo-error`}>{errorArchivo}</FormError>
        </section>
      ) : null}

      <FormError>{errorGeneral}</FormError>
      <div className={formStyles.stepActions}>
        <Button
          type="button"
          onClick={() => void continuar()}
          isLoading={ocupado}
          disabled={bloqueado || subiendo}
        >
          Guardar y continuar
        </Button>
        <Button type="button" variant="secondary" disabled={ocupado} onClick={onVolver}>
          Volver
        </Button>
      </div>
    </div>
  );
}
