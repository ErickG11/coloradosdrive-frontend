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

  it("renders the title as an h2 by default", () => {
    render(<Card title="Panel">Contenido</Card>);

    expect(screen.getByRole("heading", { name: "Panel", level: 2 })).toBeInTheDocument();
  });

  it("renders the title as an h1 when titleAs is h1", () => {
    render(
      <Card title="Nueva cohorte" titleAs="h1">
        Contenido
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Nueva cohorte", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
