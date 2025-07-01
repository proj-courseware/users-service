import { describe, it, expect, beforeEach } from "vitest";
import { MockDbAdminSettingRepository } from "@/repositories/mockdb/admin-setting.mockdb.repository";
import type { AdminSettingType } from "@/schemas/user.schema";

describe("MockDbAdminSettingRepository", () => {
  let repo: MockDbAdminSettingRepository;

  beforeEach(() => {
    repo = new MockDbAdminSettingRepository();
    repo.reset();
  });

  describe("create", () => {
    it("should create an admin setting and return it", async () => {
      const data = {
        key: "test.setting",
        value: "test value",
      };

      const setting = await repo.create(data);

      expect(setting.id).toBeDefined();
      expect(setting.key).toBe("test.setting");
      expect(setting.value).toBe("test value");
      expect(setting.description).toBeUndefined();
      expect(setting.updatedAt).toBeInstanceOf(Date);
    });

    it("should create an admin setting with description", async () => {
      const data = {
        key: "test.setting.with.desc",
        value: { config: "complex value" },
        description: "Test setting description",
      };

      const setting = await repo.create(data);

      expect(setting.id).toBeDefined();
      expect(setting.key).toBe("test.setting.with.desc");
      expect(setting.value).toEqual({ config: "complex value" });
      expect(setting.description).toBe("Test setting description");
      expect(setting.updatedAt).toBeInstanceOf(Date);
    });

    it("should handle complex value types", async () => {
      const complexValue = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
          string: "value",
        },
        null_value: null,
        number: 42,
      };

      const data = {
        key: "complex.setting",
        value: complexValue,
        description: "Complex value setting",
      };

      const setting = await repo.create(data);

      expect(setting.value).toEqual(complexValue);
    });

    it("should throw error for duplicate key", async () => {
      const data = {
        key: "duplicate.key",
        value: "first value",
      };

      await repo.create(data);

      const duplicateData = {
        key: "duplicate.key",
        value: "second value",
      };

      await expect(repo.create(duplicateData)).rejects.toThrow(
        "Admin setting with key 'duplicate.key' already exists",
      );
    });

    it("should generate unique IDs for each setting", async () => {
      const data1 = { key: "setting1", value: "value1" };
      const data2 = { key: "setting2", value: "value2" };

      const setting1 = await repo.create(data1);
      const setting2 = await repo.create(data2);

      expect(setting1.id).not.toBe(setting2.id);
    });
  });

  describe("findByKey", () => {
    it("should find existing admin setting by key", async () => {
      const data = {
        key: "findable.key",
        value: "findable value",
        description: "Test description",
      };

      const created = await repo.create(data);
      const found = await repo.findByKey("findable.key");

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.key).toBe("findable.key");
      expect(found?.value).toBe("findable value");
      expect(found?.description).toBe("Test description");
    });

    it("should return null for non-existing key", async () => {
      const found = await repo.findByKey("non.existing.key");

      expect(found).toBeNull();
    });

    it("should handle case-sensitive key matching", async () => {
      await repo.create({ key: "CaseSensitive", value: "test" });

      const found1 = await repo.findByKey("CaseSensitive");
      const found2 = await repo.findByKey("casesensitive");

      expect(found1).toBeDefined();
      expect(found2).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return empty array when no settings exist", async () => {
      const settings = await repo.findAll();

      expect(settings).toEqual([]);
    });

    it("should return all admin settings sorted by key", async () => {
      const settingsData = [
        { key: "z.last", value: "last value" },
        { key: "a.first", value: "first value" },
        { key: "m.middle", value: "middle value" },
      ];

      for (const data of settingsData) {
        await repo.create(data);
      }

      const allSettings = await repo.findAll();

      expect(allSettings).toHaveLength(3);
      expect(allSettings[0].key).toBe("a.first");
      expect(allSettings[1].key).toBe("m.middle");
      expect(allSettings[2].key).toBe("z.last");
    });

    it("should return settings with all properties", async () => {
      const data = {
        key: "full.setting",
        value: { nested: "object" },
        description: "Full setting with all props",
      };

      await repo.create(data);
      const settings = await repo.findAll();

      expect(settings).toHaveLength(1);
      expect(settings[0]).toMatchObject({
        key: "full.setting",
        value: { nested: "object" },
        description: "Full setting with all props",
      });
      expect(settings[0].id).toBeDefined();
      expect(settings[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("update", () => {
    it("should update existing admin setting", async () => {
      const originalData = {
        key: "updateable.key",
        value: "original value",
        description: "Original description",
      };

      const created = await repo.create(originalData);

      const updateData = {
        value: "updated value",
        description: "Updated description",
      };

      const updated = await repo.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.key).toBe("updateable.key");
      expect(updated?.value).toBe("updated value");
      expect(updated?.description).toBe("Updated description");
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        created.updatedAt.getTime(),
      );
    });

    it("should return null for non-existing id", async () => {
      const updateData = {
        value: "updated value",
      };

      const updated = await repo.update("non-existing-id", updateData);

      expect(updated).toBeNull();
    });

    it("should handle partial updates", async () => {
      const originalData = {
        key: "partial.update",
        value: "original value",
        description: "Original description",
      };

      const created = await repo.create(originalData);

      // Update only value
      const updated = await repo.update(created.id, { value: "new value" });

      expect(updated?.value).toBe("new value");
      expect(updated?.description).toBe("Original description");
      expect(updated?.key).toBe("partial.update");
    });

    it("should handle updating to undefined values", async () => {
      const originalData = {
        key: "remove.desc",
        value: "test value",
        description: "Original description",
      };

      const created = await repo.create(originalData);

      // Remove description
      const updated = await repo.update(created.id, {
        value: "updated value",
        description: undefined,
      });

      expect(updated?.description).toBeUndefined();
      expect(updated?.value).toBe("updated value");
    });

    it("should update complex value types", async () => {
      const originalData = {
        key: "complex.update",
        value: { old: "data" },
      };

      const created = await repo.create(originalData);

      const newComplexValue = {
        nested: {
          array: [4, 5, 6],
          updated: true,
        },
        timestamp: Date.now(),
      };

      const updated = await repo.update(created.id, { value: newComplexValue });

      expect(updated?.value).toEqual(newComplexValue);
    });
  });

  describe("delete", () => {
    it("should delete existing admin setting", async () => {
      const data = {
        key: "deletable.key",
        value: "deletable value",
      };

      const created = await repo.create(data);
      const deleted = await repo.delete(created.id);

      expect(deleted).toBe(true);

      // Verify it's actually deleted
      const found = await repo.findByKey("deletable.key");
      expect(found).toBeNull();
    });

    it("should return false for non-existing id", async () => {
      const deleted = await repo.delete("non-existing-id");

      expect(deleted).toBe(false);
    });

    it("should not affect other settings when deleting", async () => {
      const data1 = { key: "keep.this", value: "keep value" };
      const data2 = { key: "delete.this", value: "delete value" };

      const created1 = await repo.create(data1);
      const created2 = await repo.create(data2);

      await repo.delete(created2.id);

      const remaining = await repo.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].key).toBe("keep.this");
    });
  });

  describe("batchUpdate", () => {
    it("should update multiple settings", async () => {
      const settings = [
        { key: "batch.1", value: "value1" },
        { key: "batch.2", value: "value2" },
        { key: "batch.3", value: "value3" },
      ];

      const created = [];
      for (const setting of settings) {
        created.push(await repo.create(setting));
      }

      const updates = [
        { id: created[0].id, data: { value: "updated1" } },
        {
          id: created[2].id,
          data: { value: "updated3", description: "New desc" },
        },
      ];

      const results = await repo.batchUpdate(updates);

      expect(results).toHaveLength(2);
      expect(results[0]?.value).toBe("updated1");
      expect(results[1]?.value).toBe("updated3");
      expect(results[1]?.description).toBe("New desc");
    });

    it("should handle mix of valid and invalid IDs", async () => {
      const setting = await repo.create({ key: "batch.test", value: "test" });

      const updates = [
        { id: setting.id, data: { value: "updated" } },
        { id: "invalid-id", data: { value: "invalid" } },
      ];

      const results = await repo.batchUpdate(updates);

      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe("updated");
    });

    it("should return empty array for no valid updates", async () => {
      const updates = [
        { id: "invalid-id-1", data: { value: "invalid1" } },
        { id: "invalid-id-2", data: { value: "invalid2" } },
      ];

      const results = await repo.batchUpdate(updates);

      expect(results).toEqual([]);
    });

    it("should handle empty updates array", async () => {
      const results = await repo.batchUpdate([]);

      expect(results).toEqual([]);
    });
  });

  describe("reset", () => {
    it("should remove all settings", async () => {
      // Create multiple settings
      await repo.create({ key: "setting1", value: "value1" });
      await repo.create({ key: "setting2", value: "value2" });
      await repo.create({ key: "setting3", value: "value3" });

      let settings = await repo.findAll();
      expect(settings).toHaveLength(3);

      // Reset all settings
      repo.reset();

      settings = await repo.findAll();
      expect(settings).toEqual([]);
    });

    it("should allow creating new settings after reset", async () => {
      await repo.create({ key: "before.reset", value: "test" });
      repo.reset();

      const newSetting = await repo.create({
        key: "after.reset",
        value: "new test",
      });

      expect(newSetting.id).toBeDefined();
      expect(newSetting.key).toBe("after.reset");

      const allSettings = await repo.findAll();
      expect(allSettings).toHaveLength(1);
    });
  });

  describe("data persistence", () => {
    it("should maintain data integrity across operations", async () => {
      // Create initial setting
      const original = await repo.create({
        key: "persistence.test",
        value: { count: 0, active: true },
        description: "Persistence test",
      });

      // Update the setting
      const updated = await repo.update(original.id, {
        value: { count: 5, active: false },
      });

      // Verify update persisted
      const found = await repo.findByKey("persistence.test");
      expect(found?.value).toEqual({ count: 5, active: false });
      expect(found?.description).toBe("Persistence test");
      expect(found?.updatedAt.getTime()).toBeGreaterThan(
        original.updatedAt.getTime(),
      );
    });

    it("should handle concurrent-like operations", async () => {
      // Simulate multiple operations happening
      const promises = [
        repo.create({ key: "concurrent.1", value: "value1" }),
        repo.create({ key: "concurrent.2", value: "value2" }),
        repo.create({ key: "concurrent.3", value: "value3" }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(new Set(results.map((r) => r.id)).size).toBe(3); // All unique IDs

      const allSettings = await repo.findAll();
      expect(allSettings).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined values correctly", async () => {
      const setting = await repo.create({
        key: "null.test",
        value: null,
        description: undefined,
      });

      expect(setting.value).toBeNull();
      expect(setting.description).toBeUndefined();

      const found = await repo.findByKey("null.test");
      expect(found?.value).toBeNull();
      expect(found?.description).toBeUndefined();
    });

    it("should handle empty string values", async () => {
      const setting = await repo.create({
        key: "empty.string",
        value: "",
        description: "",
      });

      expect(setting.value).toBe("");
      expect(setting.description).toBe("");
    });

    it("should handle boolean values", async () => {
      const setting = await repo.create({
        key: "boolean.test",
        value: false,
      });

      expect(setting.value).toBe(false);
      expect(typeof setting.value).toBe("boolean");
    });

    it("should handle number values including zero", async () => {
      const setting = await repo.create({
        key: "number.test",
        value: 0,
      });

      expect(setting.value).toBe(0);
      expect(typeof setting.value).toBe("number");
    });
  });
});
