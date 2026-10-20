import type { Metadata } from "next";
import Link from "next/link";

// La plantilla del layout raíz le agrega « · ColoradosDrive».
export const metadata: Metadata = { title: "Página no encontrada" };

// Componente de servidor: por eso el enlace usa clases propias en vez de
// buttonClassName (Button.tsx es "use client").
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p aria-hidden="true" className="font-display text-5xl font-bold text-accent-red">
          404
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Página no encontrada
        </h1>
        <p className="text-sm text-text-secondary">La página que buscas no existe o fue movida.</p>
        <Link
          href="/"
          className="text-sm font-medium text-accent-blue underline underline-offset-2 hover:text-accent-blue-hover"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
