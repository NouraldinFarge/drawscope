import { describe, expect, it } from "vitest";
import { validatePowerballTicket } from "./ticketValidation";

describe("validatePowerballTicket", () => {
  it("accepts a complete valid ticket", () => {
    expect(validatePowerballTicket(["1", "2", "3", "4", "69", "26"])).toEqual({
      valid: true,
      ticket: { mainNumbers: [1, 2, 3, 4, 69], specialNumber: 26 },
    });
  });

  it("rejects duplicate, missing, decimal, and out-of-range values", () => {
    expect(validatePowerballTicket(["1", "1", "3", "4", "5", "6"])).toMatchObject({
      valid: false,
      invalidIndices: [0, 1],
    });
    expect(validatePowerballTicket(["1", "2", "", "4", "5", "6"])).toMatchObject({
      valid: false,
      invalidIndices: [2],
    });
    expect(validatePowerballTicket(["1", "2", "3.5", "4", "5", "6"])).toMatchObject({
      valid: false,
      invalidIndices: [2],
    });
    expect(validatePowerballTicket(["1", "2", "3", "4", "70", "27"])).toMatchObject({
      valid: false,
      invalidIndices: [4, 5],
    });
  });
});
