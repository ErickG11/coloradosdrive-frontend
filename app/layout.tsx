import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Space Grotesk: títulos, "ColoradosDrive" como wordmark (sin logo por
// ahora) — geométrica, seria, con carácter, no juguetona.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

// Inter: texto de UI (formularios, tablas, botones, navbar) — máxima
// legibilidad a tamaños pequeños, clave para RNF-04 (tareas en <3 min).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ColoradosDrive",
  description: "Plataforma de gestión de la escuela de conducción ColoradosDrive.",
};

// Se ejecuta antes de la hidratación (next/script beforeInteractive) para
// que <html> ya tenga la clase `dark` correcta en el primer pintado — sin
// esto habría un parpadeo (flash del tema por defecto antes de que React
// aplique la preferencia guardada). Sin localStorage guardado, no agrega
// la clase: el default es claro (los valores de :root ya son claros, no
// hace falta ninguna clase para eso).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (window.localStorage.getItem("colorScheme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
