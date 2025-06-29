import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AuthenticationService,
  DEFAULT_AUTH_CONFIG,
} from "@/services/authentication.service";
import { PasswordService } from "@/services/password.service";
import { JWTService } from "@/services/jwt.service";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import { InvalidCredentialsError, AccountLockedError } from "@/errors";
import type {
  UserType,
  CreateUserType,
  LoginCredentialsType,
  AuthServiceConfig,
} from "@/schemas/user.schema";

describe("Progressive Account Lockout", () => {
  let authService: AuthenticationService;
  let userRepository: MockDbUserRepository;
  let passwordService: PasswordService;
  let jwtService: JWTService;

  const testConfig: AuthServiceConfig = {
    ...DEFAULT_AUTH_CONFIG,
    maxFailedAttempts: 3,
    lockoutDurationMinutes: 5,
    progressiveLockout: true,
    maxProgressiveLockoutHours: 2,
    requireEmailVerification: false,
  };

  const testUser: CreateUserType = {
    firstName: "Test",
    lastName: "User",
    primaryEmail: "test@example.com",
    passwordHash: "hashed_password",
    globalRole: "student",
    emails: [
      {
        emailAddress: "test@example.com",
        isVerified: true,
        addedAt: new Date(),
      },
    ],
    socialIdentities: [],
    isAccountLocked: false,
    failedLoginAttempts: 0,
  };

  const loginCredentials: LoginCredentialsType = {
    email: "test@example.com",
    password: "wrong_password",
  };

  beforeEach(async () => {
    userRepository = new MockDbUserRepository();
    passwordService = new PasswordService();
    jwtService = new JWTService();
    authService = new AuthenticationService(
      userRepository,
      passwordService,
      jwtService,
      testConfig,
    );

    // Create test user
    await userRepository.create(testUser);

    // Mock password verification to always fail for failed attempts tests
    vi.spyOn(passwordService, "verifyPassword").mockResolvedValue(false);
  });

  describe("Progressive Lockout Calculation", () => {
    it("should calculate progressive lockout durations correctly", async () => {
      const user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user).toBeDefined();

      // First lockout (3rd attempt = threshold): 1 * 5 minutes = 5 minutes
      const firstDuration = (
        authService as any
      ).calculateProgressiveLockoutDuration(3, testConfig);
      expect(firstDuration).toBe(5 * 60 * 1000); // 5 minutes in ms

      // Second lockout (4th attempt): 2 * 5 minutes = 10 minutes
      const secondDuration = (
        authService as any
      ).calculateProgressiveLockoutDuration(4, testConfig);
      expect(secondDuration).toBe(10 * 60 * 1000); // 10 minutes in ms

      // Third lockout (5th attempt): 4 * 5 minutes = 20 minutes
      const thirdDuration = (
        authService as any
      ).calculateProgressiveLockoutDuration(5, testConfig);
      expect(thirdDuration).toBe(20 * 60 * 1000); // 20 minutes in ms

      // Fourth lockout (6th attempt): 8 * 5 minutes = 40 minutes
      const fourthDuration = (
        authService as any
      ).calculateProgressiveLockoutDuration(6, testConfig);
      expect(fourthDuration).toBe(40 * 60 * 1000); // 40 minutes in ms

      // Should cap at maximum duration (2 hours)
      const maxDuration = (
        authService as any
      ).calculateProgressiveLockoutDuration(20, testConfig);
      expect(maxDuration).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
    });
  });

  describe("Failed Login Attempts", () => {
    it("should track failed attempts without locking initially", async () => {
      // First failed attempt
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(InvalidCredentialsError);

      let user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.failedLoginAttempts).toBe(1);
      expect(user?.isAccountLocked).toBe(false);

      // Second failed attempt
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(InvalidCredentialsError);

      user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.failedLoginAttempts).toBe(2);
      expect(user?.isAccountLocked).toBe(false);
    });

    it("should lock account after max failed attempts with progressive duration", async () => {
      // Perform failed attempts up to the limit
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, testConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      const user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.failedLoginAttempts).toBe(3);
      expect(user?.isAccountLocked).toBe(true);
      expect(user?.accountLockedAt).toBeDefined();
      expect(user?.accountLockedUntil).toBeDefined();

      // Check that lockout duration is 5 minutes (first progressive lockout)
      const lockDuration =
        user!.accountLockedUntil!.getTime() - user!.accountLockedAt!.getTime();
      expect(lockDuration).toBe(5 * 60 * 1000); // 5 minutes in ms
    });

    it("should reject login attempts when account is locked", async () => {
      // Lock the account
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, testConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      // Try to login while locked
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(AccountLockedError);
    });

    it("should provide informative lockout message with unlock time", async () => {
      // Lock the account
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, testConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      // Try to login while locked and check error message
      try {
        await authService.loginWithPassword(loginCredentials, testConfig);
        expect.fail("Should have thrown AccountLockedError");
      } catch (error) {
        expect(error).toBeInstanceOf(AccountLockedError);
        expect((error as AccountLockedError).message).toContain(
          "Account is locked",
        );
        expect((error as AccountLockedError).message).toContain(
          "Account will be unlocked at",
        );
      }
    });
  });

  describe("Progressive Lockout Behavior", () => {
    it("should increase lockout duration with repeated violations", async () => {
      // First lockout cycle
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, testConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      let user = await userRepository.findByEmail(testUser.primaryEmail);
      const firstLockDuration =
        user!.accountLockedUntil!.getTime() - user!.accountLockedAt!.getTime();
      expect(firstLockDuration).toBe(5 * 60 * 1000); // 5 minutes

      // Manually unlock and clear attempts to simulate time-based unlock
      await userRepository.updateLoginAttempts(testUser.primaryEmail, 3, false);

      // Trigger second lockout cycle (4th attempt total)
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(InvalidCredentialsError);

      user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.failedLoginAttempts).toBe(4);
      expect(user?.isAccountLocked).toBe(true);

      const secondLockDuration =
        user!.accountLockedUntil!.getTime() - user!.accountLockedAt!.getTime();
      expect(secondLockDuration).toBe(10 * 60 * 1000); // 10 minutes (double)
    });

    it("should cap lockout duration at maximum configured time", async () => {
      // Set user to have many failed attempts to trigger max lockout
      await userRepository.updateLoginAttempts(
        testUser.primaryEmail,
        19,
        false,
      );

      // One more failed attempt to trigger max lockout
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(InvalidCredentialsError);

      const user = await userRepository.findByEmail(testUser.primaryEmail);
      const lockDuration =
        user!.accountLockedUntil!.getTime() - user!.accountLockedAt!.getTime();

      // Should be capped at 2 hours (maxProgressiveLockoutHours)
      expect(lockDuration).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe("Time-Based Lockout Expiry", () => {
    it("should automatically unlock account when lockout expires", async () => {
      // Lock the account
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, testConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      // Manually set lockout to have expired (simulate time passage)
      const expiredTime = new Date(Date.now() - 1000); // 1 second ago
      await userRepository.updateLoginAttempts(
        testUser.primaryEmail,
        3,
        true,
        expiredTime,
      );

      // Mock successful password verification for unlocking
      vi.spyOn(passwordService, "verifyPassword").mockResolvedValue(true);

      // Should now be able to login (auto-unlock)
      const result = await authService.loginWithPassword(
        {
          email: testUser.primaryEmail,
          password: "correct_password",
        },
        testConfig,
      );

      expect(result.user).toBeDefined();

      // Verify account is unlocked
      const user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.isAccountLocked).toBe(false);
      expect(user?.failedLoginAttempts).toBe(0);
    });

    it("should correctly identify when account is currently locked", async () => {
      // Lock the account
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, testConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      // Should be locked
      let isLocked = await userRepository.isAccountCurrentlyLocked(
        testUser.primaryEmail,
      );
      expect(isLocked).toBe(true);

      // Set lockout to expire in the past
      const expiredTime = new Date(Date.now() - 1000);
      await userRepository.updateLoginAttempts(
        testUser.primaryEmail,
        3,
        true,
        expiredTime,
      );

      // Should no longer be locked
      isLocked = await userRepository.isAccountCurrentlyLocked(
        testUser.primaryEmail,
      );
      expect(isLocked).toBe(false);
    });
  });

  describe("Standard vs Progressive Lockout", () => {
    it("should use standard lockout when progressive lockout is disabled", async () => {
      const standardConfig: AuthServiceConfig = {
        ...testConfig,
        progressiveLockout: false,
      };

      // Lock the account with standard lockout
      for (let i = 0; i < testConfig.maxFailedAttempts; i++) {
        await expect(
          authService.loginWithPassword(loginCredentials, standardConfig),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      const user = await userRepository.findByEmail(testUser.primaryEmail);
      const lockDuration =
        user!.accountLockedUntil!.getTime() - user!.accountLockedAt!.getTime();

      // Should use standard lockout duration (5 minutes)
      expect(lockDuration).toBe(5 * 60 * 1000);

      // Reset and try again - should still be same duration
      await userRepository.updateLoginAttempts(testUser.primaryEmail, 2, false);

      await expect(
        authService.loginWithPassword(loginCredentials, standardConfig),
      ).rejects.toThrow(InvalidCredentialsError);

      const user2 = await userRepository.findByEmail(testUser.primaryEmail);
      const lockDuration2 =
        user2!.accountLockedUntil!.getTime() -
        user2!.accountLockedAt!.getTime();

      // Should still be same duration (not progressive)
      expect(lockDuration2).toBe(5 * 60 * 1000);
    });
  });

  describe("Successful Login Reset", () => {
    it("should reset failed attempts on successful login", async () => {
      // Make some failed attempts
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(InvalidCredentialsError);
      await expect(
        authService.loginWithPassword(loginCredentials, testConfig),
      ).rejects.toThrow(InvalidCredentialsError);

      let user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.failedLoginAttempts).toBe(2);

      // Mock successful password verification
      vi.spyOn(passwordService, "verifyPassword").mockResolvedValue(true);

      // Successful login should reset failed attempts
      await authService.loginWithPassword(
        {
          email: testUser.primaryEmail,
          password: "correct_password",
        },
        testConfig,
      );

      user = await userRepository.findByEmail(testUser.primaryEmail);
      expect(user?.failedLoginAttempts).toBe(0);
      expect(user?.isAccountLocked).toBe(false);
    });
  });
});
