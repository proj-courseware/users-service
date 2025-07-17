import { describe, it, expect } from "vitest";
import { globalRoleSchema } from "@/schemas/roles.schema";

describe("globalRoleSchema", () => {
  it("should parse valid roles", () => {
    expect(globalRoleSchema.parse("student")).toBe("student");
    expect(globalRoleSchema.parse("teacher")).toBe("teacher");
    expect(globalRoleSchema.parse("admin")).toBe("admin");
  });

  it("should throw for invalid roles", () => {
    expect(() => globalRoleSchema.parse("bad" as any)).toThrow();
  });
});
