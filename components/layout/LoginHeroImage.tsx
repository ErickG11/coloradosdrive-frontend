// Columna decorativa local (patrón de carretera en SVG): no pide ningún
// recurso remoto, así /login no genera 404 ni errores en consola.
export function LoginHeroImage() {
  return (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden border-r border-border bg-bg-sunken"
    >
      <svg
        viewBox="0 0 600 1000"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-border-strong"
      >
        <path
          d="M-100 1050V730c0-140 140-140 140-280s240-140 240-280V-50M40 1050V730c0-140 140-140 140-280s240-140 240-280V-50"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-30 1050V730c0-140 140-140 140-280s240-140 240-280V-50"
          stroke="currentColor"
          strokeDasharray="12 12"
          strokeWidth="2"
        />
        <path d="M-100 940h800M-100 80h800" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}
