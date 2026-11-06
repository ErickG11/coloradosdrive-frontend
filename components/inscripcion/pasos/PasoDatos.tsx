"use client";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  cedulaError,
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
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  nacionalidadTipo: Nacionalidad | "";
  tipoSangre: TipoSangre | "";
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
    cedula: d.cedula ?? "",
    fechaNacimiento: d.fechaNacimiento?.slice(0, 10) ?? "",
    telefono: d.telefono ?? "",
    nacionalidadTipo: d.nacionalidadTipo ?? "",
    tipoSangre: d.tipoSangre ?? "",
    representanteNombre: d.representante?.nombre ?? "",
    representanteCedula: d.representante?.cedula ?? "",
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
  asignar("cedula", cedulaError(valores.cedula));
  asignar("fechaNacimiento", fechaNacimientoError(valores.fechaNacimiento, edadMinima));
  asignar("telefono", telefonoError(valores.telefono));
  if (!valores.nacionalidadTipo) errores.nacionalidadTipo = "Selecciona tu nacionalidad.";
  if (!valores.tipoSangre) errores.tipoSangre = "Selecciona tu tipo de sangre o elige «No lo sé».";
  if (requiereRepresentante(valores.fechaNacimiento, edadMinima)) {
    asignar("representanteNombre", representanteNombreError(valores.representanteNombre));
    asignar(
      "representanteCedula",
      representanteCedulaError(valores.representanteCedula, valores.cedula),
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
    if (atencionPorContacto) tituloContacto.current?.focus();
  }, [atencionPorContacto]);

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
    setAtencionPorContacto(valor === "extranjero_sin_cedula");
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
      cedula: valores.cedula,
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
              cedula: valores.representanteCedula,
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

  if (atencionPorContacto) {
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
      <p className={formStyles.fieldHelp}>* Campo obligatorio</p>
      <FormError>{errorGeneral}</FormError>
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
        <Input
          name="cedula"
          label="Cédula *"
          required
          aria-required="true"
          value={valores.cedula}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "").slice(0, 10);
            cambiar("cedula", digitos, digitos.length === 10);
          }}
          onBlur={() => tocar("cedula")}
          error={errorDe("cedula")}
          inputMode="numeric"
          maxLength={10}
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
        <div className="grid content-start gap-1">
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
          />
          <p id="telefono-ayuda" className={formStyles.fieldHelp}>
            Ejemplos: 0991234567 o 022345678. Solo números.
          </p>
        </div>
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
        <div className="grid content-start gap-1">
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
          >
            <option value="">Selecciona una opción</option>
            {TIPOS_SANGRE.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETA_SANGRE[valor]}
              </option>
            ))}
          </Select>
          {sinSangre ? (
            <div id="sangre-ayuda" className={styles.aviso} role="note">
              <strong>La ANT exige el carné de la Cruz Roja para tu licencia.</strong>
              <span>
                Puedes continuar sin conocer tu tipo de sangre. Llévalo a la escuela cuando lo
                tengas.
              </span>
            </div>
          ) : (
            <p id="sangre-ayuda" className={formStyles.fieldHelp}>
              Si no conoces tu tipo de sangre, elige «No lo sé».
            </p>
          )}
        </div>
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
            <Input
              name="representanteCedula"
              label="Cédula del representante"
              value={valores.representanteCedula}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "").slice(0, 10);
                cambiar("representanteCedula", digitos, digitos.length === 10);
              }}
              onBlur={() => tocar("representanteCedula")}
              error={errorDe("representanteCedula")}
              inputMode="numeric"
              maxLength={10}
            />
          </div>
          <label className={formStyles.checkbox}>
            <input
              name="representanteAcepta"
              type="checkbox"
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
      <div className={formStyles.stepActions}>
        <Button type="submit" isLoading={ocupado}>
          Guardar y continuar
        </Button>
        <Button type="button" variant="secondary" disabled={ocupado} onClick={onVolver}>
          Volver
        </Button>
      </div>
    </form>
  );
}
