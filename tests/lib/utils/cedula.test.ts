import { describe, expect, it } from "vitest";
import { isValidCedulaEcuatoriana } from "@/lib/utils/cedula";

describe("cédula ecuatoriana (módulo 10)", () => {
  it("acepta cédulas con dígito verificador correcto", () => {
    expect(isValidCedulaEcuatoriana("1710034065")).toBe(true);
    expect(isValidCedulaEcuatoriana("0901234567")).toBe(true);
  });
  it("rechaza dígito verificador, provincia, tercer dígito y formato inválidos", () => {
    expect(isValidCedulaEcuatoriana("1234567890")).toBe(false);
    expect(isValidCedulaEcuatoriana("1710034066")).toBe(false);
    expect(isValidCedulaEcuatoriana("9900000000")).toBe(false);
    expect(isValidCedulaEcuatoriana("1760034065")).toBe(false);
    expect(isValidCedulaEcuatoriana("171003406")).toBe(false);
    expect(isValidCedulaEcuatoriana("17100340655")).toBe(false);
    expect(isValidCedulaEcuatoriana("17100a4065")).toBe(false);
  });
});
