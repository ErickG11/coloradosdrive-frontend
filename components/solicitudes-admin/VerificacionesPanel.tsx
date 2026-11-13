"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { api } from "@/lib/api/client";
import { registrarVerificacion } from "@/lib/api/inscripcion";
import {
  ENLACE_MINISTERIO_EDUCACION,
  ENLACE_REGISTRO_CIVIL,
  type EnlaceVerificacion,
} from "@/lib/content/verificacion-links";
import type {
  MetodoVerificacion,
  ResultadoVerificacion,
  SolicitudAdminDetalle,
  TipoVerificacion,
  VerificacionSolicitud,
} from "@/types/inscripcion";
import { ApiError } from "@/lib/api/errors";
import { adminErrorMessage } from "./adminErrors";
import { CertificadoPanel } from "./CertificadoPanel";
import {
  ETIQUETA_METODO,
  ETIQUETA_RESULTADO,
  ETIQUETA_TIPO_VERIFICACION,
  RESULTADOS,
  formatearFecha,
  metodosParaVerificacion,
} from "./catalogo";
import { horaGuayaquil, type RequestReviewLock } from "./useRequestReview";
import styles from "./solicitudes.module.css";

const MAX_NOTA = 1000;

function portalPara(tipo: TipoVerificacion, detalle: SolicitudAdminDetalle) {
  if (tipo === "identidad") return ENLACE_REGISTRO_CIVIL;
  // Solo los niveles de bachiller se consultan en el portal del Ministerio por cédula.
  return detalle.nivelEstudios?.startsWith("bachiller") ? ENLACE_MINISTERIO_EDUCACION : null;
}

// Observación automática: "Verificado en el Registro Civil" / "Verificado en el Ministerio de
// Educación"; la nota opcional del administrador se agrega a continuación.
function observacion(
  resultado: ResultadoVerificacion,
  metodo: MetodoVerificacion,
  nota: string,
): string {
  const fuente =
    metodo === "registro_civil_portal"
      ? "en el Registro Civil"
      : metodo === "ministerio_portal"
        ? "en el Ministerio de Educación"
        : `con ${ETIQUETA_METODO[metodo].toLowerCase()}`;
  const base = `${ETIQUETA_RESULTADO[resultado]} ${fuente}`;
  return nota.trim() ? `${base}. ${nota.trim()}`.slice(0, MAX_NOTA) : base;
}

