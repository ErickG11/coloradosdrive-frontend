import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders its children", () => {
    render(
      <Card>
        <p>Contenido</p>
      </Card>,
    );

    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("renders a title when provided", () => {
    render(<Card title="Panel de administrador">Contenido</Card>);

    expect(screen.getByRole("heading", { name: "Panel de administrador" })).toBeInTheDocument();
  });

  it("does not render a heading when no title is provided", () => {
    render(<Card>Contenido</Card>);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
