import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SearchInput } from "@/components/ui/SearchInput";

function Example() {
  const [query, setQuery] = useState("");
  return (
    <>
      <SearchInput
        label="Buscar alumnos"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery("")}
        shortcut
      />
      <input aria-label="Otro campo" />
    </>
  );
}
describe("SearchInput", () => {
  it("enfoca con / y permite limpiar conservando el foco", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.keyboard("/");
    const search = screen.getByRole("searchbox", { name: "Buscar alumnos" });
    expect(search).toHaveFocus();
    await user.type(search, "Ana");
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  });
  it("no intercepta / cuando se escribe en otro campo", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const other = screen.getByRole("textbox", { name: "Otro campo" });
    await user.type(other, "/");
    expect(other).toHaveFocus();
    expect(other).toHaveValue("/");
  });
});
