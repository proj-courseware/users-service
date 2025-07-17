import type { Context } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { AuthenticatedUserContextType } from "@/schemas/user.schema";
import type {
  UserType,
  CreateUserType,
  UpdateUserType,
  UserQueryParamsType,
} from "@/schemas/user.schema";
import type { GlobalRole } from "@/schemas/roles.schemas";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IAuthenticationService } from "@/services/authentication.service";
import type {
  IPasswordService,
  PasswordPolicyType,
} from "@/services/password.service";
import type { IAdminSettingRepository } from "@/repositories/admin-setting.repository";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import { AuthenticationService } from "@/services/authentication.service";
import { PasswordService } from "@/services/password.service";
import { JWTService } from "@/services/jwt.service";
import { MongoDbAdminSettingRepository } from "@/repositories/mongodb/admin-setting.mongodb.repository";
import { MockDbAdminSettingRepository } from "@/repositories/mockdb/admin-setting.mockdb.repository";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UserAlreadyExistsError,
} from "@/errors";
import { env } from "@/env";

export interface AdminControllerDeps {
  userRepository?: IUserRepository;
  authenticationService?: IAuthenticationService;
  passwordService?: IPasswordService;
  adminSettingRepository?: IAdminSettingRepository;
}

export class AdminController {
  private userRepository: IUserRepository;
  private authenticationService: IAuthenticationService;
  private passwordService: IPasswordService;
  private adminSettingRepository: IAdminSettingRepository;

  constructor(deps?: AdminControllerDeps) {
    if (
      deps?.userRepository &&
      deps?.authenticationService &&
      deps?.passwordService &&
      deps?.adminSettingRepository
    ) {
      this.userRepository = deps.userRepository;
      this.authenticationService = deps.authenticationService;
      this.passwordService = deps.passwordService;
      this.adminSettingRepository = deps.adminSettingRepository;
    } else {
      // Create default services with proper dependency injection
      this.userRepository =
        env.NODE_ENV === "test"
          ? new MockDbUserRepository()
          : new MongoDbUserRepository();

      this.adminSettingRepository =
        env.NODE_ENV === "test"
          ? new MockDbAdminSettingRepository()
          : new MongoDbAdminSettingRepository();

      this.passwordService = new PasswordService();
      const jwtService = new JWTService();

      this.authenticationService = new AuthenticationService(
        this.userRepository,
        this.passwordService,
        jwtService
      );
    }
  }

  /**
   * Middleware to check admin role
   */
  private checkAdminRole(userContext: AuthenticatedUserContextType): void {
    if (userContext.globalRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  }

  /**
   * Get all users with pagination and filtering
   * GET /admin/users
   */
  getAllUsers = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const queryParams = c.var.validatedQuery as UserQueryParamsType;
    const result = await this.userRepository.findAll(queryParams);

    // Remove sensitive data from response
    const sanitizedUsers = result.data.map((user) =>
      this.sanitizeUserData(user)
    );

    return c.json({
      success: true,
      data: sanitizedUsers,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  };

  /**
   * Get user by ID
   * GET /admin/users/:userId
   */
  getUserById = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { userId } = c.var.validatedParams as { userId: string };
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return c.json({
      success: true,
      user: this.sanitizeUserData(user),
    });
  };

  /**
   * Create new user (admin only)
   * POST /admin/users
   */
  createUser = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const body = c.var.validatedBody as CreateUserType & {
      password?: string;
      sendWelcomeEmail?: boolean;
      generatePassword?: boolean;
    };

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      body.primaryEmail
    );
    if (existingUser) {
      throw new UserAlreadyExistsError("User with this email already exists");
    }

    let passwordHash: string | undefined;
    let generatedPassword: string | undefined;

    if (body.generatePassword) {
      // Generate a secure random password
      generatedPassword = this.passwordService.generateSecurePassword();
      passwordHash = await this.passwordService.hashPassword(generatedPassword);
    } else if (body.password) {
      // Validate provided password
      const validation = this.passwordService.validatePasswordStrength(
        body.password
      );
      if (!validation.isValid) {
        throw new BadRequestError(
          `Password validation failed: ${validation.errors.join(", ")}`
        );
      }
      passwordHash = await this.passwordService.hashPassword(body.password);
    }

    const userData: CreateUserType = {
      firstName: body.firstName,
      lastName: body.lastName,
      primaryEmail: body.primaryEmail,
      passwordHash,
      globalRole: body.globalRole || "student",
      emails: [
        {
          emailAddress: body.primaryEmail,
          isVerified: true, // Admin-created users have verified emails
          addedAt: new Date(),
        },
      ],
      socialIdentities: [],
      isAccountLocked: false,
      failedLoginAttempts: 0,
    };

