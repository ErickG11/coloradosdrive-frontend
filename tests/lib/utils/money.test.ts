import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyFromCents } from "@/lib/utils/money";

describe("formatMoney", () => {
  it("usa punto decimal y coma de miles en USD", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(190)).toBe("$190.00");
    expect(formatMoney(175.25)).toBe("$175.25");
    expect(formatMoney(1000)).toBe("$1,000.00");
    expect(formatMoney(9999.99)).toBe("$9,999.99");
  });

  it("maneja negativos", () => {
    expect(formatMoney(-5)).toBe("-$5.00");
  });

  it("devuelve un guion para null, undefined y NaN sin lanzar", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney(Number.NaN)).toBe("—");
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatMoneyFromCents", () => {
  it("convierte centavos a dólares", () => {
    expect(formatMoneyFromCents(0)).toBe("$0.00");
    expect(formatMoneyFromCents(5)).toBe("$0.05");
    expect(formatMoneyFromCents(19000)).toBe("$190.00");
    expect(formatMoneyFromCents(100000)).toBe("$1,000.00");
    expect(formatMoneyFromCents(999999)).toBe("$9,999.99");
    expect(formatMoneyFromCents(null)).toBe("—");
  });
});
