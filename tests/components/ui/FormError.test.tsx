import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormError } from "@/components/ui/FormError";

describe("FormError", () => {
  it("announces the message with role=alert", () => {
    render(<FormError>No se pudo guardar.</FormError>);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");
  });

  it("accepts an id so fields can reference it with aria-describedby", () => {
    render(<FormError id="form-error">No se pudo guardar.</FormError>);

    expect(screen.getByRole("alert")).toHaveAttribute("id", "form-error");
  });

  it("renders nothing without a message", () => {
    const { container } = render(<FormError>{null}</FormError>);

    expect(container).toBeEmptyDOMElement();
  });
});
