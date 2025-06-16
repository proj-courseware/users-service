import type {
  UserType,
  CreateUserType,
  EmailObjectType,
  SocialIdentityObjectType,
  UserQueryParamsType,
} from "@/schemas/user.schema";
import type { PaginatedResultType } from "@/schemas/shared.schema";

export interface IUserRepository {
  // Core CRUD operations
  create(user: CreateUserType): Promise<UserType>;
  findByUserId(userId: string): Promise<UserType | null>;
  findByEmail(email: string): Promise<UserType | null>;
  findById(id: string): Promise<UserType | null>; // MongoDB _id
  update(userId: string, updates: Partial<UserType>): Promise<UserType>;
  delete(userId: string): Promise<void>;

  // Authentication-specific queries
  findBySocialIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<UserType | null>;
  findByVerificationToken(token: string): Promise<UserType | null>;

  // Email management
  addEmail(userId: string, email: EmailObjectType): Promise<void>;
  verifyEmail(userId: string, emailAddress: string): Promise<void>;
  removeEmail(userId: string, emailAddress: string): Promise<void>;
  setPrimaryEmail(userId: string, emailAddress: string): Promise<void>;

  // Social identity management
  linkSocialIdentity(
    userId: string,
    socialIdentity: SocialIdentityObjectType,
  ): Promise<void>;
  unlinkSocialIdentity(
    userId: string,
    provider: string,
    providerUserId: string,
  ): Promise<void>;

  // Security operations
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateLoginAttempts(
    email: string,
    attempts: number,
    lockAccount?: boolean,
  ): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;

  // Admin operations
  findAll(
    queryParams?: UserQueryParamsType,
  ): Promise<PaginatedResultType<UserType>>;
}