function BloqueVerificacion({
  tipo,
  detalle,
  candado,
  puedeRegistrar,
  onRegistrada,
  children,
}: {
  tipo: TipoVerificacion;
  detalle: SolicitudAdminDetalle;
  candado: RequestReviewLock;
  puedeRegistrar: boolean;
  onRegistrada: (verificacion: VerificacionSolicitud) => void;
  children?: ReactNode;
}) {
  const baseId = useId();
  const metodos = metodosParaVerificacion();
  const [metodo, setMetodo] = useState<MetodoVerificacion | "">(""),
    [resultado, setResultado] = useState<ResultadoVerificacion | "">(""),
    [cambiando, setCambiando] = useState(false),
    [nota, setNota] = useState(""),
    [archivo, setArchivo] = useState<File | null>(null),
    [errores, setErrores] = useState<{ archivo?: string; nota?: string }>({}),
    [error, setError] = useState(""),
    [copiado, setCopiado] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const lock = useRef(false);

  const historial = detalle.verificaciones
    .filter((v) => v.tipo === tipo)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ultima = historial[0];
  const portal: EnlaceVerificacion | null = portalPara(tipo, detalle);

  async function copiarCedula() {
    if (!detalle.cedula) return;
    try {
      await navigator.clipboard.writeText(detalle.cedula);
      setCopiado("Cédula copiada.");
    } catch {
      setCopiado("No se pudo copiar. Selecciona la cédula y cópiala a mano.");
    }
  }

  async function registrar() {
    if (lock.current) return;
    if (!metodo || !resultado) return;
    const nuevos: typeof errores = {};
    const presencial = metodo === "original_presencial";
    if (presencial && !archivo) nuevos.archivo = "Adjunta el escaneo presencial.";
    if (nota.length > MAX_NOTA) nuevos.nota = `La nota admite hasta ${MAX_NOTA} caracteres.`;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    lock.current = true;
    setOcupado(true);
    setError("");
    const texto = observacion(resultado, metodo, nota);
    try {
      let creada: VerificacionSolicitud;
      if (candado.phase === "owned" && candado.token) {
        // Contrato vigente (indicador de identidad encendido): verificación con el candado.
        const campos = {
          token: candado.token,
          tipo,
          metodo,
          resultado,
          nota: texto,
          mode: presencial ? "presencial" : "web",
        };
        const ruta = `/admin/solicitudes/${detalle.id}/revision/verificar`;
        if (presencial && archivo) {
          // Solo la verificación presencial lleva archivo (multipart).
          const data = new FormData();
          for (const [key, value] of Object.entries(campos)) data.append(key, value);
          data.append("archivo", archivo);
          creada = await api.post<VerificacionSolicitud>(ruta, data, {
            signal: AbortSignal.timeout(30_000),
          });
        } else {
          // Sin archivo se envía JSON: no se manda ningún campo de archivo.
          creada = await api.post<VerificacionSolicitud>(ruta, campos);
        }
      } else {
        creada = await registrarVerificacion(detalle.id, {
          tipo,
          metodo,
          resultado,
          nota: texto,
        });
      }
      onRegistrada(creada);
      setMetodo("");
      setResultado("");
      setNota("");
      setArchivo(null);
      setCambiando(false);
    } catch (e) {
      // El texto de «archivo» solo corresponde si el administrador adjuntó un escaneo; en
      // cualquier otro caso se muestra el mensaje real del servidor.
      setError(
        !archivo && e instanceof ApiError && e.code?.startsWith("ARCHIVO_")
          ? e.message
          : adminErrorMessage(e),
      );
    } finally {
      lock.current = false;
      setOcupado(false);
    }
  }

  const titulo = ETIQUETA_TIPO_VERIFICACION[tipo];
  return (
    <section className={styles.documentCard} aria-labelledby={`${baseId}-titulo`}>
      <h4 id={`${baseId}-titulo`}>Verificación de {titulo.toLowerCase()}</h4>
      {ultima ? (
        <p className={styles.verdict} data-resultado={ultima.resultado}>
          {ETIQUETA_RESULTADO[ultima.resultado]} · {ETIQUETA_METODO[ultima.metodo]} ·{" "}
          {formatearFecha(ultima.createdAt)}
        </p>
      ) : (
        <p className={styles.note}>Todavía sin verificar.</p>
      )}

      {tipo === "identidad" && detalle.cedula ? (
        <p>
          Cédula: <strong>{detalle.cedula}</strong>
        </p>
      ) : null}
      {portal || detalle.cedula ? (
        <div className={styles.controls}>
          {portal ? (
            <a
              className={buttonClassName("secondary", "md")}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir portal: {portal.nombre}
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          ) : null}
          {portal && detalle.cedula ? (
            <Button variant="secondary" onClick={() => void copiarCedula()}>
              Copiar cédula
            </Button>
          ) : null}
        </div>
      ) : null}
      {portal && !portal.confirmado ? (
        <p className={styles.note}>
          Dirección del portal por confirmar con la administración: abre la página institucional.
        </p>
      ) : null}
      {tipo === "estudios" && !portal ? (
        <p className={styles.note}>
          Con este nivel se valida el certificado: lee su código QR, llama a la institución o revisa
          el original en persona.
        </p>
      ) : null}
      <p role="status" className="text-sm text-text-secondary">
        {copiado}
      </p>

      {puedeRegistrar && ultima && !cambiando ? (
        <div className={styles.controls}>
          <Button variant="secondary" onClick={() => setCambiando(true)}>
            Cambiar
          </Button>
        </div>
      ) : null}

      {puedeRegistrar && (!ultima || cambiando) ? (
        <form
          className={styles.detail}
          onSubmit={(event) => {
            event.preventDefault();
            void registrar();
          }}
          noValidate
        >
          <Select
            label="Resultado"
            value={resultado}
            onChange={(e) => setResultado(e.target.value as ResultadoVerificacion)}
          >
            <option value="" disabled>
              Seleccione…
            </option>
            {RESULTADOS.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_RESULTADO[r]}
              </option>
            ))}
          </Select>
          <Select
            label="Método"
            value={metodo}
            onChange={(e) => {
              setMetodo(e.target.value as MetodoVerificacion);
              setArchivo(null);
            }}
          >
            <option value="" disabled>
              Seleccione…
            </option>
            {metodos.map(({ metodo: m }) => (
              <option key={m} value={m}>
                {ETIQUETA_METODO[m]}
              </option>
            ))}
          </Select>
          {metodo === "original_presencial" ? (
            <Input
              label="Escaneo presencial (PDF, JPG o PNG, hasta 2 MiB)"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              error={errores.archivo}
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          ) : null}
          <Textarea
            label="Nota (opcional)"
            value={nota}
            error={errores.nota}
            maxLength={MAX_NOTA}
            onChange={(e) => setNota(e.target.value)}
            aria-describedby={`${baseId}-ayuda`}
          />
          <p id={`${baseId}-ayuda`} className="text-sm text-text-secondary">
            Texto plano y técnico. No escribas nombres, cédulas ni correos: la nota se conserva
            aunque se purguen los datos del postulante.
          </p>
          <FormError>{error}</FormError>
          <div className={styles.controls}>
            <Button
              type="submit"
              isLoading={ocupado}
              disabled={!resultado || !metodo || (metodo === "original_presencial" && !archivo)}
            >
              Registrar verificación
            </Button>
          </div>
        </form>
      ) : null}

      {children}

      {historial.length > 0 ? (
        <div className={styles.detail}>
          <h5 className={styles.subheading}>Historial</h5>
          <ul className={styles.history}>
            {historial.map((v) => (
              <li key={v.id}>
                <strong>{ETIQUETA_RESULTADO[v.resultado]}</strong> · {ETIQUETA_METODO[v.metodo]}
                <br />
                <span className="text-text-secondary">
                  {v.porNombre ?? "Administrador"} · {formatearFecha(v.createdAt)}
                </span>
                {v.nota ? <p className={styles.historyNote}>{v.nota}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// Verificaciones en la fuente (append-only). Solo se registran mientras la solicitud está
// «enviada» y la revisión es del administrador; en cualquier otro caso el historial queda en
// solo lectura.
export function VerificacionesPanel({
  detalle,
  candado,
  onRegistrada,
}: {
  detalle: SolicitudAdminDetalle;
  candado: RequestReviewLock;
  onRegistrada: (verificacion: VerificacionSolicitud) => void;
}) {
  const puedeRegistrar =
    detalle.estado === "enviada" &&
    (candado.phase === "owned" || (candado.phase === "inactive" && !detalle.identityRulesActive));
  return (
    <section className={styles.section} aria-labelledby="verificaciones-title">
      <h3 id="verificaciones-title">Verificaciones</h3>
      {candado.phase === "other" ? (
        <p role="status" className={styles.note}>
          Otro administrador está revisando esta solicitud hasta las {horaGuayaquil(candado.until)}.
        </p>
      ) : candado.phase === "loading" ? (
        <p role="status" className={styles.note}>
          Preparando la revisión…
        </p>
      ) : candado.phase === "error" ? (
        <p role="alert" className={styles.note}>
          No se pudo preparar la revisión. Cierra y vuelve a abrir la solicitud.
        </p>
      ) : !puedeRegistrar ? (
        <p className={styles.note}>Solo se registran verificaciones en solicitudes pendientes.</p>
      ) : null}
      <div className={styles.documentList}>
        <BloqueVerificacion
          tipo="identidad"
          detalle={detalle}
          candado={candado}
          puedeRegistrar={puedeRegistrar}
          onRegistrada={onRegistrada}
        />
        <BloqueVerificacion
          tipo="estudios"
          detalle={detalle}
          candado={candado}
          puedeRegistrar={puedeRegistrar}
          onRegistrada={onRegistrada}
        >
          <CertificadoPanel detalle={detalle} />
        </BloqueVerificacion>
      </div>
    </section>
  );
}
