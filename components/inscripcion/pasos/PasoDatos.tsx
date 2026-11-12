"use client";
import { useFetch } from "@/hooks/useFetch";
import { documentError, type DocumentType } from "../documentValidation";
import { EnrollmentCheckbox } from "../EnrollmentCheckbox";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RequiredMark } from "../EnrollmentField";
import { Input } from "@/components/inscripcion/EnrollmentField";
import { Select } from "@/components/inscripcion/EnrollmentField";
import { getProgreso, guardarDatos } from "@/lib/api/inscripcion";
import {
  inscripcionErrorCode,
  inscripcionErrorField,
  inscripcionErrorMessage,
  requiereVerificarCorreoDeNuevo,
} from "@/lib/api/inscripcionErrors";
import { NACIONALIDADES, NIVELES_ESTUDIOS, TIPOS_SANGRE } from "@/types/inscripcion";
import type {
  DatosSolicitudInput,
  Nacionalidad,
  ProgresoSolicitud,
  TipoSangre,
} from "@/types/inscripcion";
import { applicantAge } from "../applicantValidation";
import { normalizeApplicantName } from "../validation";
import { ContactoWhatsApp } from "./ContactoWhatsApp";
import {
  fechaNacimientoError,
  parteNombreError,
  representanteCedulaError,
  representanteNombreError,
  telefonoError,
  telefonoNormalizado,
} from "./validadoresDatos";
import formStyles from "../inscripcion.module.css";
import styles from "./pasos.module.css";

export interface PasoDatosProps {
  solicitudId: string;
  progreso: ProgresoSolicitud;
  onProgreso: (progreso: ProgresoSolicitud) => void;
  onAvanzar: () => void;
  onVolver: () => void;
  irAPaso: (paso: number) => void;
}

const PASO_CORREO = 1;
const ETIQUETA_NACIONALIDAD: Record<Nacionalidad, string> = {
  ecuatoriana: "Ecuatoriana",
  extranjero_con_cedula: "Extranjera o extranjero con cédula ecuatoriana",
  extranjero_sin_cedula: "Extranjera o extranjero sin cédula ecuatoriana",
};
const ETIQUETA_SANGRE: Record<TipoSangre, string> = {
  "A+": "A+",
  "A-": "A-",
  "B+": "B+",
  "B-": "B-",
  "AB+": "AB+",
  "AB-": "AB-",
  "O+": "O+",
  "O-": "O-",
  no_sabe: "No lo sé",
};

interface Valores {
  documentType: DocumentType;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  nacionalidadTipo: Nacionalidad | "";
  tipoSangre: TipoSangre | "";
  representanteDocumentType: DocumentType;
  representanteNombre: string;
  representanteCedula: string;
  representanteAcepta: boolean;
}

type Errores = Partial<Record<keyof Valores, string>>;

// Orden visual de los campos: define cuál recibe el foco si hay varios errores.
const ORDEN_CAMPOS: (keyof Valores)[] = [
  "nombres",
  "apellidos",
  "cedula",
  "fechaNacimiento",
  "telefono",
  "nacionalidadTipo",
  "tipoSangre",
  "representanteNombre",
  "representanteCedula",
  "representanteAcepta",
];

function valoresIniciales(progreso: ProgresoSolicitud): Valores {
  const d = progreso.datos;
  return {
    nombres: d.nombres ?? "",
    apellidos: d.apellidos ?? "",
    documentType: d.documentType ?? "cedula",
    cedula: d.documentNumber ?? d.cedula ?? "",
    fechaNacimiento: d.fechaNacimiento?.slice(0, 10) ?? "",
    telefono: d.telefono ?? "",
    nacionalidadTipo: d.nacionalidadTipo ?? "",
    tipoSangre: d.tipoSangre ?? "",
    representanteDocumentType: d.representante?.documentType ?? "cedula",
    representanteNombre: d.representante?.nombre ?? "",
    representanteCedula: d.representante?.documentNumber ?? d.representante?.cedula ?? "",
    representanteAcepta: d.representante?.acepta ?? false,
  };
}

