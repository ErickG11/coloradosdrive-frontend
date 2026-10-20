import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Select } from "@/components/ui/Select";

function renderSelect(props: { required?: boolean; error?: string } = {}) {
  return render(
    <Select label="Curso" name="courseId" defaultValue="" {...props}>
      <option value="" disabled>
        Selecciona un curso
      </option>
      <option value="a">Curso A</option>
    </Select>,
  );
}

describe("Select", () => {
  it("renders a label associated with the select", () => {
    renderSelect();

    expect(screen.getByLabelText("Curso")).toHaveAttribute("name", "courseId");
  });

  it("lets the user choose an option", async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.selectOptions(screen.getByLabelText("Curso"), "a");

    expect(screen.getByLabelText("Curso")).toHaveValue("a");
  });

  it("replaces the browser message for a missing selection and clears it on change", async () => {
    const user = userEvent.setup();
    renderSelect({ required: true });

    const select = screen.getByLabelText("Curso") as HTMLSelectElement;
    select.checkValidity();
    expect(select.validationMessage).toBe("Selecciona una opción.");

    await user.selectOptions(select, "a");

    expect(select.validationMessage).toBe("");
    expect(select.checkValidity()).toBe(true);
  });

  it("links the error to the select and announces it with role=alert", () => {
    renderSelect({ error: "Elige un curso" });

    const select = screen.getByLabelText("Curso");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Elige un curso");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", alert.id);
  });
});
