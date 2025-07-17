import { describe, it, expect, beforeEach } from "vitest";
import { MockDbRefreshTokenRepository } from "@/repositories/mockdb/refresh-token.mockdb.repository";
import type { CreateRefreshTokenType } from "@/schemas/user.schema";

function getTestToken(
  overrides: Partial<CreateRefreshTokenType> = {}
): CreateRefreshTokenType {
  return {
    tokenHash: "hash123",
    userId: "user1",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    isRevoked: false,
    ...overrides,
  };
}

describe("MockDbRefreshTokenRepository", () => {
  let repo: MockDbRefreshTokenRepository;

  beforeEach(() => {
    repo = new MockDbRefreshTokenRepository();
  });

  describe("create", () => {
    it("creates and returns a refresh token", async () => {
      const token = await repo.create(getTestToken());
      expect(token.id).toBeDefined();
      expect(token.tokenHash).toBe("hash123");
      expect(token.userId).toBe("user1");
      expect(token.isRevoked).toBe(false);
      expect(token.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findByTokenHash", () => {
    it("finds a token by tokenHash", async () => {
      await repo.create(getTestToken({ tokenHash: "findme" }));
      const found = await repo.findByTokenHash("findme");
      expect(found).not.toBeNull();
      expect(found!.tokenHash).toBe("findme");
    });

    it("returns null for non-existent tokenHash", async () => {
      const found = await repo.findByTokenHash("nope");
      expect(found).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("finds tokens by userId", async () => {
      await repo.create(getTestToken({ userId: "userA", tokenHash: "a1" }));
      await repo.create(getTestToken({ userId: "userA", tokenHash: "a2" }));
      await repo.create(getTestToken({ userId: "userB", tokenHash: "b1" }));
      const tokens = await repo.findByUserId("userA");
      expect(tokens).toHaveLength(2);
      expect(tokens.map((t) => t.tokenHash).sort()).toEqual(["a1", "a2"]);
    });
  });

  describe("revokeById", () => {
    it("revokes a token by id", async () => {
      const token = await repo.create(getTestToken({ tokenHash: "torevoke" }));
      await repo.revokeById(token.id);
      const found = await repo.findByTokenHash("torevoke");
      expect(found!.isRevoked).toBe(true);
    });
  });

  describe("revokeAllForUser", () => {
    it("revokes all tokens for a user", async () => {
      await repo.create(getTestToken({ userId: "userX", tokenHash: "x1" }));
      await repo.create(getTestToken({ userId: "userX", tokenHash: "x2" }));
      await repo.create(getTestToken({ userId: "userY", tokenHash: "y1" }));
      await repo.revokeAllForUser("userX");
      const tokens = await repo.findByUserId("userX");
      expect(tokens.every((t) => t.isRevoked)).toBe(true);
      const other = await repo.findByUserId("userY");
      expect(other[0].isRevoked).toBe(false);
    });
  });

  describe("listActiveSessions", () => {
    it("lists only active sessions (not revoked, not expired)", async () => {
      const now = new Date();
      // Active
      await repo.create(
        getTestToken({
          userId: "userZ",
          tokenHash: "active1",
          expiresAt: new Date(now.getTime() + 10000),
        })
      );
      // Revoked
      const revoked = await repo.create(
        getTestToken({
          userId: "userZ",
          tokenHash: "revoked",
          expiresAt: new Date(now.getTime() + 10000),
        })
      );
      await repo.revokeById(revoked.id);
      // Expired
      await repo.create(
        getTestToken({
          userId: "userZ",
          tokenHash: "expired",
          expiresAt: new Date(now.getTime() - 10000),
        })
      );
      const sessions = await repo.listActiveSessions("userZ");
      expect(sessions).toHaveLength(1);
      expect(sessions[0].tokenHash).toBe("active1");
    });
  });
});