function requiereRepresentante(fechaNacimiento: string, edadMinima: number): boolean {
  const edad = applicantAge(fechaNacimiento);
  return Number.isFinite(edad) && edad < 18 && edad >= edadMinima;
}

function validar(valores: Valores, edadMinima: number): Errores {
  const errores: Errores = {};
  const asignar = (campo: keyof Valores, mensaje: string) => {
    if (mensaje) errores[campo] = mensaje;
  };
  asignar("nombres", parteNombreError(valores.nombres, "nombres"));
  asignar("apellidos", parteNombreError(valores.apellidos, "apellidos"));
  asignar("cedula", documentError(valores.documentType, valores.cedula));
  asignar("fechaNacimiento", fechaNacimientoError(valores.fechaNacimiento, edadMinima));
  asignar("telefono", telefonoError(valores.telefono));
  if (!valores.nacionalidadTipo) errores.nacionalidadTipo = "Selecciona tu nacionalidad.";
  if (!valores.tipoSangre) errores.tipoSangre = "Selecciona tu tipo de sangre o elige «No lo sé».";
  if (requiereRepresentante(valores.fechaNacimiento, edadMinima)) {
    asignar("representanteNombre", representanteNombreError(valores.representanteNombre));
    asignar(
      "representanteCedula",
      valores.representanteDocumentType === "cedula"
        ? representanteCedulaError(
            valores.representanteCedula,
            valores.documentType === "cedula" ? valores.cedula : "",
          )
        : documentError(valores.representanteDocumentType, valores.representanteCedula),
    );
    if (!valores.representanteAcepta)
      errores.representanteAcepta = "Se requiere la autorización del representante legal.";
  }
  return errores;
}

// Campo del formulario al que apunta un error del servidor.
function campoDelServidor(error: unknown): keyof Valores | undefined {
  const field = inscripcionErrorField(error);
  if (field === "representante") return "representanteNombre";
  if (field && (ORDEN_CAMPOS as string[]).includes(field)) return field as keyof Valores;
  switch (inscripcionErrorCode(error)) {
    case "EDAD_MINIMA":
    case "EDAD_MAXIMA":
    case "FECHA_INVALIDA":
      return "fechaNacimiento";
    case "CEDULA_INVALIDA":
      return "cedula";
    case "TELEFONO_INVALIDO":
      return "telefono";
    case "REPRESENTANTE_REQUERIDO":
    case "REPRESENTANTE_INVALIDO":
      return "representanteCedula";
    default:
      return undefined;
  }
}

