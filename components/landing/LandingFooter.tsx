export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-sm text-text-secondary md:flex-row">
        <span className="font-display font-semibold text-text-primary">ColoradosDrive</span>
        <span>© {new Date().getFullYear()} ColoradosDrive. Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}
