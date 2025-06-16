import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import type { MongoClient, Db } from "mongodb";
import type {
  CreateUserType,
  UserQueryParamsType,
} from "@/schemas/user.schema";
import { v4 as uuidv4 } from "uuid";

describe("MongoDbUserRepository", () => {
  let repository: MongoDbUserRepository;
  let testClient: MongoClient;
  let testDb: Db;

  beforeAll(async () => {
    // Set up test database connection using memory server
    const { db, client } = await setupTestDatabase();
    testDb = db;
    testClient = client;
  });

  afterAll(async () => {
    // Clean up test database connection
    await cleanupTestDatabase(testClient);
  });

  beforeEach(() => {
    // Create a new repository instance for each test
    repository = new MongoDbUserRepository();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await testDb.collection("users").deleteMany({});
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

      const user = await repository.create(userData);

      expect(user).toBeDefined();
      expect(user.userId).toBe(userData.userId);
      expect(user.primaryEmail).toBe(userData.primaryEmail);
      expect(user.globalRole).toBe("student");
      expect(user.emails).toHaveLength(1);
      expect(user.emails[0].emailAddress).toBe("test@example.com");
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user._id).toBeDefined();
    });

    it("should create a user with password hash and all fields", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        firstName: "John",
        lastName: "Doe",
        primaryEmail: "john.doe@example.com",
        passwordHash: "hashed_password_123",
        globalRole: "teacher",
        emails: [
          {
            emailAddress: "john.doe@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [
          {
            provider: "google",
            providerUserId: "google123",
            email: "john.doe@gmail.com",
            name: "John Doe",
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        passwordLastChangedAt: new Date(),
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await repository.create(userData);

      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.passwordHash).toBe("hashed_password_123");
      expect(user.globalRole).toBe("teacher");
      expect(user.emails[0].isVerified).toBe(true);
      expect(user.socialIdentities).toHaveLength(1);
      expect(user.socialIdentities[0].provider).toBe("google");
      expect(user.lastLoginAt).toBeDefined();
      expect(user.passwordLastChangedAt).toBeDefined();
    });

    it("should generate userId if not provided", async () => {
      const userData: CreateUserType = {
        userId: "",
        primaryEmail: "auto-id@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "auto-id@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await repository.create(userData);

      expect(user.userId).toBeDefined();
      expect(user.userId).not.toBe("");
      expect(user.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
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

      const createdUser = await repository.create(userData);
      const foundUser = await repository.findByUserId(createdUser.userId);

      expect(foundUser).toBeDefined();
      expect(foundUser!.userId).toBe(createdUser.userId);
      expect(foundUser!.primaryEmail).toBe("findme@example.com");
      expect(foundUser!.globalRole).toBe("teacher");
    });

    it("should return null for non-existent userId", async () => {
      const foundUser = await repository.findByUserId("non-existent-id");
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

      await repository.create(userData);
      const foundUser = await repository.findByEmail("primary@example.com");

      expect(foundUser).toBeDefined();
      expect(foundUser!.primaryEmail).toBe("primary@example.com");
      expect(foundUser!.globalRole).toBe("admin");
    });

    it("should find user by email in emails array", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "primary@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "primary@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
          {
            emailAddress: "secondary@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      await repository.create(userData);
      const foundUser = await repository.findByEmail("secondary@example.com");

      expect(foundUser).toBeDefined();
      expect(foundUser!.primaryEmail).toBe("primary@example.com");
      expect(foundUser!.emails).toHaveLength(2);
    });

    it("should return null for non-existent email", async () => {
      const foundUser = await repository.findByEmail("nonexistent@example.com");
      expect(foundUser).toBeNull();
    });
  });

  describe("update", () => {
    it("should update user fields", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        firstName: "John",
        lastName: "Doe",
        primaryEmail: "john@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "john@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await repository.create(userData);
      const updatedUser = await repository.update(user.userId, {
        firstName: "Jane",
        lastName: "Smith",
        globalRole: "teacher",
      });

      expect(updatedUser.firstName).toBe("Jane");
      expect(updatedUser.lastName).toBe("Smith");
      expect(updatedUser.globalRole).toBe("teacher");
      expect(updatedUser.primaryEmail).toBe("john@example.com"); // unchanged
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        repository.update("non-existent-id", { firstName: "Test" })
      ).rejects.toThrow("User not found");
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

      const user = await repository.create(userData);
      await repository.updatePassword(user.userId, "new_hash");

      const updatedUser = await repository.findByUserId(user.userId);
      expect(updatedUser!.passwordHash).toBe("new_hash");
      expect(updatedUser!.passwordLastChangedAt).toBeDefined();
      expect(updatedUser!.passwordLastChangedAt!.getTime()).toBeGreaterThan(user.createdAt.getTime());
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

      await repository.create(userData);
      const foundUser = await repository.findBySocialIdentity("google", "google123");

      expect(foundUser).toBeDefined();
      expect(foundUser!.socialIdentities).toHaveLength(1);
      expect(foundUser!.socialIdentities[0].provider).toBe("google");
      expect(foundUser!.socialIdentities[0].providerUserId).toBe("google123");
    });

    it("should return null for non-existent social identity", async () => {
      const foundUser = await repository.findBySocialIdentity("github", "nonexistent");
      expect(foundUser).toBeNull();
    });
  });

  describe("addEmail", () => {
    it("should add email to user", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "original@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "original@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await repository.create(userData);
      const newEmail = {
        emailAddress: "additional@example.com",
        isVerified: false,
        addedAt: new Date(),
      };

      await repository.addEmail(user.userId, newEmail);

      const updatedUser = await repository.findByUserId(user.userId);
      expect(updatedUser!.emails).toHaveLength(2);
      expect(updatedUser!.emails[1].emailAddress).toBe("additional@example.com");
      expect(updatedUser!.emails[1].isVerified).toBe(false);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email address", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "verify@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "verify@example.com",
            isVerified: false,
            verificationToken: "token123",
            verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await repository.create(userData);
      await repository.verifyEmail(user.userId, "verify@example.com");

      const updatedUser = await repository.findByUserId(user.userId);
      expect(updatedUser!.emails[0].isVerified).toBe(true);
      expect(updatedUser!.emails[0].verificationToken).toBeUndefined();
      expect(updatedUser!.emails[0].verificationTokenExpiresAt).toBeUndefined();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      // Create test users
      const users: CreateUserType[] = [
        {
          userId: uuidv4(),
          firstName: "Alice",
          lastName: "Admin",
          primaryEmail: "alice@example.com",
          globalRole: "admin",
          emails: [{ emailAddress: "alice@example.com", isVerified: true, addedAt: new Date() }],
          socialIdentities: [],
          isAccountLocked: false,
          failedLoginAttempts: 0,
        },
        {
          userId: uuidv4(),
          firstName: "Bob",
          lastName: "Teacher",
          primaryEmail: "bob@example.com",
          globalRole: "teacher",
          emails: [{ emailAddress: "bob@example.com", isVerified: true, addedAt: new Date() }],
          socialIdentities: [],
          isAccountLocked: false,
          failedLoginAttempts: 0,
        },
        {
          userId: uuidv4(),
          firstName: "Charlie",
          lastName: "Student",
          primaryEmail: "charlie@example.com",
          globalRole: "student",
          emails: [{ emailAddress: "charlie@example.com", isVerified: true, addedAt: new Date() }],
          socialIdentities: [],
          isAccountLocked: false,
          failedLoginAttempts: 0,
        },
      ];

      for (const userData of users) {
        await repository.create(userData);
      }
    });

    it("should return all users with default pagination", async () => {
      const result = await repository.findAll();

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should filter users by role", async () => {
      const queryParams: UserQueryParamsType = { role: "teacher" };
      const result = await repository.findAll(queryParams);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].globalRole).toBe("teacher");
      expect(result.data[0].firstName).toBe("Bob");
    });

    it("should search users by name", async () => {
      const queryParams: UserQueryParamsType = { search: "Alice" };
      const result = await repository.findAll(queryParams);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe("Alice");
    });

    it("should search users by email", async () => {
      const queryParams: UserQueryParamsType = { search: "charlie@example.com" };
      const result = await repository.findAll(queryParams);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].primaryEmail).toBe("charlie@example.com");
    });

    it("should paginate results", async () => {
      const queryParams: UserQueryParamsType = { page: 1, limit: 2 };
      const result = await repository.findAll(queryParams);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it("should sort users", async () => {
      const queryParams: UserQueryParamsType = { sortBy: "firstName", sortOrder: "asc" };
      const result = await repository.findAll(queryParams);

      expect(result.data[0].firstName).toBe("Alice");
      expect(result.data[1].firstName).toBe("Bob");
      expect(result.data[2].firstName).toBe("Charlie");
    });
  });

  describe("delete", () => {
    it("should delete user", async () => {
      const userData: CreateUserType = {
        userId: uuidv4(),
        primaryEmail: "delete-me@example.com",
        globalRole: "student",
        emails: [
          {
            emailAddress: "delete-me@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
        socialIdentities: [],
        isAccountLocked: false,
        failedLoginAttempts: 0,
      };

      const user = await repository.create(userData);
      await repository.delete(user.userId);

      const deletedUser = await repository.findByUserId(user.userId);
      expect(deletedUser).toBeNull();
    });

    it("should throw error when deleting non-existent user", async () => {
      await expect(repository.delete("non-existent-id")).rejects.toThrow("User not found");
    });
  });
});