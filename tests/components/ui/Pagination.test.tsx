import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/ui/Pagination";

describe("Pagination", () => {
  it("usa singular cuando hay un alumno", () => {
    render(
      <Pagination total={1} page={1} singular="alumno" plural="alumnos" onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("1 alumno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
  it("muestra el rango real en la última página", () => {
    render(
      <Pagination total={135} page={7} singular="alumno" plural="alumnos" onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("Mostrando 121–135 de 135 alumnos")).toBeInTheDocument();
  });
});
