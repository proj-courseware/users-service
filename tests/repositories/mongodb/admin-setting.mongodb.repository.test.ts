import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { MongoDbAdminSettingRepository } from "@/repositories/mongodb/admin-setting.mongodb.repository";
import type { MongoClient, Db } from "mongodb";
import type { AdminSettingType } from "@/schemas/user.schema";
import { InternalServerError } from "@/errors";
// Import global test functions

describe("MongoDbAdminSettingRepository", () => {
  let repository: MongoDbAdminSettingRepository;
  let testClient: MongoClient;
  let testDb: Db;

  beforeAll(async () => {
    // Set up test database connection using memory server
    const { db, client } = await global.setupTestDatabase();
    testDb = db;
    testClient = client;
  });

  afterAll(async () => {
    // Clean up test database connection
    await global.cleanupTestDatabase(testClient);
  });

  beforeEach(() => {
    // Create a new repository instance for each test
    repository = new MongoDbAdminSettingRepository();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await testDb.collection("adminSettings").deleteMany({});
  });

  describe("create", () => {
    it("should create a new admin setting with minimal data", async () => {
      const settingData = {
        key: "test.setting",
        value: "test value",
      };

      const result = await repository.create(settingData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.key).toBe(settingData.key);
      expect(result.value).toBe(settingData.value);
      expect(result.description).toBeUndefined();
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a new admin setting with description", async () => {
      const settingData = {
        key: "test.setting.with.desc",
        value: { config: "complex value" },
        description: "Test setting description",
      };

      const result = await repository.create(settingData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.key).toBe(settingData.key);
      expect(result.value).toEqual(settingData.value);
      expect(result.description).toBe(settingData.description);
      expect(result.updatedAt).toBeInstanceOf(Date);
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

      const settingData = {
        key: "complex.setting",
        value: complexValue,
        description: "Complex value setting",
      };

      const result = await repository.create(settingData);

      expect(result.value).toEqual(complexValue);
    });

    it("should throw error for duplicate key", async () => {
      const settingData = {
        key: "duplicate.key",
        value: "first value",
      };

      // Create first setting
      await repository.create(settingData);

      // Attempt to create duplicate
      const duplicateData = {
        key: "duplicate.key",
        value: "second value",
      };

      await expect(repository.create(duplicateData)).rejects.toThrow(
        InternalServerError,
      );
    });

    it("should handle database connection errors", async () => {
      // Create a repository that will fail to get collection
      const failingRepository = new MongoDbAdminSettingRepository();

      // Mock the getCollection method to fail
      const originalGetCollection = (failingRepository as any).getCollection;
      (failingRepository as any).getCollection = async () => {
        throw new Error("Database connection failed");
      };

      const settingData = {
        key: "test.key",
        value: "test value",
      };

      await expect(failingRepository.create(settingData)).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("findByKey", () => {
    it("should find existing admin setting by key", async () => {
      const settingData = {
        key: "findable.key",
        value: "findable value",
        description: "Test description",
      };

      const created = await repository.create(settingData);
      const found = await repository.findByKey(settingData.key);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.key).toBe(settingData.key);
      expect(found?.value).toBe(settingData.value);
      expect(found?.description).toBe(settingData.description);
    });

    it("should return null for non-existing key", async () => {
      const found = await repository.findByKey("non.existing.key");

      expect(found).toBeNull();
    });

    it("should handle database errors", async () => {
      // Mock the getCollection method to fail
      const originalGetCollection = (repository as any).getCollection;
      (repository as any).getCollection = async () => {
        throw new Error("Database connection failed");
      };

      await expect(repository.findByKey("any.key")).rejects.toThrow(
        InternalServerError,
      );

      // Restore original method
      (repository as any).getCollection = originalGetCollection;
    });
  });

  describe("findAll", () => {
    it("should return empty array when no settings exist", async () => {
      const settings = await repository.findAll();

      expect(settings).toEqual([]);
    });

    it("should return all admin settings sorted by key", async () => {
      const settingsData = [
        { key: "z.last", value: "last value" },
        { key: "a.first", value: "first value" },
        { key: "m.middle", value: "middle value" },
      ];

      // Create settings in random order
      for (const data of settingsData) {
        await repository.create(data);
      }

      const allSettings = await repository.findAll();

      expect(allSettings).toHaveLength(3);
      expect(allSettings[0].key).toBe("a.first");
      expect(allSettings[1].key).toBe("m.middle");
      expect(allSettings[2].key).toBe("z.last");
    });

    it("should handle database errors", async () => {
      // Mock the getCollection method to fail
      const originalGetCollection = (repository as any).getCollection;
      (repository as any).getCollection = async () => {
        throw new Error("Database connection failed");
      };

      await expect(repository.findAll()).rejects.toThrow(InternalServerError);

      // Restore original method
      (repository as any).getCollection = originalGetCollection;
    });
  });

  describe("update", () => {
    it("should update existing admin setting", async () => {
      const originalData = {
        key: "updateable.key",
        value: "original value",
        description: "Original description",
      };

      const created = await repository.create(originalData);

      const updateData = {
        value: "updated value",
        description: "Updated description",
      };

      const updated = await repository.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.key).toBe(originalData.key);
      expect(updated?.value).toBe(updateData.value);
      expect(updated?.description).toBe(updateData.description);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        created.updatedAt.getTime(),
      );
    });

    it("should return null for non-existing id", async () => {
      const updateData = {
        value: "updated value",
      };

      const updated = await repository.update(
        "507f1f77bcf86cd799439011",
        updateData,
      );

      expect(updated).toBeNull();
    });

    it("should handle partial updates", async () => {
      const originalData = {
        key: "partial.update",
        value: "original value",
        description: "Original description",
      };

      const created = await repository.create(originalData);

      // Update only value
      const updated = await repository.update(created.id, {
        value: "new value",
      });

      expect(updated?.value).toBe("new value");
      expect(updated?.description).toBe(originalData.description);
    });

    it("should handle database errors", async () => {
      const originalGetCollection = (repository as any).getCollection;
      (repository as any).getCollection = async () => {
        throw new Error("Database connection failed");
      };

      await expect(
        repository.update("507f1f77bcf86cd799439011", { value: "test" }),
      ).rejects.toThrow(InternalServerError);

      (repository as any).getCollection = originalGetCollection;
    });
  });

  describe("delete", () => {
    it("should delete existing admin setting", async () => {
      const settingData = {
        key: "deletable.key",
        value: "deletable value",
      };

      const created = await repository.create(settingData);
      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify it's actually deleted
      const found = await repository.findByKey(settingData.key);
      expect(found).toBeNull();
    });

    it("should return false for non-existing id", async () => {
      const deleted = await repository.delete("507f1f77bcf86cd799439011");

      expect(deleted).toBe(false);
    });

    it("should handle database errors", async () => {
      const originalGetCollection = (repository as any).getCollection;
      (repository as any).getCollection = async () => {
        throw new Error("Database connection failed");
      };

      await expect(
        repository.delete("507f1f77bcf86cd799439011"),
      ).rejects.toThrow(InternalServerError);

      (repository as any).getCollection = originalGetCollection;
    });
  });

  describe("batchUpdate", () => {
    it("should update multiple settings", async () => {
      // Create initial settings
      const settings = [
        { key: "batch.1", value: "value1" },
        { key: "batch.2", value: "value2" },
        { key: "batch.3", value: "value3" },
      ];

      const created = [];
      for (const setting of settings) {
        created.push(await repository.create(setting));
      }

      // Prepare batch updates
      const updates = [
        { id: created[0].id, data: { value: "updated1" } },
        {
          id: created[2].id,
          data: { value: "updated3", description: "New desc" },
        },
      ];

      const results = await repository.batchUpdate(updates);

      expect(results).toHaveLength(2);
      expect(results[0]?.value).toBe("updated1");
      expect(results[1]?.value).toBe("updated3");
      expect(results[1]?.description).toBe("New desc");
    });

    it("should handle mix of valid and invalid IDs", async () => {
      const setting = await repository.create({
        key: "batch.test",
        value: "test",
      });

      const updates = [
        { id: setting.id, data: { value: "updated" } },
        { id: "507f1f77bcf86cd799439011", data: { value: "invalid" } },
      ];

      const results = await repository.batchUpdate(updates);

      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe("updated");
    });

    it("should handle database errors", async () => {
      const originalGetCollection = (repository as any).getCollection;
      (repository as any).getCollection = async () => {
        throw new Error("Database connection failed");
      };

      await expect(repository.batchUpdate([])).rejects.toThrow(
        InternalServerError,
      );

      (repository as any).getCollection = originalGetCollection;
    });
  });

  describe("documentToEntity", () => {
    it("should convert MongoDB document to entity correctly", () => {
      const document = {
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        key: "test.key",
        value: "test value",
        description: "test description",
        updatedAt: new Date(),
      };

      const entity = (repository as any).documentToEntity(document);

      expect(entity.id).toBe("507f1f77bcf86cd799439011");
      expect(entity.key).toBe(document.key);
      expect(entity.value).toBe(document.value);
      expect(entity.description).toBe(document.description);
      expect(entity.updatedAt).toBe(document.updatedAt);
    });

    it("should handle document without description", () => {
      const document = {
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        key: "test.key",
        value: "test value",
        updatedAt: new Date(),
      };

      const entity = (repository as any).documentToEntity(document);

      expect(entity.description).toBeUndefined();
    });
  });

  describe("index creation", () => {
    it("should create unique index on key field", async () => {
      // The unique index should be created during getCollection call
      await repository.create({ key: "index.test", value: "test" });

      // Try to create duplicate - should fail due to unique index
      await expect(
        repository.create({ key: "index.test", value: "duplicate" }),
      ).rejects.toThrow(InternalServerError);
    });
  });
});
