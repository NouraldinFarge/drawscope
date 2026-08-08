import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { analysisResultSchema, drawingSchema } from "../src/index";

const directory = resolve(process.cwd(), "packages/contracts");
const schema = JSON.parse(readFileSync(`${directory}/schemas/v1/drawing.schema.json`, "utf8"));
const valid = JSON.parse(readFileSync(`${directory}/examples/valid/drawing.json`, "utf8"));
const invalid = JSON.parse(
  readFileSync(`${directory}/examples/invalid/drawing-extra-property.json`, "utf8"),
);
const ajv = new Ajv2020({ strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("drawing contract", () => {
  it("accepts the shared valid fixture in JSON Schema and Zod", () => {
    expect(validate(valid)).toBe(true);
    expect(drawingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects additional properties at both adapters", () => {
    expect(validate(invalid)).toBe(false);
    expect(drawingSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects additional properties in nested analysis results", () => {
    const dateRangeResultSchema = analysisResultSchema.pick({ date_range: true });
    const validResult = {
      date_range: {
        start: "2026-01-01",
        end: "2026-01-01",
      },
    };
    const invalidResult = {
      date_range: {
        ...validResult.date_range,
        unexpected: true,
      },
    };

    expect(dateRangeResultSchema.safeParse(validResult).success).toBe(true);
    expect(dateRangeResultSchema.safeParse(invalidResult).success).toBe(false);
  });
});
