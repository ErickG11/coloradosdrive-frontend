import { useId } from "react";
export function PasswordGuidance({ value, minimum }: { value: string; minimum: number }) {
  const id = useId();
  const checks = [
    value.length >= minimum,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^a-zA-Z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  return (
    <section
      aria-labelledby={id}
      className="grid gap-3 rounded-md border border-border bg-bg-sunken p-4 text-sm"
    >
      <h2 id={id} className="font-semibold">
        Tu contraseña segura
      </h2>
      <div
        role="meter"
        aria-label="Fortaleza estimada de la contraseña"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={
          !value ? "Sin contraseña" : score < 2 ? "Básica" : score < 4 ? "Mejorable" : "Fuerte"
        }
        className="grid grid-cols-4 gap-1.5"
      >
        {checks.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full ${index < score ? "bg-brand-primary" : "bg-border-strong"}`}
          />
        ))}
      </div>
      <p className={checks[0] ? "text-status-success" : "text-text-secondary"}>
        {checks[0] ? "✓" : "○"} Al menos {minimum} caracteres (obligatorio).
      </p>
      <p className="text-xs leading-relaxed text-text-secondary">
        Como recomendación, combina mayúsculas, minúsculas, números y símbolos. Evita tu nombre,
        cédula y contraseñas que ya uses en otra cuenta.
      </p>
    </section>
  );
}
