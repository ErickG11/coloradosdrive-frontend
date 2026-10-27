import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { ThemeProvider, useTheme } from "@/components/theme/ThemeProvider";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
  Space_Grotesk: () => ({ variable: "font-space" }),
}));
function themeDocument() {
  const html = renderToStaticMarkup(
    RootLayout({ children: <main>Contenido</main>, params: Promise.resolve({}) }),
  );
  return { html, dom: new DOMParser().parseFromString(html, "text/html") };
}
function ThemeControl() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme === "dark" ? "Oscuro" : "Claro"}</button>;
}
afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("inicializacion del tema antes de la hidratacion", () => {
  it("emite un unico script inline en head antes del contenido, sin next/script", () => {
    const { html, dom } = themeDocument();
    expect(dom.head.querySelectorAll("script#theme-init")).toHaveLength(1);
    expect(dom.body.querySelector("script#theme-init")).toBeNull();
    const script = dom.head.querySelector("script#theme-init")!;
    expect(script.hasAttribute("src")).toBe(false);
    expect(script.hasAttribute("async")).toBe(false);
    expect(html.indexOf('id="theme-init"')).toBeLessThan(html.indexOf("<body"));
    expect(script.textContent).toContain('localStorage.getItem("colorScheme")');
  });
  it.each([
    ["dark", true],
    ["light", false],
    [null, false],
  ] as const)("respeta preferencia %s antes de montar React", (stored, dark) => {
    const { dom } = themeDocument();
    const getItem = vi.fn().mockReturnValue(stored);
    runInNewContext(dom.head.querySelector("#theme-init")!.textContent!, {
      window: { localStorage: { getItem } },
      document,
    });
    expect(getItem).toHaveBeenCalledWith("colorScheme");
    expect(document.documentElement.classList.contains("dark")).toBe(dark);
    render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: dark ? "Oscuro" : "Claro" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(dark);
  });
  it("conserva el cambio de oscuro a claro y la preferencia guardada", async () => {
    const { dom } = themeDocument();
    runInNewContext(dom.head.querySelector("#theme-init")!.textContent!, {
      window: { localStorage: { getItem: () => "dark" } },
      document,
    });
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Oscuro" }));
    expect(screen.getByRole("button", { name: "Claro" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("colorScheme")).toBe("light");
  });
  it("mantiene el valor claro si localStorage no esta disponible", () => {
    const { dom } = themeDocument();
    expect(() =>
      runInNewContext(dom.head.querySelector("#theme-init")!.textContent!, {
        window: {
          localStorage: {
            getItem: () => {
              throw new Error("Storage no disponible");
            },
          },
        },
        document,
      }),
    ).not.toThrow();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
