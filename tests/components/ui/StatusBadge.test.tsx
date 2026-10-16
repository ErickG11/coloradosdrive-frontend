import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("muestra la etiqueta en español de cada estado", () => {
    render(<StatusBadge status="sin_practica" />);
    expect(screen.getByText("Sin práctica")).toBeInTheDocument();
  });

  it("usa el color semántico de éxito para estados resueltos positivamente", () => {
    render(<StatusBadge status="confirmado" />);
    expect(screen.getByText("Confirmado")).toHaveClass("text-status-success");
  });

  it("usa el color semántico de advertencia para estados que requieren atención", () => {
    render(<StatusBadge status="liberado" />);
    expect(screen.getByText("Liberado")).toHaveClass("text-status-warning");
  });

  it("usa un tono neutro para disponible", () => {
    render(<StatusBadge status="disponible" />);
    expect(screen.getByText("Disponible")).toHaveClass("text-text-secondary");
  });
});
