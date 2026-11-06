"use client";
import { useId, useRef, useState } from "react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
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
import { adminErrorMessage } from "./adminErrors";
import {
  ETIQUETA_METODO,
  ETIQUETA_RESULTADO,
  ETIQUETA_TIPO_VERIFICACION,
  RESULTADOS,
  formatearFecha,
  metodosParaVerificacion,
} from "./catalogo";
import styles from "./solicitudes.module.css";

const MAX_NOTA = 1000;

function portalPara(tipo: TipoVerificacion, detalle: SolicitudAdminDetalle) {
  if (tipo === "identidad") return ENLACE_REGISTRO_CIVIL;
  // Solo los niveles de bachiller se consultan en el portal del Ministerio por cédula.
  return detalle.nivelEstudios?.startsWith("bachiller") ? ENLACE_MINISTERIO_EDUCACION : null;
}

function BloqueVerificacion({
  tipo,
  detalle,
  puedeRegistrar,
  onRegistrada,
}: {
  tipo: TipoVerificacion;
  detalle: SolicitudAdminDetalle;
  puedeRegistrar: boolean;
  onRegistrada: (verificacion: VerificacionSolicitud) => void;
}) {
  const baseId = useId();
  const metodos = metodosParaVerificacion();
  const [metodo, setMetodo] = useState<MetodoVerificacion | "">(""),
    [resultado, setResultado] = useState<ResultadoVerificacion | "">(""),
    [nota, setNota] = useState(""),
    [errores, setErrores] = useState<{ metodo?: string; resultado?: string; nota?: string }>({}),
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
    const nuevos: typeof errores = {};
    if (!metodo) nuevos.metodo = "Selecciona el método usado.";
    if (!resultado) nuevos.resultado = "Selecciona el resultado.";
    if (nota.length > MAX_NOTA) nuevos.nota = `La nota admite hasta ${MAX_NOTA} caracteres.`;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0 || !metodo || !resultado) return;
    lock.current = true;
    setOcupado(true);
    setError("");
    try {
      const creada = await registrarVerificacion(detalle.id, {
        tipo,
        metodo,
        resultado,
        ...(nota.trim() ? { nota: nota.trim() } : {}),
      });
      onRegistrada(creada);
      setMetodo("");
      setResultado("");
      setNota("");
    } catch (e) {
      setError(adminErrorMessage(e));
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
          {ETIQUETA_RESULTADO[ultima.resultado]} · {ETIQUETA_METODO[ultima.metodo]}
        </p>
      ) : (
        <p className={styles.note}>Todavía sin verificar.</p>
      )}

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

      {puedeRegistrar ? (
        <form
          className={styles.detail}
          onSubmit={(event) => {
            event.preventDefault();
            void registrar();
          }}
          noValidate
        >
          <Select
            label="Método"
            value={metodo}
            error={errores.metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoVerificacion | "")}
          >
            <option value="">Selecciona…</option>
            {metodos.map(({ metodo: m }) => (
              <option key={m} value={m}>
                {ETIQUETA_METODO[m]}
              </option>
            ))}
          </Select>
          <Select
            label="Resultado"
            value={resultado}
            error={errores.resultado}
            onChange={(e) => setResultado(e.target.value as ResultadoVerificacion | "")}
          >
            <option value="">Selecciona…</option>
            {RESULTADOS.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_RESULTADO[r]}
              </option>
            ))}
          </Select>
          <Textarea
            label="Nota técnica (opcional)"
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
            <Button type="submit" isLoading={ocupado}>
              Registrar verificación
            </Button>
          </div>
        </form>
      ) : null}

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
// «enviada»; en cualquier otro estado el historial queda en solo lectura.
export function VerificacionesPanel({
  detalle,
  onRegistrada,
}: {
  detalle: SolicitudAdminDetalle;
  onRegistrada: (verificacion: VerificacionSolicitud) => void;
}) {
  const puedeRegistrar = detalle.estado === "enviada";
  return (
    <section className={styles.section} aria-labelledby="verificaciones-title">
      <h3 id="verificaciones-title">Verificaciones</h3>
      {puedeRegistrar ? null : (
        <p className={styles.note}>Solo se registran verificaciones en solicitudes pendientes.</p>
      )}
      <div className={styles.documentList}>
        <BloqueVerificacion
          tipo="identidad"
          detalle={detalle}
          puedeRegistrar={puedeRegistrar}
          onRegistrada={onRegistrada}
        />
        <BloqueVerificacion
          tipo="estudios"
          detalle={detalle}
          puedeRegistrar={puedeRegistrar}
          onRegistrada={onRegistrada}
        />
      </div>
    </section>
  );
}