    const newUser = await this.userRepository.create(userData);

    const response: {
      success: boolean;
      message: string;
      user: ReturnType<AdminController["sanitizeUserData"]>;
      generatedPassword?: string;
    } = {
      success: true,
      message: "User created successfully",
      user: this.sanitizeUserData(newUser),
    };

    // Include generated password in response for admin (in production, this should be sent via secure email)
    if (generatedPassword) {
      response.generatedPassword = generatedPassword;
      response.message += ". Generated password included in response.";
    }

    return c.json(response, 201);
  };

  /**
   * Update user (admin only)
   * PUT /admin/users/:userId
   */
  updateUser = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { userId } = c.var.validatedParams as { userId: string };
    const body = c.var.validatedBody as Partial<
      UpdateUserType & { globalRole: GlobalRole }
    >;

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    // Prevent admin from demoting themselves
    if (
      userId === userContext.userId &&
      body.globalRole &&
      body.globalRole !== "admin"
    ) {
      throw new BadRequestError("Cannot change your own admin role");
    }

    const updatedUser = await this.userRepository.update(userId, body);

    return c.json({
      success: true,
      message: "User updated successfully",
      user: this.sanitizeUserData(updatedUser),
    });
  };

  /**
   * Delete user (admin only)
   * DELETE /admin/users/:userId
   */
  deleteUser = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { userId } = c.var.validatedParams as { userId: string };

    // Prevent admin from deleting themselves
    if (userId === userContext.userId) {
      throw new BadRequestError("Cannot delete your own account");
    }

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    await this.userRepository.delete(userId);

    return c.json({
      success: true,
      message: "User deleted successfully",
    });
  };

  /**
   * Lock user account
   * POST /admin/users/:userId/lock
   */
  lockUser = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { userId } = c.var.validatedParams as { userId: string };
    const body = await c.req.json();

    // Prevent admin from locking themselves
    if (userId === userContext.userId) {
      throw new BadRequestError("Cannot lock your own account");
    }

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    if (existingUser.isAccountLocked) {
      throw new BadRequestError("User account is already locked");
    }

    const lockUntil = body.lockUntil ? new Date(body.lockUntil) : undefined;
    await this.userRepository.updateLoginAttempts(
      existingUser.primaryEmail,
      existingUser.failedLoginAttempts,
      true,
      lockUntil
    );

    return c.json({
      success: true,
      message: "User account locked successfully",
      lockUntil,
    });
  };

  /**
   * Unlock user account
   * POST /admin/users/:userId/unlock
   */
  unlockUser = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { userId } = c.var.validatedParams as { userId: string };

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    if (!existingUser.isAccountLocked) {
      throw new BadRequestError("User account is not locked");
    }

    await this.authenticationService.unlockAccount(userId);

    return c.json({
      success: true,
      message: "User account unlocked successfully",
    });
  };

  /**
   * Reset user password (generate new one)
   * POST /admin/users/:userId/reset-password
   */
  resetUserPassword = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { userId } = c.var.validatedParams as { userId: string };
    const body = await c.req.json();

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    let newPassword: string;

    if (body.password) {
      // Admin provided a password
      const validation = this.passwordService.validatePasswordStrength(
        body.password
      );
      if (!validation.isValid) {
        throw new BadRequestError(
          `Password validation failed: ${validation.errors.join(", ")}`
        );
      }
      newPassword = body.password;
    } else {
      // Generate a secure random password
      newPassword = this.passwordService.generateSecurePassword();
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, passwordHash);

    return c.json({
      success: true,
      message: "Password reset successfully",
      newPassword, // In production, this should be sent via secure email
    });
  };

  /**
   * Get system statistics
   * GET /admin/stats
   */
  getSystemStats = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    // Get user counts by role
    const allUsers = await this.userRepository.findMany({}, 10000); // Reasonable limit for stats

    const stats = {
      totalUsers: allUsers.length,
      usersByRole: {
        admin: allUsers.filter((u) => u.globalRole === "admin").length,
        teacher: allUsers.filter((u) => u.globalRole === "teacher").length,
        student: allUsers.filter((u) => u.globalRole === "student").length,
      },
      accountStatus: {
        active: allUsers.filter((u) => !u.isAccountLocked).length,
        locked: allUsers.filter((u) => u.isAccountLocked).length,
      },
      emailVerification: {
        fullyVerified: allUsers.filter((u) =>
          u.emails.every((email) => email.isVerified)
        ).length,
        partiallyVerified: allUsers.filter(
          (u) =>
            u.emails.some((email) => email.isVerified) &&
            !u.emails.every((email) => email.isVerified)
        ).length,
        unverified: allUsers.filter(
          (u) => !u.emails.some((email) => email.isVerified)
        ).length,
      },
      socialLogins: allUsers.filter((u) => u.socialIdentities.length > 0)
        .length,
      recentActivity: {
        newUsersLast7Days: allUsers.filter(
          (u) =>
            u.createdAt &&
            u.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        activeUsersLast7Days: allUsers.filter(
          (u) =>
            u.lastLoginAt &&
            u.lastLoginAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
      },
    };

    return c.json({
      success: true,
      stats,
      generatedAt: new Date(),
    });
  };

  /**
   * Search users
   * GET /admin/users/search
   */
  searchUsers = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const query = c.req.query("q");
    const limit = parseInt(c.req.query("limit") || "20");
    const role = c.req.query("role") as GlobalRole;

    if (!query || query.trim().length < 2) {
      throw new BadRequestError("Search query must be at least 2 characters");
    }

    const searchParams: Partial<UserQueryParamsType> = {
      search: query.trim(),
      ...(role && { role }),
    };

    const users = await this.userRepository.findMany(searchParams, limit);
    const sanitizedUsers = users.map((user) => this.sanitizeUserData(user));

    return c.json({
      success: true,
      query,
      results: sanitizedUsers,
      count: sanitizedUsers.length,
    });
  };

  /**
   * Bulk operations on users
   * POST /admin/users/bulk
   */
  bulkOperations = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const body = await c.req.json();
    const { operation, userIds } = body;

    if (!operation || !Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestError("Invalid bulk operation request");
    }

    // Prevent admin from performing bulk operations on themselves
    if (userIds.includes(userContext.userId)) {
      throw new BadRequestError(
        "Cannot perform bulk operations on your own account"
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const userId of userIds) {
      try {
        const user = await this.userRepository.findById(userId);
        if (!user) {
          results.failed++;
          results.errors.push(`User ${userId} not found`);
          continue;
        }

        switch (operation) {
          case "lock":
            if (!user.isAccountLocked) {
              await this.userRepository.updateLoginAttempts(
                user.primaryEmail,
                user.failedLoginAttempts,
                true
              );
              results.success++;
            } else {
              results.errors.push(`User ${userId} is already locked`);
            }
            break;

          case "unlock":
            if (user.isAccountLocked) {
              await this.authenticationService.unlockAccount(userId);
              results.success++;
            } else {
              results.errors.push(`User ${userId} is not locked`);
            }
            break;

          case "delete":
            await this.userRepository.delete(userId);
            results.success++;
            break;

          default:
            results.failed++;
            results.errors.push(`Unknown operation: ${operation}`);
        }
      } catch (_error) {
        results.failed++;
        results.errors.push(
          `Failed to ${operation} user ${userId}: ${(_error as Error).message}`
        );
      }
    }

    return c.json({
      success: true,
      message: `Bulk ${operation} completed`,
      results,
    });
  };

  /**
   * Get all admin settings
   * GET /admin/settings
   */
  getAllSettings = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const settings = await this.adminSettingRepository.findAll();

    return c.json({
      success: true,
      data: settings,
      count: settings.length,
    });
  };

  /**
   * Get admin setting by key
   * GET /admin/settings/:key
   */
  getSettingByKey = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { key } = c.var.validatedParams as { key: string };
    const setting = await this.adminSettingRepository.findByKey(key);

    if (!setting) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }

    return c.json({
      success: true,
      data: setting,
    });
  };

  /**
   * Create or update admin setting
   * PUT /admin/settings/:key
   */
  setSettingByKey = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { key } = c.var.validatedParams as { key: string };
    const body = c.var.validatedBody as {
      value: unknown;
      description?: string;
    };

    const setting = await this.adminSettingRepository.setValue(
      key,
      body.value,
      body.description
    );

    return c.json({
      success: true,
      message: "Setting updated successfully",
      data: setting,
    });
  };

  /**
   * Delete admin setting
   * DELETE /admin/settings/:key
   */
  deleteSettingByKey = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const { key } = c.var.validatedParams as { key: string };
    const deleted = await this.adminSettingRepository.deleteByKey(key);

    if (!deleted) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }

    return c.json({
      success: true,
      message: "Setting deleted successfully",
    });
  };

  /**
   * Get multiple admin settings by keys
   * POST /admin/settings/batch
   */
  getMultipleSettings = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const body = c.var.validatedBody as { keys: string[] };
    const settingsMap = await this.adminSettingRepository.getMultiple(
      body.keys
    );

    return c.json({
      success: true,
      data: Object.fromEntries(settingsMap),
    });
  };

  /**
   * Get system health status
   * GET /admin/health
   */
  getHealthStatus = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const healthChecks = {
      status: "healthy",
      timestamp: new Date(),
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      checks: {
        database: { status: "unknown", responseTime: 0 },
        memory: { status: "unknown", used: 0, free: 0 },
        settings: { status: "unknown", count: 0 },
      },
    };

    try {
      // Database health check
      const dbStart = Date.now();
      await this.userRepository.findMany({}, 1);
      const dbTime = Date.now() - dbStart;
      healthChecks.checks.database = {
        status: dbTime < 1000 ? "healthy" : "slow",
        responseTime: dbTime,
      };
    } catch {
      healthChecks.checks.database = {
        status: "unhealthy",
        responseTime: 0,
      };
      healthChecks.status = "degraded";
    }

    try {
      // Settings repository health check
      const settings = await this.adminSettingRepository.findAll();
      healthChecks.checks.settings = {
        status: "healthy",
        count: settings.length,
      };
    } catch {
      healthChecks.checks.settings = {
        status: "unhealthy",
        count: 0,
      };
      healthChecks.status = "degraded";
    }

    // Memory health check
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const freeMem = totalMem - usedMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    healthChecks.checks.memory = {
      status:
        memUsagePercent > 90
          ? "critical"
          : memUsagePercent > 75
            ? "warning"
            : "healthy",
      used: usedMem,
      free: freeMem,
    };

    if (healthChecks.checks.memory.status === "critical") {
      healthChecks.status = "critical";
    } else if (
      healthChecks.checks.memory.status === "warning" &&
      healthChecks.status === "healthy"
    ) {
      healthChecks.status = "warning";
    }

    return c.json({
      success: true,
      health: healthChecks,
    });
  };

  /**
   * Get current password policy
   * GET /admin/password-policy
   */
  getPasswordPolicy = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const currentPolicy = this.passwordService.getCurrentPasswordPolicy();

    return c.json({
      success: true,
      data: {
        policy: currentPolicy,
        source: "environment",
        description:
          "Current password policy configuration loaded from environment variables",
      },
    });
  };

  /**
   * Validate a password policy configuration
   * POST /admin/password-policy/validate
   */
  validatePasswordPolicy = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const body = (await c.req.json()) as PasswordPolicyType;

    // Validate the policy structure
    const validation = this.passwordService.validatePasswordPolicy(body);

    return c.json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        policy: body,
      },
    });
  };

  /**
   * Test password against current or custom policy
   * POST /admin/password-policy/test
   */
  testPasswordPolicy = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const body = (await c.req.json()) as {
      password: string;
      policy?: PasswordPolicyType;
    };

    if (!body.password) {
      throw new BadRequestError("Password is required for testing");
    }

    const testResult = this.passwordService.validatePasswordStrength(
      body.password,
      body.policy
    );

    const usedPolicy =
      body.policy || this.passwordService.getCurrentPasswordPolicy();

    return c.json({
      success: true,
      data: {
        passwordTest: testResult,
        usedPolicy,
        passwordLength: body.password.length,
      },
    });
  };

  /**
   * Get password policy information and examples
   * GET /admin/password-policy/info
   */
  getPasswordPolicyInfo = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    this.checkAdminRole(userContext);

    const currentPolicy = this.passwordService.getCurrentPasswordPolicy();

    // Generate example passwords that meet the current policy
    const examplePasswords = [];
    for (let i = 0; i < 3; i++) {
      const password = this.passwordService.generateSecurePassword(
        currentPolicy.minLength + 2
      );
      examplePasswords.push(password);
    }

    return c.json({
      success: true,
      data: {
        currentPolicy,
        policyValidation:
          this.passwordService.validatePasswordPolicy(currentPolicy),
        examplePasswords,
        environmentVariables: {
          PASSWORD_MIN_LENGTH: "Minimum password length (4-128)",
          PASSWORD_MAX_LENGTH: "Maximum password length (8-256)",
          PASSWORD_REQUIRE_UPPERCASE: "Require uppercase letters (true/false)",
          PASSWORD_REQUIRE_LOWERCASE: "Require lowercase letters (true/false)",
          PASSWORD_REQUIRE_NUMBERS: "Require numbers (true/false)",
          PASSWORD_REQUIRE_SPECIAL_CHARS:
            "Require special characters (true/false)",
        },
        specialCharacters: '!@#$%^&*(),.?":{}|<>',
      },
    });
  };

  /**
   * Sanitize user data for admin responses
   */
  private sanitizeUserData(user: UserType): Omit<UserType, "passwordHash"> & {
    emails: Array<
      Omit<
        UserType["emails"][0],
        "verificationToken" | "verificationTokenExpiresAt"
      >
    >;
  } {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...sanitizedUser } = user;
    return {
      ...sanitizedUser,
      emails: user.emails.map((email) => ({
        emailAddress: email.emailAddress,
        isVerified: email.isVerified,
        addedAt: email.addedAt,
      })),
    };
  }
}
