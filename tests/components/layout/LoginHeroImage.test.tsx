import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { LoginHeroImage } from "@/components/layout/LoginHeroImage";

it("es solo un degradado decorativo: no pide ninguna imagen", () => {
  const { container } = render(<LoginHeroImage />);
  expect(container.querySelector("img")).toBeNull();
  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
});
