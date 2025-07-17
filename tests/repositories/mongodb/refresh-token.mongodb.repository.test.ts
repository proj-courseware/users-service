import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { MongoDbRefreshTokenRepository } from "@/repositories/mongodb/refresh-token.mongodb.repository";
import type { MongoClient, Db } from "mongodb";
import type { CreateRefreshTokenType } from "@/schemas/user.schema";

function getTestToken(
  overrides: Partial<CreateRefreshTokenType> = {},
): CreateRefreshTokenType {
  return {
    tokenHash: "hash123",
    userId: "user1",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    isRevoked: false,
    ...overrides,
  };
}

declare const global: any;

describe("MongoDbRefreshTokenRepository", () => {
  let repository: MongoDbRefreshTokenRepository;
  let testClient: MongoClient;
  let testDb: Db;

  beforeAll(async () => {
    const { db, client } = await global.setupTestDatabase();
    testDb = db;
    testClient = client;
  });

  afterAll(async () => {
    await global.cleanupTestDatabase(testClient);
  });

  beforeEach(() => {
    repository = new MongoDbRefreshTokenRepository();
  });

  afterEach(async () => {
    await testDb.collection("refresh_tokens").deleteMany({});
  });

  describe("create", () => {
    it("should create and return a refresh token", async () => {
      const token = await repository.create(getTestToken());
      expect(token.id).toBeDefined();
      expect(token.tokenHash).toBe("hash123");
      expect(token.userId).toBe("user1");
      expect(token.isRevoked).toBe(false);
      expect(token.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findByTokenHash", () => {
    it("should find a token by tokenHash", async () => {
      await repository.create(getTestToken({ tokenHash: "findme" }));
      const found = await repository.findByTokenHash("findme");
      expect(found).not.toBeNull();
      expect(found!.tokenHash).toBe("findme");
    });

    it("should return null for non-existent tokenHash", async () => {
      const found = await repository.findByTokenHash("nope");
      expect(found).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("should find tokens by userId", async () => {
      await repository.create(
        getTestToken({ userId: "userA", tokenHash: "a1" }),
      );
      await repository.create(
        getTestToken({ userId: "userA", tokenHash: "a2" }),
      );
      await repository.create(
        getTestToken({ userId: "userB", tokenHash: "b1" }),
      );
      const tokens = await repository.findByUserId("userA");
      expect(tokens).toHaveLength(2);
      expect(tokens.map((t) => t.tokenHash).sort()).toEqual(["a1", "a2"]);
    });
  });

  describe("revokeById", () => {
    it("should revoke a token by id", async () => {
      const token = await repository.create(
        getTestToken({ tokenHash: "torevoke" }),
      );
      await repository.revokeById(token.id);
      const found = await repository.findByTokenHash("torevoke");
      expect(found!.isRevoked).toBe(true);
    });
  });

  describe("revokeAllForUser", () => {
    it("should revoke all tokens for a user", async () => {
      await repository.create(
        getTestToken({ userId: "userX", tokenHash: "x1" }),
      );
      await repository.create(
        getTestToken({ userId: "userX", tokenHash: "x2" }),
      );
      await repository.create(
        getTestToken({ userId: "userY", tokenHash: "y1" }),
      );
      await repository.revokeAllForUser("userX");
      const tokens = await repository.findByUserId("userX");
      expect(tokens.every((t) => t.isRevoked)).toBe(true);
      const other = await repository.findByUserId("userY");
      expect(other[0].isRevoked).toBe(false);
    });
  });

  describe("listActiveSessions", () => {
    it("should list only active sessions (not revoked, not expired)", async () => {
      const now = new Date();
      // Active
      await repository.create(
        getTestToken({
          userId: "userZ",
          tokenHash: "active1",
          expiresAt: new Date(now.getTime() + 10000),
        }),
      );
      // Revoked
      const revoked = await repository.create(
        getTestToken({
          userId: "userZ",
          tokenHash: "revoked",
          expiresAt: new Date(now.getTime() + 10000),
        }),
      );
      await repository.revokeById(revoked.id);
      // Expired
      await repository.create(
        getTestToken({
          userId: "userZ",
          tokenHash: "expired",
          expiresAt: new Date(now.getTime() - 10000),
        }),
      );
      const sessions = await repository.listActiveSessions("userZ");
      expect(sessions).toHaveLength(1);
      expect(sessions[0].tokenHash).toBe("active1");
    });
  });
});
