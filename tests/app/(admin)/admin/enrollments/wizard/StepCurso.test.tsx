import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepCurso } from "@/app/(admin)/admin/enrollments/wizard/StepCurso";
import { parseCents } from "@/app/(admin)/admin/enrollments/wizard/payment";
import { api } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ api: { post: vi.fn() } }));
const post = vi.mocked(api.post);

describe("precio de cohorte recibido en course-preview", () => {
  it.each([
    [200, 20000],
    [190.5, 19050],
    ["200.00", 20000],
    ["incorrecto", null],
    [-1, null],
    [Number.POSITIVE_INFINITY, null],
    [1.005, null],
    [null, null],
    [{ precio: 200 }, null],
  ])("convierte %s a %s centavos sin lanzar", (precio, expected) => {
    expect(parseCents(precio)).toBe(expected);
  });

  it.each([
    [200, /200,00/],
    [190.5, /190,50/],
    ["200.00", /200,00/],
    ["incorrecto", /No disponible/],
  ])("renderiza el paso Curso con precio %s", async (precio, expected) => {
    post.mockResolvedValueOnce({
      courseId: "course-a",
      tipo: "A",
      suggestion: { cohortId: "cohort-a", warning: null, precio: null, cohortNombre: null },
      cohorts: [
        {
          id: "cohort-a",
          course_id: "course-a",
          nombre: "Cohorte A",
          precio,
          cupo_maximo: 20,
          ocupados: 2,
          fecha_inicio_matricula: "2026-09-01",
          fecha_fin_matricula: "2026-10-31",
          fecha_inicio_curso: "2026-11-01",
          fecha_fin_curso: "2026-12-31",
        },
      ],
    });
    render(
      <StepCurso
        catalog={[{ tipo: "A", nombre: "Motocicletas", courseId: "course-a" }]}
        value={null}
        onBack={() => {}}
        onNext={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /Tipo A/ }));
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});
