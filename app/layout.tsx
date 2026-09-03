import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
