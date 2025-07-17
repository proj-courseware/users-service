import { describe, it, expect } from "vitest";
import { globalRoleSchema, noteRoleSchema } from "@/schemas/roles.schemas";

describe("globalRoleSchema", () => {
  it("accepts 'admin' and 'student' and 'teacher'", () => {
    expect(globalRoleSchema.parse("admin")).toBe("admin");
    expect(globalRoleSchema.parse("student")).toBe("student");
    expect(globalRoleSchema.parse("teacher")).toBe("teacher");
  });
  it("rejects invalid role", () => {
    expect(() => globalRoleSchema.parse("bad")).toThrow();
  });
});

describe("noteRoleSchema", () => {
  it("accepts 'owner' and 'viewer'", () => {
    expect(noteRoleSchema.parse("owner")).toBe("owner");
    expect(noteRoleSchema.parse("viewer")).toBe("viewer");
  });
  it("rejects invalid note role", () => {
    expect(() => noteRoleSchema.parse("bad")).toThrow();
  });
});
