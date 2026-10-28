import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstructorRatings } from "@/app/(admin)/admin/instructors/InstructorRatings";
import { api } from "@/lib/api/client";
import type { InstructorRatingDetail, InstructorRatingList } from "@/types/instructorRating";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
const get = vi.mocked(api.get);
const ranking: InstructorRatingList = {
  items: [
    {
      instructorId: "a",
      instructorName: "Zulma",
      active: true,
      average: 4.25,
      responses: 4,
      rankingEligible: true,
      label: "",
    },
    {
      instructorId: "b",
      instructorName: "Ana",
      active: false,
      average: 5,
      responses: 1,
      rankingEligible: false,
      label: "pocas calificaciones",
    },
    {
      instructorId: "c",
      instructorName: "Carlos",
      active: true,
      average: null,
      responses: 0,
      rankingEligible: false,
      label: "sin calificaciones",
    },
  ],
  total: 13,
  page: 1,
  pageSize: 10,
};
const detail: InstructorRatingDetail = {
  instructorId: "a",
  average: 4.25,
  responses: 24,
  rankingEligible: true,
  label: "",
  distribution: [
    { stars: 5, count: 18, percentage: 75 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 6, percentage: 25 },
    { stars: 1, count: 0, percentage: 0 },
  ],
  items: [
    { score: 5, comment: "Explica con paciencia" },
    { score: 2, comment: null },
  ],
  total: 24,
  page: 1,
  pageSize: 10,
};

