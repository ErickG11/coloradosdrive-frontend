import { describe, expect, it } from "vitest";

import { getValidationMessage } from "@/lib/utils/validationMessages";

function input(attributes: Record<string, string>, value = "") {
  const element = document.createElement("input");
  for (const [name, attribute] of Object.entries(attributes)) element.setAttribute(name, attribute);
  element.value = value;
  return element;
}

// jsdom no marca tooShort/tooLong/badInput desde código: se simula la bandera.
function withValidity<T extends HTMLElement>(element: T, flags: Partial<ValidityState>): T {
  Object.defineProperty(element, "validity", { value: { ...flags } });
  return element;
}

describe("getValidationMessage", () => {
  it("returns null when the field is valid", () => {
    expect(getValidationMessage(input({ required: "" }, "hola"))).toBeNull();
  });

  it("asks to fill a required text field", () => {
    expect(getValidationMessage(input({ required: "" }))).toBe("Completa este campo.");
  });

  it("asks to choose an option in a required select", () => {
    const select = document.createElement("select");
    select.required = true;
    select.innerHTML = '<option value="">Elige</option><option value="a">A</option>';
    expect(getValidationMessage(select)).toBe("Selecciona una opción.");
  });

  it("asks to fill a required textarea", () => {
    const textarea = document.createElement("textarea");
    textarea.required = true;
    expect(getValidationMessage(textarea)).toBe("Completa este campo.");
  });

  it("explains an invalid email", () => {
    expect(getValidationMessage(input({ type: "email" }, "no-es-correo"))).toBe(
      "Escribe un correo válido.",
    );
  });

  it("explains a number below the minimum", () => {
    expect(getValidationMessage(input({ type: "number", min: "1" }, "0"))).toBe(
      "El valor debe ser como mínimo 1.",
    );
  });

  it("explains a number above the maximum", () => {
    expect(getValidationMessage(input({ type: "number", max: "100" }, "101"))).toBe(
      "El valor debe ser como máximo 100.",
    );
  });

  it("shows date limits as day/month/year", () => {
    expect(getValidationMessage(input({ type: "date", min: "2026-10-19" }, "2026-10-01"))).toBe(
      "El valor debe ser como mínimo 19/10/2026.",
    );
  });

  it("explains a decimal step", () => {
    expect(getValidationMessage(input({ type: "number", step: "0.01" }, "1.005"))).toBe(
      "Escribe un número con máximo 2 decimales.",
    );
  });

  it("explains an integer step", () => {
    expect(getValidationMessage(input({ type: "number", step: "5", min: "0" }, "7"))).toBe(
      "El valor debe ser un múltiplo de 5.",
    );
  });

  it("explains a number that cannot be parsed", () => {
    const element = withValidity(input({ type: "number" }), { badInput: true });
    expect(getValidationMessage(element)).toBe("Escribe un número válido.");
  });

  it("uses the title attribute to explain a pattern mismatch", () => {
    const element = input({ pattern: "[0-9]{10}", title: "10 dígitos numéricos" }, "123");
    expect(getValidationMessage(element)).toBe("Usa el formato solicitado: 10 dígitos numéricos.");
  });

  it("explains a pattern mismatch without a title", () => {
    expect(getValidationMessage(input({ pattern: "[0-9]{10}" }, "abc"))).toBe(
      "Usa el formato solicitado.",
    );
  });

  it("explains a value that is too short", () => {
    const element = withValidity(input({ minlength: "8" }, "abc"), { tooShort: true });
    expect(getValidationMessage(element)).toBe("Escribe al menos 8 caracteres.");
  });

  it("explains a value that is too long", () => {
    const element = withValidity(input({ maxlength: "10" }, "abc"), { tooLong: true });
    expect(getValidationMessage(element)).toBe("Escribe como máximo 10 caracteres.");
  });

  it("ignores a custom error set by the form", () => {
    const element = input({});
    element.setCustomValidity("Mensaje propio");
    expect(getValidationMessage(element)).toBeNull();
  });
});
