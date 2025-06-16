import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { type Db } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import type { CreateUserType } from "@/schemas/user.schema";
import { mockDbSetup } from "@/tests/config/mongodb.setup";

describe("MongoDbUserRepository", () => {
  let db: Db;
  let userRepository: MongoDbUserRepository;

  beforeEach(async () => {
    db = await mockDbSetup.getDb();
    userRepository = new MongoDbUserRepository(db);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.collection("users").deleteMany({});
  });

  describe("create", () => {
    it("should create a new user with minimal data", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "test@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "test@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.userId).toBe(userData.userId);
      expect(user.primaryEmail).toBe(userData.primaryEmail);
      expect(user.globalRole).toBe("student");
      expect(user.emails).toHaveLength(1);
      expect(user.emails[0].emailAddress).toBe("test@example.com");
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it("should create a user with password hash", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        firstName: "John",
        lastName: "Doe",
        primaryEmail: "john.doe@example.com",
        passwordHash: "hashed_password_123",
        globalRole: "student",
        emails: [
          {
            emailAddress: "john.doe@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await userRepository.create(userData);

      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.passwordHash).toBe("hashed_password_123");
      expect(user.emails[0].isVerified).toBe(true);
    });
  });

  describe("findByUserId", () => {
    it("should find user by userId", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "findme@example.com",
        globalRole: "teacher",
        emails: [
          {
            emailAddress: "findme@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByUserId(createdUser.userId);

      expect(foundUser).toBeDefined();
      expect(foundUser!.userId).toBe(createdUser.userId);
      expect(foundUser!.primaryEmail).toBe("findme@example.com");
      expect(foundUser!.globalRole).toBe("teacher");
    });

    it("should return null for non-existent userId", async () => {
      const foundUser = await userRepository.findByUserId("non-existent-id");
      expect(foundUser).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should find user by primary email", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "primary@example.com",
        globalRole: "admin",
        emails: [
          {
            emailAddress: "primary@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail("primary@example.com");

      expect(foundUser).toBeDefined();
      expect(foundUser!.primaryEmail).toBe("primary@example.com");
      expect(foundUser!.globalRole).toBe("admin");
    });

    it("should return null for non-existent email", async () => {
      const foundUser = await userRepository.findByEmail("nonexistent@example.com");
      expect(foundUser).toBeNull();
    });
  });

  describe("updatePassword", () => {
    it("should update user password hash", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "password-update@example.com",
        passwordHash: "old_hash",
        globalRole: "student",
        emails: [
          {
            emailAddress: "password-update@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await userRepository.create(userData);
      await userRepository.updatePassword(user.userId, "new_hash");

      const updatedUser = await userRepository.findByUserId(user.userId);
      expect(updatedUser!.passwordHash).toBe("new_hash");
      expect(updatedUser!.passwordLastChangedAt).toBeDefined();
    });
  });

  describe("findBySocialIdentity", () => {
    it("should find user by social identity", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "social@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "social@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [
          {
            provider: "google",
            providerUserId: "google123",
            email: "social@gmail.com",
            name: "Social User",
            linkedAt: new Date(),
          },
        ],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findBySocialIdentity("google", "google123");

      expect(foundUser).toBeDefined();
      expect(foundUser!.socialIdentities).toHaveLength(1);
      expect(foundUser!.socialIdentities[0].provider).toBe("google");
      expect(foundUser!.socialIdentities[0].providerUserId).toBe("google123");
    });
  });
});