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
import type { IPasswordService, PasswordPolicyType } from "@/services/password.service";
import type { IAdminSettingRepository } from "@/repositories/admin-setting.repository";
import type { AdminSettingType } from "@/schemas/user.schema";
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
  getCurrentPasswordPolicy: vi.fn(),
  validatePasswordPolicy: vi.fn(),
});

const createMockAdminSettingRepository = (): jest.Mocked<IAdminSettingRepository> => ({
  create: vi.fn(),
  findByKey: vi.fn(),
  findAll: vi.fn(),
  updateByKey: vi.fn(),
  deleteByKey: vi.fn(),
  existsByKey: vi.fn(),
  getValue: vi.fn(),
  setValue: vi.fn(),
  getMultiple: vi.fn(),
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
  let mockAdminSettingRepository: jest.Mocked<IAdminSettingRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockAuthService = createMockAuthService();
    mockPasswordService = createMockPasswordService();
    mockAdminSettingRepository = createMockAdminSettingRepository();

    adminController = new AdminController({
      userRepository: mockUserRepository,
      authenticationService: mockAuthService,
      passwordService: mockPasswordService,
      adminSettingRepository: mockAdminSettingRepository,
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

  describe("password policy management", () => {
    const testPolicy: PasswordPolicyType = {
      minLength: 12,
      maxLength: 64,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    };

    beforeEach(() => {
      mockPasswordService.getCurrentPasswordPolicy = vi.fn();
      mockPasswordService.validatePasswordPolicy = vi.fn();
      mockPasswordService.validatePasswordStrength = vi.fn();
      mockPasswordService.generateSecurePassword = vi.fn();
    });

    describe("getPasswordPolicy", () => {
      it("should return current password policy for admin", async () => {
        mockPasswordService.getCurrentPasswordPolicy.mockReturnValue(testPolicy);

        const c = createMockContext(adminContext);
        await adminController.getPasswordPolicy(c as Context<AppEnv>);

        expect(mockPasswordService.getCurrentPasswordPolicy).toHaveBeenCalledOnce();
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: {
            policy: testPolicy,
            source: "environment",
            description: "Current password policy configuration loaded from environment variables"
          },
        });
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext);
        await expect(adminController.getPasswordPolicy(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("validatePasswordPolicy", () => {
      it("should validate a correct policy for admin", async () => {
        mockPasswordService.validatePasswordPolicy.mockReturnValue({
          isValid: true,
          errors: [],
        });

        const c = createMockContext(adminContext);
        (c.req!.json as any).mockResolvedValue(testPolicy);

        await adminController.validatePasswordPolicy(c as Context<AppEnv>);

        expect(mockPasswordService.validatePasswordPolicy).toHaveBeenCalledWith(testPolicy);
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: {
            isValid: true,
            errors: [],
            policy: testPolicy,
          },
        });
      });

      it("should return validation errors for invalid policy", async () => {
        const invalidPolicy: PasswordPolicyType = {
          minLength: 20,
          maxLength: 10, // Invalid: min > max
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        };

        mockPasswordService.validatePasswordPolicy.mockReturnValue({
          isValid: false,
          errors: ["Minimum length cannot be greater than maximum length"],
        });

        const c = createMockContext(adminContext);
        (c.req!.json as any).mockResolvedValue(invalidPolicy);

        await adminController.validatePasswordPolicy(c as Context<AppEnv>);

        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: {
            isValid: false,
            errors: ["Minimum length cannot be greater than maximum length"],
            policy: invalidPolicy,
          },
        });
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext);
        (c.req!.json as any).mockResolvedValue(testPolicy);
        
        await expect(adminController.validatePasswordPolicy(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("testPasswordPolicy", () => {
      it("should test password against current policy for admin", async () => {
        const testPassword = "MySecurePass123!";
        
        mockPasswordService.validatePasswordStrength.mockReturnValue({
          isValid: true,
          errors: [],
        });
        mockPasswordService.getCurrentPasswordPolicy.mockReturnValue(testPolicy);

        const c = createMockContext(adminContext);
        (c.req!.json as any).mockResolvedValue({ password: testPassword });

        await adminController.testPasswordPolicy(c as Context<AppEnv>);

        expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(testPassword, undefined);
        expect(mockPasswordService.getCurrentPasswordPolicy).toHaveBeenCalledOnce();
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: {
            passwordTest: {
              isValid: true,
              errors: [],
            },
            usedPolicy: testPolicy,
            passwordLength: testPassword.length,
          },
        });
      });

      it("should test password against custom policy", async () => {
        const testPassword = "weak";
        const customPolicy: PasswordPolicyType = {
          minLength: 6,
          maxLength: 64,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
        };

        mockPasswordService.validatePasswordStrength.mockReturnValue({
          isValid: false,
          errors: ["Password must be at least 6 characters long"],
        });

        const c = createMockContext(adminContext);
        (c.req!.json as any).mockResolvedValue({ 
          password: testPassword, 
          policy: customPolicy 
        });

        await adminController.testPasswordPolicy(c as Context<AppEnv>);

        expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(testPassword, customPolicy);
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: {
            passwordTest: {
              isValid: false,
              errors: ["Password must be at least 6 characters long"],
            },
            usedPolicy: customPolicy,
            passwordLength: testPassword.length,
          },
        });
      });

      it("should throw error when password is missing", async () => {
        const c = createMockContext(adminContext);
        (c.req!.json as any).mockResolvedValue({}); // No password

        await expect(adminController.testPasswordPolicy(c as Context<AppEnv>))
          .rejects.toThrow(BadRequestError);
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext);
        (c.req!.json as any).mockResolvedValue({ password: "test123" });
        
        await expect(adminController.testPasswordPolicy(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("getPasswordPolicyInfo", () => {
      it("should return comprehensive policy information for admin", async () => {
        const examplePasswords = ["SecurePass1!", "MyStrongPwd2@", "ComplexPass3#"];
        
        mockPasswordService.getCurrentPasswordPolicy.mockReturnValue(testPolicy);
        mockPasswordService.validatePasswordPolicy.mockReturnValue({
          isValid: true,
          errors: [],
        });
        mockPasswordService.generateSecurePassword
          .mockReturnValueOnce(examplePasswords[0])
          .mockReturnValueOnce(examplePasswords[1])
          .mockReturnValueOnce(examplePasswords[2]);

        const c = createMockContext(adminContext);
        await adminController.getPasswordPolicyInfo(c as Context<AppEnv>);

        expect(mockPasswordService.getCurrentPasswordPolicy).toHaveBeenCalledOnce();
        expect(mockPasswordService.validatePasswordPolicy).toHaveBeenCalledWith(testPolicy);
        expect(mockPasswordService.generateSecurePassword).toHaveBeenCalledTimes(3);
        
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            currentPolicy: testPolicy,
            policyValidation: { isValid: true, errors: [] },
            examplePasswords: examplePasswords,
            environmentVariables: expect.any(Object),
            specialCharacters: expect.any(String),
          }),
        });
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext);
        await expect(adminController.getPasswordPolicyInfo(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });
  });

  describe("admin settings management", () => {
    const testSetting: AdminSettingType = {
      id: "setting-123",
      key: "test.setting",
      value: "test value",
      description: "Test setting description",
      updatedAt: new Date(),
    };

    const testSettings: AdminSettingType[] = [
      testSetting,
      {
        id: "setting-456",
        key: "another.setting",
        value: { nested: "object", number: 42 },
        description: "Another test setting",
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockAdminSettingRepository.findAll = vi.fn();
      mockAdminSettingRepository.findByKey = vi.fn();
      mockAdminSettingRepository.setValue = vi.fn();
      mockAdminSettingRepository.deleteByKey = vi.fn();
      mockAdminSettingRepository.getMultiple = vi.fn();
    });

    describe("getAllSettings", () => {
      it("should return all admin settings for admin user", async () => {
        mockAdminSettingRepository.findAll.mockResolvedValue(testSettings);

        const c = createMockContext(adminContext);
        await adminController.getAllSettings(c as Context<AppEnv>);

        expect(mockAdminSettingRepository.findAll).toHaveBeenCalledOnce();
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: testSettings,
          count: testSettings.length,
        });
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext);
        await expect(adminController.getAllSettings(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("getSettingByKey", () => {
      it("should return setting by key for admin user", async () => {
        mockAdminSettingRepository.findByKey.mockResolvedValue(testSetting);

        const c = createMockContext(adminContext, undefined, { key: "test.setting" });
        await adminController.getSettingByKey(c as Context<AppEnv>);

        expect(mockAdminSettingRepository.findByKey).toHaveBeenCalledWith("test.setting");
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: testSetting,
        });
      });

      it("should throw NotFoundError for non-existent setting", async () => {
        mockAdminSettingRepository.findByKey.mockResolvedValue(null);

        const c = createMockContext(adminContext, undefined, { key: "nonexistent" });
        await expect(adminController.getSettingByKey(c as Context<AppEnv>))
          .rejects.toThrow(NotFoundError);
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext, undefined, { key: "test.setting" });
        await expect(adminController.getSettingByKey(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("setSettingByKey", () => {
      it("should create or update setting for admin user", async () => {
        const updatedSetting = { ...testSetting, value: "updated value" };
        mockAdminSettingRepository.setValue.mockResolvedValue(updatedSetting);

        const c = createMockContext(
          adminContext,
          { value: "updated value", description: "Updated description" },
          { key: "test.setting" }
        );
        await adminController.setSettingByKey(c as Context<AppEnv>);

        expect(mockAdminSettingRepository.setValue).toHaveBeenCalledWith(
          "test.setting",
          "updated value",
          "Updated description"
        );
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          message: "Setting updated successfully",
          data: updatedSetting,
        });
      });

      it("should handle complex values", async () => {
        const complexValue = { 
          config: { enabled: true, threshold: 100 },
          items: ["a", "b", "c"]
        };
        const complexSetting = { ...testSetting, value: complexValue };
        mockAdminSettingRepository.setValue.mockResolvedValue(complexSetting);

        const c = createMockContext(
          adminContext,
          { value: complexValue },
          { key: "complex.setting" }
        );
        await adminController.setSettingByKey(c as Context<AppEnv>);

        expect(mockAdminSettingRepository.setValue).toHaveBeenCalledWith(
          "complex.setting",
          complexValue,
          undefined
        );
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(
          userContext,
          { value: "test value" },
          { key: "test.setting" }
        );
        await expect(adminController.setSettingByKey(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("deleteSettingByKey", () => {
      it("should delete setting for admin user", async () => {
        mockAdminSettingRepository.deleteByKey.mockResolvedValue(true);

        const c = createMockContext(adminContext, undefined, { key: "test.setting" });
        await adminController.deleteSettingByKey(c as Context<AppEnv>);

        expect(mockAdminSettingRepository.deleteByKey).toHaveBeenCalledWith("test.setting");
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          message: "Setting deleted successfully",
        });
      });

      it("should throw NotFoundError for non-existent setting", async () => {
        mockAdminSettingRepository.deleteByKey.mockResolvedValue(false);

        const c = createMockContext(adminContext, undefined, { key: "nonexistent" });
        await expect(adminController.deleteSettingByKey(c as Context<AppEnv>))
          .rejects.toThrow(NotFoundError);
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext, undefined, { key: "test.setting" });
        await expect(adminController.deleteSettingByKey(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("getMultipleSettings", () => {
      it("should return multiple settings by keys for admin user", async () => {
        const settingsMap = new Map([
          ["setting1", "value1"],
          ["setting2", { complex: "value" }],
        ]);
        mockAdminSettingRepository.getMultiple.mockResolvedValue(settingsMap);

        const c = createMockContext(adminContext, { keys: ["setting1", "setting2"] });
        await adminController.getMultipleSettings(c as Context<AppEnv>);

        expect(mockAdminSettingRepository.getMultiple).toHaveBeenCalledWith(["setting1", "setting2"]);
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          data: {
            setting1: "value1",
            setting2: { complex: "value" },
          },
        });
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext, { keys: ["setting1"] });
        await expect(adminController.getMultipleSettings(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });

    describe("getHealthStatus", () => {
      it("should return comprehensive health status for admin user", async () => {
        // Mock successful database check
        mockUserRepository.findMany.mockResolvedValue([regularUser]);
        mockAdminSettingRepository.findAll.mockResolvedValue(testSettings);

        const c = createMockContext(adminContext);
        await adminController.getHealthStatus(c as Context<AppEnv>);

        expect(mockUserRepository.findMany).toHaveBeenCalledWith({}, 1);
        expect(mockAdminSettingRepository.findAll).toHaveBeenCalledOnce();
        
        expect(c.json).toHaveBeenCalledWith({
          success: true,
          health: expect.objectContaining({
            status: expect.any(String),
            timestamp: expect.any(Date),
            uptime: expect.any(Number),
            environment: expect.any(String),
            checks: expect.objectContaining({
              database: expect.objectContaining({
                status: expect.any(String),
                responseTime: expect.any(Number),
              }),
              memory: expect.objectContaining({
                status: expect.any(String),
                used: expect.any(Number),
                free: expect.any(Number),
              }),
              settings: expect.objectContaining({
                status: expect.any(String),
                count: expect.any(Number),
              }),
            }),
          }),
        });
      });

      it("should handle database errors gracefully", async () => {
        mockUserRepository.findMany.mockRejectedValue(new Error("Database connection failed"));
        mockAdminSettingRepository.findAll.mockResolvedValue(testSettings);

        const c = createMockContext(adminContext);
        await adminController.getHealthStatus(c as Context<AppEnv>);

        expect(c.json).toHaveBeenCalledWith({
          success: true,
          health: expect.objectContaining({
            status: "degraded",
            checks: expect.objectContaining({
              database: expect.objectContaining({
                status: "unhealthy",
                responseTime: 0,
              }),
            }),
          }),
        });
      });

      it("should handle settings repository errors gracefully", async () => {
        mockUserRepository.findMany.mockResolvedValue([regularUser]);
        mockAdminSettingRepository.findAll.mockRejectedValue(new Error("Settings error"));

        const c = createMockContext(adminContext);
        await adminController.getHealthStatus(c as Context<AppEnv>);

        expect(c.json).toHaveBeenCalledWith({
          success: true,
          health: expect.objectContaining({
            status: "degraded",
            checks: expect.objectContaining({
              settings: expect.objectContaining({
                status: "unhealthy",
                count: 0,
              }),
            }),
          }),
        });
      });

      it("should deny access to non-admin users", async () => {
        const c = createMockContext(userContext);
        await expect(adminController.getHealthStatus(c as Context<AppEnv>))
          .rejects.toThrow(ForbiddenError);
      });
    });
  });
});