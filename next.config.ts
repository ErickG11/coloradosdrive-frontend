import type { NextConfig } from "next";

// Orígenes que el navegador necesita contactar (API propia y Supabase). Se leen de las
// mismas variables públicas que usa la app; sin ellas la CSP queda solo con 'self'.
function origenDe(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    return new URL(valor).origin;
  } catch {
    return null;
  }
}

const origenApi = origenDe(process.env.NEXT_PUBLIC_API_URL);
const origenSupabase = origenDe(process.env.NEXT_PUBLIC_SUPABASE_URL);
const origenSupabaseWs = origenSupabase?.replace(/^https/, "wss") ?? null;

const conexiones = ["'self'", origenApi, origenSupabase, origenSupabaseWs].filter(
  (origen): origen is string => origen !== null,
);

// CSP en modo Report-Only: informa de violaciones sin bloquear nada mientras se afina.
// No permite el script de Turnstile: se añade en F43 junto con el widget.
// 'unsafe-inline' en script/style lo requiere Next.js (hidratación y estilos en línea)
// mientras no se use una CSP con nonce.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${origenSupabase ? ` ${origenSupabase}` : ""}`,
  "font-src 'self' data:",
  `connect-src ${conexiones.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Hosted Fields solo en la página del pago; el SDK se importa al montar Paso3.
const paymentCsp =
  cspReportOnly
    .replace(
      "script-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://cdn.sift.com https://*.cardinalcommerce.com",
    )
    .replace(
      `connect-src ${conexiones.join(" ")}`,
      `connect-src ${conexiones.join(" ")} https://api-uat.kushkipagos.com https://api.kushkipagos.com https://*.cardinalcommerce.com https://*.sift.com`,
    ) +
  "; frame-src 'self' https://spa-js-inputs.kushkipagos.com https://uat-spa-js-inputs.kushkipagos.ninja https://*.cardinalcommerce.com";

const nextConfig: NextConfig = {
  // No generar AGENTS.md/CLAUDE.md en cada `next dev`.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // frame-ancestors se ignora en Report-Only, por eso va en una CSP aplicada.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
      {
        // Todas las rutas salvo /crear-contrasena, que usa no-referrer más abajo.
        source: "/((?!crear-contrasena).*)",
        headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
      {
        // El enlace de un solo uso lleva token_hash en la URL: nunca debe salir como referrer.
        source: "/crear-contrasena/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // noindex sin editar las páginas del flujo público.
        source: "/inscripcion/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/student/inscripcion",
        headers: [{ key: "Content-Security-Policy-Report-Only", value: paymentCsp }],
      },
    ];
  },
};

export default nextConfig;
