import { describe, it, expect, beforeEach } from "vitest";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import type {
  CreateUserType,
  EmailObjectType,
  SocialIdentityObjectType,
} from "@/schemas/user.schema";

describe("MockDbUserRepository", () => {
  let repo: MockDbUserRepository;

  beforeEach(() => {
    repo = new MockDbUserRepository();
    repo.clear();
  });

  describe("create", () => {
    it("creates a user and returns it", async () => {
      const data: CreateUserType = {
        primaryEmail: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      };
      const user = await repo.create(data);

      expect(user.id).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.primaryEmail).toBe("test@example.com");
      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.globalRole).toBe("student");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.emails).toHaveLength(1);
      expect(user.emails[0].emailAddress).toBe("test@example.com");
      expect(user.emails[0].isVerified).toBe(false);
      expect(user.socialIdentities).toHaveLength(0);
    });

    it("generates id when creating user", async () => {
      const data: CreateUserType = {
        primaryEmail: "test@example.com",
      };
      const user = await repo.create(data);

      expect(user.id).toBeDefined();
      expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("assigns unique id when creating user", async () => {
      const data: CreateUserType = {
        primaryEmail: "test@example.com",
      };
      const user1 = await repo.create(data);
      const user2 = await repo.create({
        primaryEmail: "test2@example.com",
      });

      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe("findById", () => {
    it("returns user by id", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
      });

      const found = await repo.findById(user.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
    });

    it("returns null if not found", async () => {
      const found = await repo.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("returns user by primary email", async () => {
      await repo.create({
        primaryEmail: "primary@example.com",
      });

      const found = await repo.findByEmail("primary@example.com");
      expect(found).not.toBeNull();
      expect(found!.primaryEmail).toBe("primary@example.com");
    });

    it("returns user by email in emails array", async () => {
      const user = await repo.create({
        primaryEmail: "primary@example.com",
        emails: [
          {
            emailAddress: "primary@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
          {
            emailAddress: "secondary@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      });

      const found = await repo.findByEmail("secondary@example.com");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
    });

    it("returns null for non-existent email", async () => {
      const found = await repo.findByEmail("nonexistent@example.com");
      expect(found).toBeNull();
    });
  });

  describe("findById", () => {
    it("returns user by id", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
      });

      const found = await repo.findById(user.id!);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
    });

    it("returns null if not found", async () => {
      const found = await repo.findById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("update", () => {
    it("updates user fields", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
        firstName: "John",
      });

      // Wait for a bit to ensure updatedAt changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await repo.update(user.id, {
        firstName: "Jane",
        lastName: "Smith",
      });

      expect(updated.firstName).toBe("Jane");
      expect(updated.lastName).toBe("Smith");
      expect(updated.updatedAt).not.toEqual(user.updatedAt);
    });

    it("throws error for non-existent user", async () => {
      await expect(
        repo.update("non-existent", { firstName: "Test" }),
      ).rejects.toThrow("User not found");
    });
  });

  describe("delete", () => {
    it("deletes user", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
      });

      await repo.delete(user.id);

      const found = await repo.findById(user.id);
      expect(found).toBeNull();
    });

    it("throws error when deleting non-existent user", async () => {
      await expect(repo.delete("non-existent")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("findBySocialIdentity", () => {
    it("finds user by social identity", async () => {
      const socialIdentity: SocialIdentityObjectType = {
        provider: "google",
        providerUserId: "google123",
        linkedAt: new Date(),
      };

      const user = await repo.create({
        primaryEmail: "test@example.com",
        socialIdentities: [socialIdentity],
      });

      const found = await repo.findBySocialIdentity("google", "google123");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
    });

    it("returns null for non-existent social identity", async () => {
      const found = await repo.findBySocialIdentity("google", "nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findByVerificationToken", () => {
    it("finds user by verification token", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
        emails: [
          {
            emailAddress: "test@example.com",
            isVerified: false,
            addedAt: new Date(),
            verificationToken: "token123",
            verificationTokenExpiresAt: new Date(
              Date.now() + 24 * 60 * 60 * 1000,
            ),
          },
        ],
      });

      const found = await repo.findByVerificationToken("token123");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
    });

    it("returns null for non-existent token", async () => {
      const found = await repo.findByVerificationToken("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("addEmail", () => {
    it("adds email to user", async () => {
      const user = await repo.create({
        primaryEmail: "primary@example.com",
      });

      const newEmail: EmailObjectType = {
        emailAddress: "secondary@example.com",
        isVerified: false,
        addedAt: new Date(),
      };

      await repo.addEmail(user.id, newEmail);

      const updated = await repo.findById(user.id);
      expect(updated!.emails).toHaveLength(2);
      expect(
        updated!.emails.some((e) => e.emailAddress === "secondary@example.com"),
      ).toBe(true);
    });

    it("throws error for duplicate email", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
      });

      const duplicateEmail: EmailObjectType = {
        emailAddress: "test@example.com",
        isVerified: false,
        addedAt: new Date(),
      };

      await expect(repo.addEmail(user.id, duplicateEmail)).rejects.toThrow(
        "Email already exists for this user",
      );
    });
  });

  describe("verifyEmail", () => {
    it("verifies email address", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
        emails: [
          {
            emailAddress: "test@example.com",
            isVerified: false,
            addedAt: new Date(),
            verificationToken: "token123",
          },
        ],
      });

      await repo.verifyEmail(user.id, "test@example.com");

      const updated = await repo.findById(user.id);
      const email = updated!.emails.find(
        (e) => e.emailAddress === "test@example.com",
      );
      expect(email!.isVerified).toBe(true);
      expect(email!.verificationToken).toBeUndefined();
    });
  });

  describe("linkSocialIdentity", () => {
    it("links social identity to user", async () => {
      const user = await repo.create({
        primaryEmail: "test@example.com",
      });

      const socialIdentity: SocialIdentityObjectType = {
        provider: "github",
        providerUserId: "github123",
        linkedAt: new Date(),
      };

      await repo.linkSocialIdentity(user.id, socialIdentity);

      const updated = await repo.findById(user.id);
      expect(updated!.socialIdentities).toHaveLength(1);
      expect(updated!.socialIdentities[0].provider).toBe("github");
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await repo.create({
        primaryEmail: "admin@example.com",
        firstName: "Admin",
        globalRole: "admin",
      });
      await repo.create({
        primaryEmail: "teacher@example.com",
        firstName: "Teacher",
        globalRole: "teacher",
      });
      await repo.create({
        primaryEmail: "student@example.com",
        firstName: "Student",
        globalRole: "student",
      });
    });

    it("returns all users with default pagination", async () => {
      const result = await repo.findAll({});
      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
    });

    it("filters users by role", async () => {
      const result = await repo.findAll({ role: "admin" });
      expect(result.data.length).toBe(1);
      expect(result.data[0].globalRole).toBe("admin");
    });

    it("searches users by name", async () => {
      const result = await repo.findAll({ search: "Teacher" });
      expect(result.data.length).toBe(1);
      expect(result.data[0].firstName).toBe("Teacher");
    });

    it("searches users by email", async () => {
      const result = await repo.findAll({ search: "student@example.com" });
      expect(result.data.length).toBe(1);
      expect(result.data[0].primaryEmail).toBe("student@example.com");
    });

    it("paginates results", async () => {
      const result = await repo.findAll({ page: 2, limit: 2 });
      expect(result.data.length).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it("sorts users", async () => {
      const result = await repo.findAll({
        sortBy: "firstName",
        sortOrder: "desc",
      });
      expect(result.data[0].firstName! >= result.data[1].firstName!).toBe(true);
    });
  });
});