export function PasoDatos({
  solicitudId,
  progreso,
  onProgreso,
  onAvanzar,
  onVolver,
  irAPaso,
}: PasoDatosProps) {
  const documentConfig = useFetch<{ documentTypes?: string[] }>("/public/inscripcion/config");
  const foreign = Boolean(documentConfig.data?.documentTypes?.includes("pasaporte"));
  const edadMinima = progreso.curso?.edadMinima ?? 18;
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(progreso));
  const [tocados, setTocados] = useState<Partial<Record<keyof Valores, boolean>>>({});
  const [erroresServidor, setErroresServidor] = useState<Errores>({});
  const [intentado, setIntentado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [atencionPorContacto, setAtencionPorContacto] = useState(
    progreso.datos.nacionalidadTipo === "extranjero_sin_cedula",
  );
  const bloqueo = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const tituloContacto = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (atencionPorContacto && !foreign) tituloContacto.current?.focus();
  }, [atencionPorContacto, foreign]);

  const enVivo = validar(valores, edadMinima);
  const pideRepresentante = requiereRepresentante(valores.fechaNacimiento, edadMinima);

  function errorDe(campo: keyof Valores): string | undefined {
    if (erroresServidor[campo]) return erroresServidor[campo];
    return tocados[campo] || intentado ? enVivo[campo] : undefined;
  }

  function cambiar<K extends keyof Valores>(campo: K, valor: Valores[K], tocar = false) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }));
    setErroresServidor((anterior) => ({ ...anterior, [campo]: undefined }));
    if (tocar) setTocados((anterior) => ({ ...anterior, [campo]: true }));
  }

  function tocar(campo: keyof Valores) {
    setTocados((anterior) => ({ ...anterior, [campo]: true }));
  }

  function enfocar(campo: keyof Valores) {
    const control = formulario.current?.elements.namedItem(campo);
    if (control instanceof HTMLElement) control.focus();
  }

  function elegirNacionalidad(valor: Nacionalidad | "") {
    cambiar("nacionalidadTipo", valor, true);
    setAtencionPorContacto(valor === "extranjero_sin_cedula" && !foreign);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (bloqueo.current) return;
    setIntentado(true);
    setErrorGeneral("");
    const errores = validar(valores, edadMinima);
    const primero = ORDEN_CAMPOS.find((campo) => errores[campo]);
    if (primero) {
      setErrorGeneral("Revisa los campos marcados antes de continuar.");
      enfocar(primero);
      return;
    }
    if (!valores.nacionalidadTipo || !valores.tipoSangre) return;

    const telefono = telefonoNormalizado(valores.telefono);
    const nivel = progreso.nivelEstudios;
    const datos: DatosSolicitudInput = {
      nombres: normalizeApplicantName(valores.nombres),
      apellidos: normalizeApplicantName(valores.apellidos),
      cedula: valores.documentType === "cedula" ? valores.cedula : "",
      ...(foreign ? { documentType: valores.documentType, documentNumber: valores.cedula } : {}),
      fechaNacimiento: valores.fechaNacimiento,
      telefono,
      nacionalidadTipo: valores.nacionalidadTipo,
      tipoSangre: valores.tipoSangre,
      ...(nivel && NIVELES_ESTUDIOS.includes(nivel) && nivel !== "menos_de_decimo"
        ? { nivelEstudios: nivel }
        : {}),
      ...(pideRepresentante
        ? {
            representante: {
              nombre: normalizeApplicantName(valores.representanteNombre),
              cedula:
                valores.representanteDocumentType === "cedula" ? valores.representanteCedula : "",
              ...(foreign
                ? {
                    documentType: valores.representanteDocumentType,
                    documentNumber: valores.representanteCedula,
                  }
                : {}),
              acepta: true as const,
            },
          }
        : {}),
    };

    bloqueo.current = true;
    setOcupado(true);
    try {
      await guardarDatos(solicitudId, datos);
      onProgreso(await getProgreso(solicitudId));
      onAvanzar();
    } catch (error) {
      if (requiereVerificarCorreoDeNuevo(error)) {
        irAPaso(PASO_CORREO);
        return;
      }
      if (inscripcionErrorCode(error) === "ATENCION_POR_CONTACTO") {
        setAtencionPorContacto(true);
        return;
      }
      const campo = campoDelServidor(error);
      if (campo) {
        setErroresServidor({ [campo]: inscripcionErrorMessage(error) });
        enfocar(campo);
      } else {
        setErrorGeneral(inscripcionErrorMessage(error));
      }
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  if (atencionPorContacto && documentConfig.isLoading)
    return <p role="status">Consultando los tipos de documento disponibles…</p>;
  if (atencionPorContacto && documentConfig.error)
    return (
      <div role="alert">
        <p>{documentConfig.error}</p>
        <Button type="button" onClick={documentConfig.refetch}>
          Volver a consultar
        </Button>
      </div>
    );
  if (atencionPorContacto && !foreign) {
    return (
      <section className={formStyles.form} aria-labelledby="contacto-titulo">
        <h2 id="contacto-titulo" ref={tituloContacto} tabIndex={-1} className={styles.titulo}>
          Atendemos tu inscripción por WhatsApp
        </h2>
        <p>
          Si eres extranjera o extranjero y aún no tienes cédula ecuatoriana, no puedes registrarte
          en línea. Escríbenos y te ayudamos a inscribirte directamente en la escuela.
        </p>
        <ContactoWhatsApp mensaje="Hola, Colorados Drive. Soy extranjero sin cédula ecuatoriana y quiero inscribirme en un curso de conducción." />
        <div className={formStyles.stepActions}>
          <Button type="button" variant="secondary" onClick={() => elegirNacionalidad("")}>
            Elegir otra nacionalidad
          </Button>
          <Button type="button" variant="ghost" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </section>
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const sinSangre = valores.tipoSangre === "no_sabe";

  return (
    <form
      ref={formulario}
      className={`${formStyles.form} ${styles.datosForm}`}
      onSubmit={guardar}
      noValidate
    >
      <p className={formStyles.fieldHelp}>
        <RequiredMark /> Campo obligatorio
      </p>
      <div className={formStyles.fieldGrid}>
        <Input
          name="nombres"
          label="Nombres *"
          required
          aria-required="true"
          value={valores.nombres}
          onChange={(e) => cambiar("nombres", e.target.value)}
          onBlur={() => tocar("nombres")}
          error={errorDe("nombres")}
          autoComplete="given-name"
          maxLength={60}
        />
        <Input
          name="apellidos"
          label="Apellidos *"
          required
          aria-required="true"
          value={valores.apellidos}
          onChange={(e) => cambiar("apellidos", e.target.value)}
          onBlur={() => tocar("apellidos")}
          error={errorDe("apellidos")}
          autoComplete="family-name"
          maxLength={60}
        />
        {foreign ? (
          <Select
            name="documentType"
            label="Tipo de documento *"
            value={valores.documentType}
            onChange={(e) => {
              cambiar("documentType", e.target.value as DocumentType);
              cambiar("cedula", "");
            }}
          >
            <option value="cedula">Cédula ecuatoriana</option>
            <option value="pasaporte">Pasaporte</option>
            <option value="otro">Otro documento</option>
          </Select>
        ) : null}
        {documentConfig.error ? <p role="alert">{documentConfig.error}</p> : null}
        <Input
          name="cedula"
          label={valores.documentType === "cedula" ? "Cédula *" : "Número de documento *"}
          required
          aria-required="true"
          value={valores.cedula}
          onChange={(e) => {
            const digitos =
              valores.documentType === "cedula"
                ? e.target.value.replace(/\D/g, "").slice(0, 10)
                : e.target.value.toUpperCase().slice(0, 30);
            cambiar("cedula", digitos, digitos.length === 10);
          }}
          onBlur={() => tocar("cedula")}
          error={errorDe("cedula")}
          inputMode={valores.documentType === "cedula" ? "numeric" : "text"}
          maxLength={valores.documentType === "cedula" ? 10 : 30}
        />
        <Input
          name="fechaNacimiento"
          label="Fecha de nacimiento *"
          required
          aria-required="true"
          type="date"
          max={hoy}
          value={valores.fechaNacimiento}
          onChange={(e) => cambiar("fechaNacimiento", e.target.value, true)}
          onBlur={() => tocar("fechaNacimiento")}
          error={errorDe("fechaNacimiento")}
          autoComplete="bday"
        />
        <Input
          name="telefono"
          label="Teléfono *"
          required
          aria-required="true"
          type="tel"
          value={valores.telefono}
          onChange={(e) => cambiar("telefono", e.target.value.replace(/\D/g, "").slice(0, 10))}
          onBlur={() => tocar("telefono")}
          error={errorDe("telefono")}
          autoComplete="tel"
          inputMode="tel"
          maxLength={10}
          aria-describedby="telefono-ayuda"
          helpId="telefono-ayuda"
          help="Ejemplos: 0991234567 o 022345678. Solo números."
        />
        <Select
          name="nacionalidadTipo"
          label="Nacionalidad *"
          required
          aria-required="true"
          value={valores.nacionalidadTipo}
          onChange={(e) => elegirNacionalidad(e.target.value as Nacionalidad | "")}
          onBlur={() => tocar("nacionalidadTipo")}
          error={errorDe("nacionalidadTipo")}
        >
          <option value="">Selecciona una opción</option>
          {NACIONALIDADES.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETA_NACIONALIDAD[valor]}
            </option>
          ))}
        </Select>
        <Select
          name="tipoSangre"
          label="Tipo de sangre *"
          required
          aria-required="true"
          value={valores.tipoSangre}
          onChange={(e) => cambiar("tipoSangre", e.target.value as TipoSangre | "", true)}
          onBlur={() => tocar("tipoSangre")}
          error={errorDe("tipoSangre")}
          aria-describedby="sangre-ayuda"
          helpId="sangre-ayuda"
          help={
            sinSangre ? (
              <div className={styles.aviso} role="note">
                <strong>La ANT exige el carné de la Cruz Roja para tu licencia.</strong>
                <span>
                  Puedes continuar sin conocer tu tipo de sangre. Llévalo a la escuela cuando lo
                  tengas.
                </span>
              </div>
            ) : (
              <p className={formStyles.fieldHelp}>
                Si no conoces tu tipo de sangre, elige «No lo sé».
              </p>
            )
          }
        >
          <option value="">Selecciona una opción</option>
          {TIPOS_SANGRE.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETA_SANGRE[valor]}
            </option>
          ))}
        </Select>
      </div>
      {pideRepresentante ? (
        <fieldset className={formStyles.form}>
          <legend className="font-semibold">Representante legal</legend>
          <p className="text-sm text-text-secondary">
            Por ser menor de 18 años necesitamos los datos y la autorización de tu representante
            legal.
          </p>
          <div className={formStyles.fieldGrid}>
            <Input
              name="representanteNombre"
              label="Nombre completo del representante"
              value={valores.representanteNombre}
              onChange={(e) => cambiar("representanteNombre", e.target.value)}
              onBlur={() => tocar("representanteNombre")}
              error={errorDe("representanteNombre")}
              autoComplete="off"
              maxLength={100}
            />
            {foreign ? (
              <Select
                name="representanteDocumentType"
                label="Tipo de documento del representante"
                value={valores.representanteDocumentType}
                onChange={(e) => {
                  cambiar("representanteDocumentType", e.target.value as DocumentType);
                  cambiar("representanteCedula", "");
                }}
              >
                <option value="cedula">Cédula</option>
                <option value="pasaporte">Pasaporte</option>
                <option value="otro">Otro documento</option>
              </Select>
            ) : null}
            <Input
              name="representanteCedula"
              label={
                valores.representanteDocumentType === "cedula"
                  ? "Cédula del representante"
                  : "Número de documento del representante"
              }
              value={valores.representanteCedula}
              onChange={(e) => {
                const digitos =
                  valores.representanteDocumentType === "cedula"
                    ? e.target.value.replace(/\D/g, "").slice(0, 10)
                    : e.target.value.toUpperCase().slice(0, 30);
                cambiar("representanteCedula", digitos, digitos.length === 10);
              }}
              onBlur={() => tocar("representanteCedula")}
              error={errorDe("representanteCedula")}
              inputMode={valores.representanteDocumentType === "cedula" ? "numeric" : "text"}
              maxLength={valores.representanteDocumentType === "cedula" ? 10 : 30}
            />
          </div>
          <label className={formStyles.checkbox}>
            <EnrollmentCheckbox
              name="representanteAcepta"
              checked={valores.representanteAcepta}
              onChange={(e) => cambiar("representanteAcepta", e.target.checked, true)}
              aria-invalid={Boolean(errorDe("representanteAcepta"))}
              aria-describedby={errorDe("representanteAcepta") ? "representante-error" : undefined}
            />
            Mi representante legal autoriza esta solicitud y el tratamiento de mis datos.
          </label>
          <FormError id="representante-error">{errorDe("representanteAcepta")}</FormError>
        </fieldset>
      ) : null}
      {!foreign && valores.documentType !== "cedula" ? (
        <p role="status">
          Este tipo de documento no está habilitado en línea ahora. Contacta a la escuela.
        </p>
      ) : null}
      <FormError>{errorGeneral}</FormError>
      <div className={formStyles.stepActions}>
        <Button
          type="submit"
          isLoading={ocupado}
          disabled={!foreign && valores.documentType !== "cedula"}
        >
          Guardar y continuar
        </Button>
        <Button type="button" variant="secondary" disabled={ocupado} onClick={onVolver}>
          Volver
        </Button>
      </div>
    </form>
  );
}
