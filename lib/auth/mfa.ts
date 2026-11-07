import { createClient } from "@/lib/supabase/client";

// MFA del administrador con TOTP de Supabase Auth (mfa.enroll / challenge / verify).
// El backend exige aal2 en /admin/* solo si ADMIN_MFA_REQUIRED=true; aquí solo se
// gestiona el factor y el desafío tras el login.

export const MFA_REQUERIDA = "MFA_REQUERIDA";
export const RUTA_DESAFIO_MFA = "/mfa";
export const RUTA_SEGURIDAD_ADMIN = "/admin/seguridad";

export interface FactorTotp {
  id: string;
  verificado: boolean;
}

export interface EnrolamientoTotp {
  factorId: string;
  // Data URI SVG generada por Supabase; se muestra solo dentro de <img>.
  qrCode: string;
  secreto: string;
}

export interface NivelMfa {
  actual: "aal1" | "aal2" | null;
  siguiente: "aal1" | "aal2" | null;
}

// Mensajes en español por código de error de Supabase Auth (sin mostrar texto en inglés).
export function mensajeMfa(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case "mfa_verification_failed":
      return "El código no es correcto. Revisa tu app autenticadora e inténtalo de nuevo.";
    case "mfa_challenge_expired":
      return "El código venció. Escribe el código vigente de tu app autenticadora.";
    case "mfa_factor_not_found":
      return "No se encontró el factor de verificación. Vuelve a empezar la activación.";
    case "mfa_factor_name_conflict":
      return "Ya existe un factor con ese nombre. Recarga la página e inténtalo de nuevo.";
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "La verificación en dos pasos no está habilitada para este proyecto. Contacta al responsable técnico.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un momento antes de volver a intentarlo.";
    case "session_not_found":
    case "refresh_token_not_found":
      return "Tu sesión venció. Inicia sesión de nuevo.";
    default:
      return "No se pudo completar la verificación. Intenta de nuevo.";
  }
}

export function codigoValido(codigo: string): boolean {
  return /^\d{6}$/.test(codigo);
}

export async function listarFactoresTotp(): Promise<FactorTotp[]> {
  const { data, error } = await createClient().auth.mfa.listFactors();
  if (error) throw error;
  return data.totp.map((f) => ({ id: f.id, verificado: f.status === "verified" }));
}

function aNivel(valor: string | null): "aal1" | "aal2" | null {
  return valor === "aal1" || valor === "aal2" ? valor : null;
}

export async function obtenerNivelMfa(): Promise<NivelMfa> {
  const { data, error } = await createClient().auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return { actual: aNivel(data.currentLevel), siguiente: aNivel(data.nextLevel) };
}

// Quita un factor sin verificar abandonado antes de crear uno nuevo.
export async function enrolarTotp(): Promise<EnrolamientoTotp> {
  const supabase = createClient();
  const factores = await listarFactoresTotp();
  for (const factor of factores.filter((f) => !f.verificado)) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `ColoradosDrive admin ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secreto: data.totp.secret };
}

// Desafío + verificación; al terminar la sesión pasa a aal2.
export async function verificarTotp(factorId: string, codigo: string): Promise<void> {
  const supabase = createClient();
  const { data: desafio, error: errorDesafio } = await supabase.auth.mfa.challenge({ factorId });
  if (errorDesafio) throw errorDesafio;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: desafio.id,
    code: codigo,
  });
  if (error) throw error;
}

// Tras el login: ¿hay que pedir el segundo factor antes de entrar? Falla abierto ante
// cualquier error porque el backend es quien exige aal2 de verdad.
export async function requiereDesafioMfa(): Promise<boolean> {
  try {
    const nivel = await obtenerNivelMfa();
    return nivel.actual === "aal1" && nivel.siguiente === "aal2";
  } catch {
    return false;
  }
}
