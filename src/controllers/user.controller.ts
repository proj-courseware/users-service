import type { Context } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { AuthenticatedUserContextType } from "@/schemas/user.schema";
import type {
  UpdateUserType,
  ChangePasswordType,
  AddEmailType,
  SetPrimaryEmailType,
} from "@/schemas/user.schema";
import type { IAuthenticationService } from "@/services/authentication.service";
import type { IEmailVerificationService } from "@/services/email-verification.service";
import type { IUserRepository } from "@/repositories/user.repository";
import { AuthenticationService } from "@/services/authentication.service";
import { EmailVerificationService } from "@/services/email-verification.service";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import { MockDbRefreshTokenRepository } from "@/repositories/mockdb/refresh-token.mockdb.repository";
import { MongoDbRefreshTokenRepository } from "@/repositories/mongodb/refresh-token.mongodb.repository";
import { PasswordService } from "@/services/password.service";
import { JWTService } from "@/services/jwt.service";
import { BadRequestError, NotFoundError } from "@/errors";
import { env } from "@/env";

export interface UserControllerDeps {
  userRepository?: IUserRepository;
  authenticationService?: IAuthenticationService;
  emailVerificationService?: IEmailVerificationService;
}

export class UserController {
  private userRepository: IUserRepository;
  private authenticationService: IAuthenticationService;
  private emailVerificationService: IEmailVerificationService;

  constructor(deps?: UserControllerDeps) {
    if (
      deps?.userRepository &&
      deps?.authenticationService &&
      deps?.emailVerificationService
    ) {
      this.userRepository = deps.userRepository;
      this.authenticationService = deps.authenticationService;
      this.emailVerificationService = deps.emailVerificationService;
    } else {
      // Create default services with proper dependency injection
      this.userRepository =
        env.NODE_ENV === "test"
          ? new MockDbUserRepository()
          : new MongoDbUserRepository();

      const passwordService = new PasswordService();
      const jwtService = new JWTService();
      const refreshTokenRepository =
        env.NODE_ENV === "test"
          ? new MockDbRefreshTokenRepository()
          : new MongoDbRefreshTokenRepository();

      this.authenticationService = new AuthenticationService(
        this.userRepository,
        passwordService,
        jwtService,
        refreshTokenRepository
      );

      this.emailVerificationService = new EmailVerificationService(
        this.userRepository
      );
    }
  }

