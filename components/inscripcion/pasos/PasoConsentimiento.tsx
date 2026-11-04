"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { getProgreso, guardarConsentimiento } from "@/lib/api/inscripcion";
import {
  inscripcionErrorCode,
  inscripcionErrorMessage,
  requiereVerificarCorreoDeNuevo,
} from "@/lib/api/inscripcionErrors";
import type { InscripcionConfig } from "@/types/inscripcion";

import styles from "../wizard.module.css";
import { AvisoPrivacidad, TerminosCondiciones } from "./TextosLegales";
import { PASO_CORREO, type PasoProps } from "./tipos";

interface PasoConsentimientoProps extends PasoProps {
  config: InscripcionConfig;
  // Se llama cuando el servidor informa que las versiones del aviso o de los términos cambiaron.
  onConfigDesactualizada: () => void;
}

type Casilla = "tratamiento" | "veracidad" | "terminos" | "representante";

const ERRORES_CASILLA: Record<Casilla, string> = {
  tratamiento: "Autoriza el tratamiento de tus datos para continuar.",
  veracidad: "Declara que tus datos y documentos son verdaderos para continuar.",
  terminos: "Acepta los términos para continuar.",
  representante: "Se requiere la autorización del representante legal.",
};

export function PasoConsentimiento({
  solicitudId,
  progreso,
  onProgreso,
  onAvanzar,
  irAPaso,
  config,
  onConfigDesactualizada,
}: PasoConsentimientoProps) {
  const [marcadas, setMarcadas] = useState<Record<Casilla, boolean>>({
    tratamiento: false,
    veracidad: false,
    terminos: false,
    representante: false,
  });
  const [errores, setErrores] = useState<Partial<Record<Casilla, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const bloqueo = useRef(false);
  const refs = useRef<Partial<Record<Casilla, HTMLInputElement | null>>>({});

  const requiereRepresentante = progreso?.requiereRepresentante === true;
  const yaAceptado = progreso?.consentimientoVigente === true;
  const casillas: Casilla[] = requiereRepresentante
    ? ["tratamiento", "veracidad", "terminos", "representante"]
    : ["tratamiento", "veracidad", "terminos"];

  function alternar(casilla: Casilla, valor: boolean) {
    setMarcadas((previas) => ({ ...previas, [casilla]: valor }));
    setErrores((previos) => ({ ...previos, [casilla]: undefined }));
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (bloqueo.current) return;
    setErrorGeneral("");
    const faltantes = casillas.filter((casilla) => !marcadas[casilla]);
    if (faltantes.length > 0) {
      setErrores(Object.fromEntries(faltantes.map((c) => [c, ERRORES_CASILLA[c]])));
      refs.current[faltantes[0]]?.focus();
      return;
    }
    bloqueo.current = true;
    setEnviando(true);
    try {
      await guardarConsentimiento(solicitudId, {
        versionAviso: config.versionAviso,
        versionTerminos: config.versionTerminos,
        aceptoTratamiento: marcadas.tratamiento,
        declaraVeracidad: marcadas.veracidad,
        aceptoTerminos: marcadas.terminos,
        ...(requiereRepresentante ? { representanteAcepta: marcadas.representante } : {}),
      });
      onProgreso(await getProgreso(solicitudId));
      onAvanzar();
    } catch (error) {
      if (requiereVerificarCorreoDeNuevo(error)) {
        irAPaso(PASO_CORREO);
        return;
      }
      const codigo = inscripcionErrorCode(error);
      if (codigo === "AVISO_DESACTUALIZADO" || codigo === "TERMINOS_DESACTUALIZADOS") {
        // Hay un texto nuevo: se recarga la configuración y se pide aceptar de nuevo.
        onConfigDesactualizada();
        setMarcadas({
          tratamiento: false,
          veracidad: false,
          terminos: false,
          representante: false,
        });
      }
      setErrorGeneral(inscripcionErrorMessage(error));
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }

  const etiquetas: Record<Casilla, string> = {
    tratamiento:
      "Leí el aviso de privacidad y autorizo el tratamiento de mis datos, incluido mi tipo de sangre.",
    veracidad: "Declaro que los datos y documentos que presento son verdaderos.",
    terminos: "Acepto los términos del curso.",
    representante: "Soy el representante legal y autorizo esta inscripción.",
  };

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <p className={`${styles.notice} ${styles.noticeWarning}`} role="note">
        Estos textos son un borrador y están en revisión legal. Pueden cambiar antes de su
        publicación definitiva.
      </p>

      <section aria-labelledby="aviso-titulo" className="grid gap-2">
        <h3 id="aviso-titulo" className="text-base font-semibold text-text-primary">
          Aviso de privacidad{" "}
          <span className="text-sm font-normal text-text-secondary">
            (versión {config.versionAviso})
          </span>
        </h3>
        <div className={styles.legalBox} tabIndex={0} role="region" aria-labelledby="aviso-titulo">
          <AvisoPrivacidad config={config} />
        </div>
      </section>

      <section aria-labelledby="terminos-titulo" className="grid gap-2">
        <h3 id="terminos-titulo" className="text-base font-semibold text-text-primary">
          Términos del curso{" "}
          <span className="text-sm font-normal text-text-secondary">
            (versión {config.versionTerminos})
          </span>
        </h3>
        <div
          className={styles.legalBox}
          tabIndex={0}
          role="region"
          aria-labelledby="terminos-titulo"
        >
          <TerminosCondiciones />
        </div>
      </section>

      {yaAceptado ? (
        <p className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
          Ya registraste tu aceptación. Puedes continuar o aceptar de nuevo si cambió algún texto.
        </p>
      ) : null}

      <fieldset className="grid gap-1 border-0 p-0">
        <legend className="mb-2 text-sm font-medium text-text-secondary">Tu aceptación</legend>
        {casillas.map((casilla) => (
          <div key={casilla}>
            <label className={styles.check}>
              <input
                ref={(nodo) => {
                  refs.current[casilla] = nodo;
                }}
                type="checkbox"
                checked={marcadas[casilla]}
                onChange={(e) => alternar(casilla, e.target.checked)}
                aria-invalid={Boolean(errores[casilla])}
                aria-describedby={errores[casilla] ? `consent-${casilla}-error` : undefined}
              />
              {etiquetas[casilla]}
            </label>
            {errores[casilla] ? (
              <p id={`consent-${casilla}-error`} role="alert" className={styles.checkError}>
                {errores[casilla]}
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>

      <FormError>{errorGeneral}</FormError>
      <div className={styles.actions}>
        {yaAceptado ? (
          <Button type="button" variant="secondary" onClick={onAvanzar} disabled={enviando}>
            Continuar sin cambios
          </Button>
        ) : null}
        <Button type="submit" isLoading={enviando}>
          Aceptar y continuar
        </Button>
      </div>
    </form>
  );
}
