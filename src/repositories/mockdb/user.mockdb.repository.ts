import { v4 as uuidv4 } from "uuid";
import type {
  UserType,
  CreateUserType,
  EmailObjectType,
  SocialIdentityObjectType,
  UserQueryParamsType,
} from "@/schemas/user.schema";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginatedResultType,
} from "@/schemas/shared.schema";
import type { IUserRepository } from "@/repositories/user.repository";

export class MockDbUserRepository implements IUserRepository {
  private users: UserType[] = [];

  private applyQueryParams(
    users: UserType[],
    params: UserQueryParamsType,
  ): PaginatedResultType<UserType> {
    let filteredUsers = users;

    // Filter by role
    if (params.role) {
      filteredUsers = filteredUsers.filter(
        (user) => user.globalRole === params.role,
      );
    }

    // Search by name or email
    const searchTerm = params.search?.toLowerCase().trim();
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchTerm) ||
          user.lastName?.toLowerCase().includes(searchTerm) ||
          user.primaryEmail.toLowerCase().includes(searchTerm) ||
          user.emails.some((email) =>
            email.emailAddress.toLowerCase().includes(searchTerm),
          ),
      );
    }

    // Pagination
    const page = params.page ?? DEFAULT_PAGE;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    let paginatedUsers = filteredUsers.slice(skip, skip + limit);
    const totalPages = Math.ceil(filteredUsers.length / limit);

    // Sorting
    const sortBy = (params.sortBy ?? "createdAt") as keyof UserType;
    const sortOrder = params.sortOrder;
    if (sortBy) {
      paginatedUsers = paginatedUsers.sort((a, b) => {
        if (sortOrder === "asc") {
          return (
            a[sortBy]?.toString().localeCompare(b[sortBy]?.toString() ?? "") ??
            0
          );
        } else if (sortOrder === "desc") {
          return (
            b[sortBy]?.toString().localeCompare(a[sortBy]?.toString() ?? "") ??
            0
          );
        }
        return 0;
      });
    }

    return {
      data: paginatedUsers,
      total: filteredUsers.length,
      page,
      limit,
      totalPages,
    };
  }

  async create(data: CreateUserType): Promise<UserType> {
    const now = new Date();
    const newUser: UserType = {
      id: uuidv4(),
      ...data,
      globalRole: data.globalRole || "student",
      emails: data.emails || [
        {
          emailAddress: data.primaryEmail,
          isVerified: false,
          addedAt: now,
        },
      ],
      socialIdentities: data.socialIdentities || [],
      isAccountLocked: data.isAccountLocked || false,
      failedLoginAttempts: data.failedLoginAttempts || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(newUser);
    return newUser;
  }

  async findById(id: string): Promise<UserType | null> {
    const user = this.users.find((u) => u.id === id);
    return user || null;
  }

  async findByEmail(email: string): Promise<UserType | null> {
    const user = this.users.find(
      (u) =>
        u.primaryEmail === email ||
        u.emails.some((e) => e.emailAddress === email),
    );
    return user || null;
  }

  async update(id: string, updates: Partial<UserType>): Promise<UserType> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error("User not found");
    }

    const existingUser = this.users[userIndex];
    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };
    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const initialLength = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    if (this.users.length === initialLength) {
      throw new Error("User not found");
    }
  }

  async findBySocialIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<UserType | null> {
    const user = this.users.find((u) =>
      u.socialIdentities.some(
        (identity) =>
          identity.provider === provider &&
          identity.providerUserId === providerUserId,
      ),
    );
    return user || null;
  }

  async findByVerificationToken(token: string): Promise<UserType | null> {
    const user = this.users.find((u) =>
      u.emails.some((email) => email.verificationToken === token),
    );
    return user || null;
  }

  async addEmail(id: string, email: EmailObjectType): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if email already exists for this user
    const emailExists = user.emails.some(
      (e) => e.emailAddress === email.emailAddress,
    );
    if (emailExists) {
      throw new Error("Email already exists for this user");
    }

    user.emails.push(email);
    user.updatedAt = new Date();
  }

  async verifyEmail(id: string, emailAddress: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const emailIndex = user.emails.findIndex(
      (e) => e.emailAddress === emailAddress,
    );
    if (emailIndex === -1) {
      throw new Error("Email not found for this user");
    }

    user.emails[emailIndex].isVerified = true;
    user.emails[emailIndex].verificationToken = undefined;
    user.emails[emailIndex].verificationTokenExpiresAt = undefined;
    user.updatedAt = new Date();
  }

  async removeEmail(id: string, emailAddress: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const emailIndex = user.emails.findIndex(
      (e) => e.emailAddress === emailAddress,
    );
    if (emailIndex === -1) {
      throw new Error("Email not found for this user");
    }

    // For now, we don't track isPrimary in this mock - just prevent removing the primary email address
    if (user.emails[emailIndex].emailAddress === user.primaryEmail) {
      throw new Error("Cannot remove primary email");
    }

    user.emails.splice(emailIndex, 1);
    user.updatedAt = new Date();
  }

  async setPrimaryEmail(id: string, emailAddress: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const emailIndex = user.emails.findIndex(
      (e) => e.emailAddress === emailAddress,
    );
    if (emailIndex === -1) {
      throw new Error("Email not found for this user");
    }

    // Set new primary email
    user.primaryEmail = emailAddress;
    user.updatedAt = new Date();
  }

  async linkSocialIdentity(
    id: string,
    socialIdentity: SocialIdentityObjectType,
  ): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if social identity already exists for this user
    const identityExists = user.socialIdentities.some(
      (identity) =>
        identity.provider === socialIdentity.provider &&
        identity.providerUserId === socialIdentity.providerUserId,
    );
    if (identityExists) {
      throw new Error("Social identity already linked to this user");
    }

    user.socialIdentities.push(socialIdentity);
    user.updatedAt = new Date();
  }

  async unlinkSocialIdentity(
    id: string,
    provider: string,
    providerUserId: string,
  ): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const identityIndex = user.socialIdentities.findIndex(
      (identity) =>
        identity.provider === provider &&
        identity.providerUserId === providerUserId,
    );
    if (identityIndex === -1) {
      throw new Error("Social identity not found for this user");
    }

    user.socialIdentities.splice(identityIndex, 1);
    user.updatedAt = new Date();
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    user.passwordHash = passwordHash;
    user.passwordLastChangedAt = new Date();
    user.updatedAt = new Date();
  }

  async updateLoginAttempts(
    email: string,
    attempts: number,
    lockAccount?: boolean,
  ): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    user.failedLoginAttempts = attempts;
    if (lockAccount) {
      user.isAccountLocked = true;
    }
    user.updatedAt = new Date();
  }

  async unlockAccount(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    user.failedLoginAttempts = 0;
    user.isAccountLocked = false;
    user.updatedAt = new Date();
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    user.lastLoginAt = new Date();
    user.updatedAt = new Date();
  }

  async findAll(
    queryParams: UserQueryParamsType = {},
  ): Promise<PaginatedResultType<UserType>> {
    return this.applyQueryParams(this.users, queryParams);
  }

  // Helper method for testing: clear all users
  clear(): void {
    this.users = [];
  }
}