  /**
   * Get current user profile
   * GET /me
   */
  getProfile = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;

    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return c.json({
      success: true,
      user,
    });
  };

  /**
   * Update current user profile
   * PUT /me
   */
  updateProfile = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const body = c.var.validatedBody as UpdateUserType;

    const updatedUser = await this.userRepository.update(
      userContext.userId,
      body
    );

    return c.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  };

  /**
   * Change user password
   * PUT /me/password
   */
  changePassword = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const body = c.var.validatedBody as ChangePasswordType;

    await this.authenticationService.changePassword(
      userContext.userId,
      body.currentPassword,
      body.newPassword
    );

    return c.json({
      success: true,
      message: "Password changed successfully",
    });
  };

  /**
   * Add new email address to user account
   * POST /me/emails
   */
  addEmail = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const body = c.var.validatedBody as AddEmailType;

    // Check if email already exists for this user
    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const emailExists = user.emails.some(
      (email) => email.emailAddress === body.emailAddress
    );
    if (emailExists) {
      throw new BadRequestError("Email address already exists for this user");
    }

    // Check if email is already used by another user
    const existingUser = await this.userRepository.findByEmail(
      body.emailAddress
    );
    if (existingUser) {
      throw new BadRequestError(
        "Email address is already in use by another user"
      );
    }

    // Add email to user account
    const emailObject = {
      emailAddress: body.emailAddress,
      isVerified: false,
      addedAt: new Date(),
    };

    await this.userRepository.addEmail(userContext.userId, emailObject);

    // Generate verification token for the new email
    try {
      const verificationResult =
        await this.emailVerificationService.generateVerificationToken(
          userContext.userId,
          body.emailAddress
        );

      return c.json(
        {
          success: true,
          message: "Email added successfully. Verification email sent.",
          emailAddress: body.emailAddress,
          verificationEmailSent: true,
          // In development, include token for testing
          ...(env.NODE_ENV === "development" && {
            verificationToken: verificationResult.token,
            verificationExpiresAt: verificationResult.expiresAt,
          }),
        },
        201
      );
    } catch (error) {
      console.error("Failed to generate verification token:", error);
      return c.json(
        {
          success: true,
          message:
            "Email added successfully, but verification email could not be sent. Please try to resend verification.",
          emailAddress: body.emailAddress,
          verificationEmailSent: false,
        },
        201
      );
    }
  };

  /**
   * Remove email address from user account
   * DELETE /me/emails/:emailAddress
   */
  removeEmail = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const { emailAddress } = c.var.validatedParams as { emailAddress: string };

    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if this is the primary email
    if (user.primaryEmail === emailAddress) {
      throw new BadRequestError("Cannot remove primary email address");
    }

    // Check if email exists for this user
    const emailExists = user.emails.some(
      (email) => email.emailAddress === emailAddress
    );
    if (!emailExists) {
      throw new NotFoundError("Email address not found for this user");
    }

    await this.userRepository.removeEmail(userContext.userId, emailAddress);

    return c.json({
      success: true,
      message: "Email address removed successfully",
    });
  };

  /**
   * Set primary email address
   * PUT /me/emails/primary
   */
  setPrimaryEmail = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const body = c.var.validatedBody as SetPrimaryEmailType;

    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if email exists for this user and is verified
    const emailObj = user.emails.find(
      (email) => email.emailAddress === body.emailAddress
    );
    if (!emailObj) {
      throw new NotFoundError("Email address not found for this user");
    }

    if (!emailObj.isVerified) {
      throw new BadRequestError("Cannot set unverified email as primary");
    }

    await this.userRepository.setPrimaryEmail(
      userContext.userId,
      body.emailAddress
    );

    return c.json({
      success: true,
      message: "Primary email updated successfully",
      primaryEmail: body.emailAddress,
    });
  };

  /**
   * Resend verification email for specific email address
   * POST /me/emails/:emailAddress/resend-verification
   */
  resendEmailVerification = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const { emailAddress } = c.var.validatedParams as { emailAddress: string };

    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if email exists for this user
    const emailObj = user.emails.find(
      (email) => email.emailAddress === emailAddress
    );
    if (!emailObj) {
      throw new NotFoundError("Email address not found for this user");
    }

    if (emailObj.isVerified) {
      throw new BadRequestError("Email address is already verified");
    }

    const result = await this.emailVerificationService.resendVerificationEmail(
      userContext.userId,
      emailAddress
    );

    return c.json({
      success: true,
      message: result.message,
      emailAddress: result.emailAddress,
      // In development, include expiry info for testing
      ...(env.NODE_ENV === "development" && {
        verificationExpiresAt: result.expiresAt,
      }),
    });
  };

  /**
   * Get user's email addresses with verification status
   * GET /me/emails
   */
  getEmails = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;

    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Return emails without sensitive verification tokens
    const emails = user.emails.map((email) => ({
      emailAddress: email.emailAddress,
      isVerified: email.isVerified,
      isPrimary: email.emailAddress === user.primaryEmail,
      addedAt: email.addedAt,
    }));

    return c.json({
      success: true,
      emails,
      primaryEmail: user.primaryEmail,
    });
  };

  /**
   * Delete user account (requires password confirmation)
   * DELETE /me
   */
  deleteAccount = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;
    const body = await c.req.json();

    if (!body.password) {
      throw new BadRequestError(
        "Password confirmation is required to delete account"
      );
    }

    const user = await this.userRepository.findById(userContext.userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundError(
        "User not found or cannot delete social login account"
      );
    }

    // Verify password before deletion
    const passwordService = new PasswordService();
    const isPasswordValid = await passwordService.verifyPassword(
      body.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new BadRequestError("Invalid password");
    }

    await this.userRepository.delete(userContext.userId);

    return c.json({
      success: true,
      message: "Account deleted successfully",
    });
  };

  /**
   * Get user account summary
   * GET /me/summary
   */
  getAccountSummary = async (c: Context<AppEnv>): Promise<Response> => {
    const userContext = c.var.user as AuthenticatedUserContextType;

    const user = await this.userRepository.findById(userContext.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const summary = {
      userId: user.id,
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "No name set",
      primaryEmail: user.primaryEmail,
      globalRole: user.globalRole,
      emailCount: user.emails.length,
      verifiedEmails: user.emails.filter((email) => email.isVerified).length,
      socialIdentities: user.socialIdentities.length,
      accountStatus: {
        isLocked: user.isAccountLocked,
        failedLoginAttempts: user.failedLoginAttempts,
      },
      timestamps: {
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        passwordLastChangedAt: user.passwordLastChangedAt,
      },
    };

    return c.json({
      success: true,
      summary,
    });
  };
}
