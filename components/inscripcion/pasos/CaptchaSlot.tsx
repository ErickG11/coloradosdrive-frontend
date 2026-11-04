// Espacio reservado para el widget de Turnstile en el paso del correo.
//
// Está VACÍO a propósito: la integración del captcha se aplazó (F43). Mientras tanto:
//  - no se carga ningún script externo ni se añade nada a la CSP;
//  - verificarCorreo se llama sin `captchaToken` (con CAPTCHA_PROVIDER=off el backend lo
//    trata como opcional y no lo valida).
// Cuando se retome F43, este componente montará el widget (solo en el paso del correo),
// entregará el token por una prop `onToken` y PasoCorreo lo enviará como `captchaToken`.
export function CaptchaSlot() {
  return null;
}
