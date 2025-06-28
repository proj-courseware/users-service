import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { AdminController } from "@/controllers/admin.controller";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IAuthenticationService } from "@/services/authentication.service";
import type { IPasswordService } from "@/services/password.service";
import type { Context } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { 
  UserType, 
  CreateUserType, 
  UpdateUserType,
  UserQueryParamsType,
} from "@/schemas/user.schema";
import type { AuthenticatedUserContextType } from "@/schemas/user.schemas";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UserAlreadyExistsError,
} from "@/errors";

// Test data
const adminUser: UserType = {
  id: "admin-123",
  firstName: "Admin",
  lastName: "User",
  primaryEmail: "admin@example.com",
  passwordHash: "hashed-password",
  globalRole: "admin",
  emails: [
    {
      emailAddress: "admin@example.com",
      isVerified: true,
      addedAt: new Date(),
    },
  ],
  socialIdentities: [],
  lastLoginAt: new Date(),
  passwordLastChangedAt: new Date(),
  isAccountLocked: false,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const regularUser: UserType = {
  id: "user-456",
  firstName: "John",
  lastName: "Doe",
  primaryEmail: "john@example.com",
  passwordHash: "hashed-password",
  globalRole: "student",
  emails: [
    {
      emailAddress: "john@example.com",
      isVerified: true,
      addedAt: new Date(),
    },
  ],
  socialIdentities: [],
  lastLoginAt: new Date(),
  passwordLastChangedAt: new Date(),
  isAccountLocked: false,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const lockedUser: UserType = {
  ...regularUser,
  id: "locked-789",
  primaryEmail: "locked@example.com",
  isAccountLocked: true,
  failedLoginAttempts: 5,
  emails: [
    {
      emailAddress: "locked@example.com",
      isVerified: true,
      addedAt: new Date(),
    },
  ],
};

const adminContext: AuthenticatedUserContextType = {
  userId: adminUser.id,
  primaryEmail: adminUser.primaryEmail,
  globalRole: "admin",
};

const userContext: AuthenticatedUserContextType = {
  userId: regularUser.id,
  primaryEmail: regularUser.primaryEmail,
  globalRole: "student",
};

// Mock implementations
const createMockUserRepository = (): jest.Mocked<IUserRepository> => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findBySocialIdentity: vi.fn(),
  findByVerificationToken: vi.fn(),
  addEmail: vi.fn(),
  verifyEmail: vi.fn(),
  removeEmail: vi.fn(),
  setPrimaryEmail: vi.fn(),
  linkSocialIdentity: vi.fn(),
  unlinkSocialIdentity: vi.fn(),
  updatePassword: vi.fn(),
  updateLoginAttempts: vi.fn(),
  unlockAccount: vi.fn(),
  updateLastLogin: vi.fn(),
  isAccountCurrentlyLocked: vi.fn(),
  findAll: vi.fn(),
  findMany: vi.fn(),
  updateEmailVerificationToken: vi.fn(),
  clearExpiredVerificationTokens: vi.fn(),
  findByEmailVerificationToken: vi.fn(),
});

const createMockAuthService = (): jest.Mocked<IAuthenticationService> => ({
  register: vi.fn(),
  loginWithPassword: vi.fn(),
  refreshTokens: vi.fn(),
  verifyAccessToken: vi.fn(),
  getUserFromToken: vi.fn(),
  unlockAccount: vi.fn(),
  changePassword: vi.fn(),
  resetFailedAttempts: vi.fn(),
  authenticateUserByToken: vi.fn(),
});

const createMockPasswordService = (): jest.Mocked<IPasswordService> => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
  generateSecurePassword: vi.fn(),
});

const createMockContext = (userContext: AuthenticatedUserContextType, validatedBody?: any, validatedParams?: any, validatedQuery?: any): Partial<Context<AppEnv>> => ({
  var: {
    user: userContext,
    validatedBody,
    validatedParams,
    validatedQuery,
  } as any,
  json: vi.fn((data, status?) => ({ json: data, status } as any)),
  req: {
    query: vi.fn((key: string) => {
      const queryMap: Record<string, string> = {
        q: "test",
        limit: "20",
        role: "student",
      };
      return queryMap[key];
    }),
    json: vi.fn().mockResolvedValue({}),
  } as any,
});

