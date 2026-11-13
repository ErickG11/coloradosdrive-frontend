"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { EnrollmentIcon } from "../EnrollmentVisual";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/inscripcion/EnrollmentField";
import { FormError } from "@/components/ui/FormError";
import { verificarCorreo } from "@/lib/api/inscripcion";
import {
  inscripcionErrorCode,
  inscripcionErrorMessage,
  sugiereWhatsapp,
} from "@/lib/api/inscripcionErrors";

import { ContactoWhatsApp } from "../ContactoWhatsApp";
import styles from "../wizard.module.css";
import { CaptchaSlot } from "./CaptchaSlot";

interface PasoCorreoProps {
  correo: string;
  courseId: string;
  onCorreoChange: (correo: string) => void;
  onEnviado: () => void;
  onVolver: () => void;
  onCerrado: () => void;
}

export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase();
}

export function correoValido(valor: string): boolean {
  const correo = normalizarCorreo(valor);
  return correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function PasoCorreo({
  correo,
  courseId,
  onCorreoChange,
  onEnviado,
  onVolver,
  onCerrado,
}: PasoCorreoProps) {
  const [errorCampo, setErrorCampo] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [derivar, setDerivar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const bloqueo = useRef(false);
  const campoRef = useRef<HTMLInputElement>(null);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (bloqueo.current) return;
    setErrorEnvio("");
    setDerivar(false);
    if (!correoValido(correo)) {
      setErrorCampo("Ingresa un correo electrónico válido de hasta 254 caracteres.");
      campoRef.current?.focus();
      return;
    }
    setErrorCampo("");
    bloqueo.current = true;
    setEnviando(true);
    try {
      // Sin captchaToken: el widget se integra en F43 (ver CaptchaSlot).
      await verificarCorreo({ correo: normalizarCorreo(correo), courseId });
      onEnviado();
    } catch (error) {
      if (inscripcionErrorCode(error) === "INSCRIPCIONES_CERRADAS") {
        onCerrado();
        return;
      }
      setErrorEnvio(inscripcionErrorMessage(error));
      setDerivar(sugiereWhatsapp(error));
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar} noValidate>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-10 h-5 w-5 text-text-secondary"
        >
          <EnrollmentIcon name="mail" />
        </span>
        <Input
          className="pr-12"
          ref={campoRef}
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={correo}
          onChange={(e) => {
            onCorreoChange(e.target.value);
            setErrorCampo("");
          }}
          onBlur={() => {
            if (correo.trim() && !correoValido(correo)) {
              setErrorCampo("Ingresa un correo electrónico válido de hasta 254 caracteres.");
            }
          }}
          error={errorCampo || undefined}
          aria-describedby="correo-ayuda"
          helpId="correo-ayuda"
          help="Te enviaremos un código de 6 dígitos para confirmar que el correo es tuyo."
          required
        />
      </div>
      <p className="rounded-sm bg-bg-sunken p-3 text-xs leading-relaxed text-text-secondary">
        Solo usaremos tu correo para verificar tu solicitud y avisarte cómo avanza. No compartas tu
        código.
      </p>
      <CaptchaSlot />
      {derivar ? <ContactoWhatsApp /> : null}
      <FormError>{errorEnvio}</FormError>
      <div data-flow-actions className={styles.actions}>
        <Button type="button" variant="ghost" disabled={enviando} onClick={onVolver}>
          Volver a requisitos
        </Button>
        <Button type="submit" isLoading={enviando}>
          Enviar código
        </Button>
      </div>
    </form>
  );
}
