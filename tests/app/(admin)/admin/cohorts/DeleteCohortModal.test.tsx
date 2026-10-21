import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DeleteCohortModal,
  normalizeCohortName,
} from "@/app/(admin)/admin/cohorts/DeleteCohortModal";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort } from "@/types";

vi.mock("@/lib/api/client", () => ({ api: { delete: vi.fn() } }));

const mockedDelete = vi.mocked(api.delete);

const cohort: Cohort = {
  id: "cohort-1",
  courseId: "course-a",
  nombre: "Cohorte Marzo 2026",
  precio: 150,
  cupoMaximo: 20,
  fechaInicioMatricula: "2026-02-01",
  fechaFinMatricula: "2026-02-25",
  fechaInicioCurso: "2026-03-01",
  fechaFinCurso: "2026-06-01",
  tipoModalidad: null,
  horariosCapacitacionTeoria: null,
  numeroVehiculos: null,
  numeroAulas: null,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

const onClose = vi.fn();
const onDeleted = vi.fn();
const onGone = vi.fn();

function renderModal(target: Cohort = cohort) {
  render(
    <DeleteCohortModal
      cohort={target}
      courseLabel="Motocicletas (Tipo A)"
      onClose={onClose}
      onDeleted={onDeleted}
      onGone={onGone}
    />,
  );
}

const confirmField = () =>
  screen.getByLabelText("Para confirmar, escribe el nombre exacto de la cohorte:");
const deleteButton = () => screen.getByRole("button", { name: "Eliminar cohorte" });

describe("DeleteCohortModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el nombre y el curso de la cohorte", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Eliminar la cohorte «Cohorte Marzo 2026»",
    );
    expect(screen.getByText("Motocicletas (Tipo A)")).toBeInTheDocument();
    expect(
      screen.getByText("Esta acción no se puede deshacer.", { exact: false }),
    ).toBeInTheDocument();
  });

  describe("confirmación con el nombre exacto", () => {
    it.each([
      ["vacío", ""],
      ["solo espacios", "   "],
      ["en minúsculas", "cohorte marzo 2026"],
      ["con doble espacio interno", "Cohorte  Marzo 2026"],
      ["incompleto", "Cohorte Marzo"],
    ])("con el nombre %s el botón está deshabilitado y no se llama a la API", async (_n, typed) => {
      renderModal();

      fireEvent.change(confirmField(), { target: { value: typed } });
      expect(deleteButton()).toBeDisabled();
      fireEvent.submit(deleteButton().closest("form")!);

      expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("acepta espacios extremos y la forma Unicode descompuesta (NFC, como el servidor)", () => {
      const accented: Cohort = { ...cohort, nombre: "Cohorte Matrícula" };
      renderModal(accented);

      // «í» escrita como «i» + acento combinante (NFD), con espacios extremos.
      fireEvent.change(confirmField(), {
        target: { value: "  Cohorte Matrícula " },
      });

      expect(deleteButton()).toBeEnabled();
    });

    it("normalizeCohortName recorta y normaliza a NFC", () => {
      expect(normalizeCohortName("  Matrícula ")).toBe("Matrícula");
    });
  });

  it("con el nombre exacto envía DELETE con confirmacionNombre y avisa del éxito", async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue({
      id: "cohort-1",
      nombre: "Cohorte Marzo 2026",
      message: "Cohorte eliminada.",
    });
    renderModal();

    await user.type(confirmField(), "Cohorte Marzo 2026");
    await user.click(deleteButton());

    await waitFor(() =>
      expect(onDeleted).toHaveBeenCalledWith("Cohorte «Cohorte Marzo 2026» eliminada."),
    );
    expect(mockedDelete).toHaveBeenCalledWith("/cohorts/cohort-1", {
      body: { confirmacionNombre: "Cohorte Marzo 2026" },
    });
  });

  it("con alumnos o franjas (409) muestra el desglose del servidor tal cual y bloquea", async () => {
    const user = userEvent.setup();
    const message =
      "No se puede eliminar la cohorte: tiene 4 alumnos (1 activo, 1 desactivado, 1 graduado, 1 retirado), 1 franja de práctica (1 con reserva) y 1 registro de recuperación de prácticas.";
    mockedDelete.mockRejectedValue(new ApiError(message, 409, { code: "COHORT_IN_USE" }));
    renderModal();

    await user.type(confirmField(), "Cohorte Marzo 2026");
    await user.click(deleteButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(deleteButton()).toBeDisabled();
    expect(confirmField()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("si el servidor rechaza la confirmación la muestra junto al campo", async () => {
    const user = userEvent.setup();
    const message =
      "Confirmación inválida: escribe el nombre exacto de la cohorte para eliminarla.";
    mockedDelete.mockRejectedValue(
      new ApiError(message, 400, { code: "CONFIRMATION_MISMATCH", field: "confirmacionNombre" }),
    );
    renderModal();

    await user.type(confirmField(), "Cohorte Marzo 2026");
    await user.click(deleteButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(confirmField()).toHaveAttribute("aria-invalid", "true");
    expect(confirmField()).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("si la cohorte ya no existe (404) lo avisa y pide recargar el listado", async () => {
    const user = userEvent.setup();
    mockedDelete.mockRejectedValue(
      new ApiError("Cohorte no encontrada.", 404, { code: "COHORT_NOT_FOUND" }),
    );
    renderModal();

    await user.type(confirmField(), "Cohorte Marzo 2026");
    await user.click(deleteButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Cohorte no encontrada.");
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(deleteButton()).toBeDisabled();
  });

  it("Cancelar cierra sin llamar a la API", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