describe("AdminController", () => {
  let adminController: AdminController;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockAuthService: jest.Mocked<IAuthenticationService>;
  let mockPasswordService: jest.Mocked<IPasswordService>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockAuthService = createMockAuthService();
    mockPasswordService = createMockPasswordService();

    adminController = new AdminController({
      userRepository: mockUserRepository,
      authenticationService: mockAuthService,
      passwordService: mockPasswordService,
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should get all users with pagination (admin)", async () => {
      const queryParams: UserQueryParamsType = { page: 1, limit: 10 };
      const paginatedResult = {
        data: [regularUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      const c = createMockContext(adminContext, undefined, undefined, queryParams);
      await adminController.getAllUsers(c as Context<AppEnv>);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(queryParams);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        data: [expect.objectContaining({ id: regularUser.id })],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it("should throw ForbiddenError for non-admin user", async () => {
      const c = createMockContext(userContext);

      await expect(adminController.getAllUsers(c as Context<AppEnv>))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe("getUserById", () => {
    it("should get user by ID (admin)", async () => {
      mockUserRepository.findById.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, undefined, { userId: regularUser.id });
      await adminController.getUserById(c as Context<AppEnv>);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(regularUser.id);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({ id: regularUser.id }),
      });
    });

    it("should throw NotFoundError for non-existent user", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const c = createMockContext(adminContext, undefined, { userId: "non-existent" });

      await expect(adminController.getUserById(c as Context<AppEnv>))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("createUser", () => {
    const createUserData: CreateUserType & { password: string } = {
      firstName: "New",
      lastName: "User",
      primaryEmail: "newuser@example.com",
      password: "SecurePass123!",
      globalRole: "student",
    };

    beforeEach(() => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue("hashed-password");
      mockUserRepository.create.mockResolvedValue(regularUser);
    });

    it("should create new user with provided password (admin)", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const c = createMockContext(adminContext, createUserData);
      await adminController.createUser(c as Context<AppEnv>);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(createUserData.primaryEmail);
      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(createUserData.password);
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(createUserData.password);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User created successfully",
        }),
        201,
      );
    });

    it("should create user with generated password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.generateSecurePassword.mockReturnValue("GeneratedPass123!");

      const createDataWithGenerated = { ...createUserData, generatePassword: true };
      delete createDataWithGenerated.password;

      const c = createMockContext(adminContext, createDataWithGenerated);
      await adminController.createUser(c as Context<AppEnv>);

      expect(mockPasswordService.generateSecurePassword).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          generatedPassword: "GeneratedPass123!",
        }),
        201,
      );
    });

    it("should throw UserAlreadyExistsError for existing email", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, createUserData);

      await expect(adminController.createUser(c as Context<AppEnv>))
        .rejects.toThrow(UserAlreadyExistsError);
    });

    it("should throw BadRequestError for weak password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ["Password too weak"],
      });

      const c = createMockContext(adminContext, createUserData);

      await expect(adminController.createUser(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("updateUser", () => {
    const updateData: Partial<UpdateUserType> = {
      firstName: "Updated",
      lastName: "Name",
    };

    it("should update user successfully (admin)", async () => {
      const updatedUser = { ...regularUser, ...updateData };
      mockUserRepository.findById.mockResolvedValue(regularUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const c = createMockContext(adminContext, updateData, { userId: regularUser.id });
      await adminController.updateUser(c as Context<AppEnv>);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(regularUser.id);
      expect(mockUserRepository.update).toHaveBeenCalledWith(regularUser.id, updateData);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "User updated successfully",
        user: expect.objectContaining(updateData),
      });
    });

    it("should prevent admin from demoting themselves", async () => {
      mockUserRepository.findById.mockResolvedValue(adminUser);

      const demoteData = { globalRole: "student" as const };
      const c = createMockContext(adminContext, demoteData, { userId: adminUser.id });

      await expect(adminController.updateUser(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully (admin)", async () => {
      mockUserRepository.findById.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, undefined, { userId: regularUser.id });
      await adminController.deleteUser(c as Context<AppEnv>);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(regularUser.id);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(regularUser.id);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "User deleted successfully",
      });
    });

    it("should prevent admin from deleting themselves", async () => {
      const c = createMockContext(adminContext, undefined, { userId: adminUser.id });

      await expect(adminController.deleteUser(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("lockUser", () => {
    it("should lock user account (admin)", async () => {
      mockUserRepository.findById.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, undefined, { userId: regularUser.id });
      (c.req!.json as any).mockResolvedValue({});

      await adminController.lockUser(c as Context<AppEnv>);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalledWith(
        regularUser.primaryEmail,
        regularUser.failedLoginAttempts,
        true,
        undefined,
      );
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "User account locked successfully",
        lockUntil: undefined,
      });
    });

    it("should prevent admin from locking themselves", async () => {
      const c = createMockContext(adminContext, undefined, { userId: adminUser.id });
      (c.req!.json as any).mockResolvedValue({});

      await expect(adminController.lockUser(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError for already locked account", async () => {
      mockUserRepository.findById.mockResolvedValue(lockedUser);

      const c = createMockContext(adminContext, undefined, { userId: lockedUser.id });
      (c.req!.json as any).mockResolvedValue({});

      await expect(adminController.lockUser(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("unlockUser", () => {
    it("should unlock user account (admin)", async () => {
      mockUserRepository.findById.mockResolvedValue(lockedUser);

      const c = createMockContext(adminContext, undefined, { userId: lockedUser.id });
      await adminController.unlockUser(c as Context<AppEnv>);

      expect(mockAuthService.unlockAccount).toHaveBeenCalledWith(lockedUser.id);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "User account unlocked successfully",
      });
    });

    it("should throw BadRequestError for non-locked account", async () => {
      mockUserRepository.findById.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, undefined, { userId: regularUser.id });

      await expect(adminController.unlockUser(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("resetUserPassword", () => {
    beforeEach(() => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue("new-hashed-password");
      mockPasswordService.generateSecurePassword.mockReturnValue("GeneratedPass123!");
    });

    it("should reset password with provided password (admin)", async () => {
      mockUserRepository.findById.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, undefined, { userId: regularUser.id });
      (c.req!.json as any).mockResolvedValue({ password: "NewPass123!" });

      await adminController.resetUserPassword(c as Context<AppEnv>);

      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith("NewPass123!");
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith("NewPass123!");
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(regularUser.id, "new-hashed-password");
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully",
        newPassword: "NewPass123!",
      });
    });

    it("should reset password with generated password", async () => {
      mockUserRepository.findById.mockResolvedValue(regularUser);

      const c = createMockContext(adminContext, undefined, { userId: regularUser.id });
      (c.req!.json as any).mockResolvedValue({});

      await adminController.resetUserPassword(c as Context<AppEnv>);

      expect(mockPasswordService.generateSecurePassword).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully",
        newPassword: "GeneratedPass123!",
      });
    });
  });

  describe("getSystemStats", () => {
    it("should return system statistics (admin)", async () => {
      const allUsers = [adminUser, regularUser, lockedUser];
      mockUserRepository.findMany.mockResolvedValue(allUsers);

      const c = createMockContext(adminContext);
      await adminController.getSystemStats(c as Context<AppEnv>);

      expect(mockUserRepository.findMany).toHaveBeenCalledWith({}, 10000);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        stats: expect.objectContaining({
          totalUsers: 3,
          usersByRole: expect.objectContaining({
            admin: 1,
            student: 2,
          }),
          accountStatus: expect.objectContaining({
            active: 2,
            locked: 1,
          }),
        }),
        generatedAt: expect.any(Date),
      });
    });
  });

  describe("searchUsers", () => {
    it("should search users successfully (admin)", async () => {
      mockUserRepository.findMany.mockResolvedValue([regularUser]);

      const c = createMockContext(adminContext);
      await adminController.searchUsers(c as Context<AppEnv>);

      expect(mockUserRepository.findMany).toHaveBeenCalledWith(
        { search: "test", role: "student" },
        20,
      );
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        query: "test",
        results: [expect.objectContaining({ id: regularUser.id })],
        count: 1,
      });
    });

    it("should throw BadRequestError for short query", async () => {
      const c = createMockContext(adminContext);
      (c.req!.query as any).mockReturnValue("a"); // Short query

      await expect(adminController.searchUsers(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("bulkOperations", () => {
    it("should perform bulk lock operation (admin)", async () => {
      mockUserRepository.findById
        .mockResolvedValueOnce(regularUser)
        .mockResolvedValueOnce({ ...regularUser, id: "user-2" });

      const c = createMockContext(adminContext);
      (c.req!.json as any).mockResolvedValue({
        operation: "lock",
        userIds: [regularUser.id, "user-2"],
      });

      await adminController.bulkOperations(c as Context<AppEnv>);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalledTimes(2);
      expect(c.json).toHaveBeenCalledWith({
        success: true,
        message: "Bulk lock completed",
        results: expect.objectContaining({
          success: 2,
          failed: 0,
        }),
      });
    });

    it("should prevent bulk operations on admin's own account", async () => {
      const c = createMockContext(adminContext);
      (c.req!.json as any).mockResolvedValue({
        operation: "lock",
        userIds: [adminUser.id],
      });

      await expect(adminController.bulkOperations(c as Context<AppEnv>))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe("role-based access control", () => {
    it("should allow admin access to all endpoints", async () => {
      mockUserRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const c = createMockContext(adminContext, undefined, undefined, {});
      await expect(adminController.getAllUsers(c as Context<AppEnv>))
        .resolves.not.toThrow();
    });

    it("should deny teacher access", async () => {
      const teacherContext: AuthenticatedUserContextType = {
        userId: "teacher-123",
        primaryEmail: "teacher@example.com",
        globalRole: "teacher",
      };

      const c = createMockContext(teacherContext);
      await expect(adminController.getAllUsers(c as Context<AppEnv>))
        .rejects.toThrow(ForbiddenError);
    });

    it("should deny student access", async () => {
      const c = createMockContext(userContext);
      await expect(adminController.getAllUsers(c as Context<AppEnv>))
        .rejects.toThrow(ForbiddenError);
    });
  });
});