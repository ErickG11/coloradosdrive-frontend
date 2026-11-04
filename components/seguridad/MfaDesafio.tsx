"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { LoginIcon } from "@/components/auth/LoginIcon";
import styles from "@/components/auth/login.module.css";
import { Button, FormError } from "@/components/ui";
import {
  codigoValido,
  listarFactoresTotp,
  mensajeMfa,
  obtenerNivelMfa,
  RUTA_SEGURIDAD_ADMIN,
  verificarTotp,
} from "@/lib/auth/mfa";
import { createClient } from "@/lib/supabase/client";

const ERROR_ID = "mfa-error";

// Pantalla de desafío tras el login (y destino cuando el backend responde 403 MFA_REQUERIDA).
export function MfaDesafio() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bloqueo = useRef(false);

  useEffect(() => {
    let vivo = true;
    async function preparar() {
      try {
        const nivel = await obtenerNivelMfa();
        if (!vivo) return;
        if (nivel.actual === "aal2") {
          router.replace("/admin");
          return;
        }
        const factor = (await listarFactoresTotp()).find((f) => f.verificado);
        if (!vivo) return;
        if (!factor) {
          // Aún no hay factor: se enrola primero desde el panel de seguridad.
          router.replace(RUTA_SEGURIDAD_ADMIN);
          return;
        }
        setFactorId(factor.id);
      } catch (cause) {
        if (vivo) setError(mensajeMfa(cause));
      } finally {
        if (vivo) setCargando(false);
      }
    }
    void preparar();
    return () => {
      vivo = false;
    };
  }, [router]);

  useEffect(() => {
    if (factorId) inputRef.current?.focus();
  }, [factorId]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloqueo.current || !factorId) return;
    if (!codigoValido(codigo)) {
      setError("Escribe los 6 dígitos que muestra tu app autenticadora.");
      inputRef.current?.focus();
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    setError(null);
    try {
      await verificarTotp(factorId, codigo);
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      setError(mensajeMfa(cause));
      setCodigo("");
      inputRef.current?.focus();
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  async function salir() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <form
        onSubmit={(event) => void enviar(event)}
        className={styles.form}
        data-error={Boolean(error)}
      >
        <p className="text-sm text-text-secondary">
          Escribe el código de 6 dígitos de tu app autenticadora para continuar.
        </p>
        <label className="sr-only" htmlFor="mfa-codigo">
          Código de verificación de 6 dígitos
        </label>
        <div className={styles.field}>
          <LoginIcon name="lock" />
          <input
            ref={inputRef}
            id="mfa-codigo"
            name="codigo"
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? ERROR_ID : undefined}
            disabled={cargando || !factorId}
            required
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        <FormError id={ERROR_ID} className={styles.error}>
          {error}
        </FormError>
        <Button
          type="submit"
          isLoading={ocupado}
          disabled={cargando || !factorId}
          className={styles.submit}
        >
          <span>Verificar</span>
          <LoginIcon name="arrow" />
        </Button>
      </form>
      <button type="button" className={styles.backLink} onClick={() => void salir()}>
        <LoginIcon name="back" />
        Cerrar sesión
      </button>
    </>
  );
}