describe("Ranking administrativo de calificaciones", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    get.mockImplementation(async (path) =>
      path.startsWith("/admin/instructor-ratings?") ? ranking : detail,
    );
  });

  it("conserva el orden del backend, muestra promedio, cantidad, inactividad y pocas respuestas", async () => {
    render(<InstructorRatings />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando ranking");
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getByRole("button").textContent)).toEqual([
      "Zulma",
      "Ana",
      "Carlos",
    ]);
    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(rows[0]).toHaveTextContent("4,25 / 5");
    expect(rows[0]).toHaveTextContent("4 calificaciones");
    expect(rows[1]).toHaveTextContent("Inactivo");
    expect(rows[1]).toHaveTextContent("Pocas calificaciones");
    expect(rows[2]).toHaveTextContent("Sin calificaciones");
    expect(rows[2]).not.toHaveTextContent("0,00 / 5");
  });

  it("pagina el ranking y mantiene la posición global", async () => {
    const user = userEvent.setup();
    get.mockImplementation(async (path) =>
      path.includes("page=2") ? { ...ranking, page: 2, items: [ranking.items[2]] } : ranking,
    );
    render(<InstructorRatings />);
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/admin/instructor-ratings?page=2&pageSize=10"),
    );
    expect(await screen.findByRole("rowheader", { name: "11" })).toBeInTheDocument();
  });

  it("abre el detalle por teclado, muestra el desglose completo y solo puntuación/comentario", async () => {
    const user = userEvent.setup();
    get.mockImplementation(async (path) =>
      path.startsWith("/admin/instructor-ratings?")
        ? ranking
        : {
            ...detail,
            studentName: "ALUMNO_SECRETO",
            practiceSlotId: "FRANJA_SECRETA",
            createdAt: "FECHA_SECRETA",
            items: detail.items.map((item) => ({
              ...item,
              studentEmail: "correo-secreto@example.com",
              studentId: "ID_SECRETO",
            })),
          },
    );
    render(<InstructorRatings />);
    const trigger = await screen.findByRole("button", { name: "Zulma" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Calificaciones de Zulma" });
    const content = within(dialog);
    expect(await content.findByText("Explica con paciencia")).toBeInTheDocument();
    expect(content.getByLabelText("2 de 5 estrellas")).toBeInTheDocument();
    expect(content.queryByText(/sin comentario/i)).not.toBeInTheDocument();
    const bars = content.getAllByRole("meter");
    expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual([
      "5 estrellas",
      "4 estrellas",
      "3 estrellas",
      "2 estrellas",
      "1 estrella",
    ]);
    expect(bars[0]).toHaveAttribute("aria-valuenow", "75");
    expect(bars[0]).toHaveAttribute("aria-valuetext", "18 calificaciones, 75%");
    expect(dialog).not.toHaveTextContent(/SECRETO|SECRETA|correo-secreto/);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("pagina comentarios sin recalcular los porcentajes de todas las respuestas", async () => {
    const user = userEvent.setup();
    get.mockImplementation(async (path) =>
      path.startsWith("/admin/instructor-ratings?")
        ? ranking
        : path.includes("page=2")
          ? { ...detail, page: 2, items: [{ score: 5, comment: "Otra página" }] }
          : detail,
    );
    render(<InstructorRatings />);
    await user.click(await screen.findByRole("button", { name: "Zulma" }));
    const dialog = within(await screen.findByRole("dialog"));
    await dialog.findByText("Explica con paciencia");
    await user.click(dialog.getByRole("button", { name: "Siguiente" }));
    expect(await dialog.findByText("Otra página")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/admin/instructor-ratings/a?page=2&pageSize=10");
    expect(dialog.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow", "75");
    expect(dialog.queryByText("Explica con paciencia")).not.toBeInTheDocument();
  });

  it("sin respuestas conserva las cinco barras en cero y no inventa promedio", async () => {
    const user = userEvent.setup();
    get.mockImplementation(async (path) =>
      path.startsWith("/admin/instructor-ratings?")
        ? ranking
        : {
            ...detail,
            instructorId: "c",
            average: null,
            responses: 0,
            rankingEligible: false,
            total: 0,
            items: [],
            distribution: detail.distribution.map((entry) => ({
              ...entry,
              count: 0,
              percentage: 0,
            })),
          },
    );
    render(<InstructorRatings />);
    await user.click(await screen.findByRole("button", { name: "Carlos" }));
    const dialog = within(await screen.findByRole("dialog"));
    await dialog.findByText("Este instructor aún no tiene respuestas vigentes.");
    expect(dialog.getAllByRole("meter")).toHaveLength(5);
    dialog.getAllByRole("meter").forEach((bar) => {
      expect(bar).toHaveAttribute("aria-valuenow", "0");
      expect(bar).toHaveAttribute("aria-valuetext", "0 calificaciones, 0%");
    });
    expect(dialog.queryByText("0,00 / 5")).not.toBeInTheDocument();
  });

  it("muestra ranking vacío", async () => {
    get.mockResolvedValue({ ...ranking, items: [], total: 0 });
    render(<InstructorRatings />);
    expect(await screen.findByText("No hay instructores para mostrar")).toBeInTheDocument();
  });

  it("permite reintentar un error del ranking", async () => {
    const user = userEvent.setup();
    get.mockRejectedValueOnce(new Error("fallo"));
    render(<InstructorRatings />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el listado");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "Zulma" })).toBeInTheDocument();
  });

  it("muestra carga y error del detalle y permite reintentar", async () => {
    const user = userEvent.setup();
    let rejectDetail: (reason: Error) => void = () => {};
    get.mockImplementation(async (path) =>
      path.startsWith("/admin/instructor-ratings?")
        ? ranking
        : new Promise((_, reject) => {
            rejectDetail = reject;
          }),
    );
    render(<InstructorRatings />);
    await user.click(await screen.findByRole("button", { name: "Zulma" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByRole("status")).toHaveTextContent("Cargando calificaciones");
    rejectDetail(new Error("fallo"));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las calificaciones",
    );
    get.mockResolvedValue(detail);
    await user.click(dialog.getByRole("button", { name: "Reintentar" }));
    expect(await dialog.findByText("Explica con paciencia")).toBeInTheDocument();
  });
});
