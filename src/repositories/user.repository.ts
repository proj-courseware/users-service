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
  findById(id: string): Promise<UserType | null>;
  findByEmail(email: string): Promise<UserType | null>;
  update(id: string, updates: Partial<UserType>): Promise<UserType>;
  delete(id: string): Promise<void>;

  // Authentication-specific queries
  findBySocialIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<UserType | null>;
  findByVerificationToken(token: string): Promise<UserType | null>;
  findByEmailVerificationToken(token: string): Promise<UserType | null>;

  // Email management
  addEmail(id: string, email: EmailObjectType): Promise<void>;
  verifyEmail(id: string, emailAddress: string): Promise<void>;
  removeEmail(id: string, emailAddress: string): Promise<void>;
  setPrimaryEmail(id: string, emailAddress: string): Promise<void>;
  updateEmailVerificationToken(
    id: string,
    emailAddress: string,
    token: string,
    expiresAt: Date,
  ): Promise<void>;
  clearExpiredVerificationTokens(id: string): Promise<void>;

  // Social identity management
  linkSocialIdentity(
    id: string,
    socialIdentity: SocialIdentityObjectType,
  ): Promise<void>;
  unlinkSocialIdentity(
    id: string,
    provider: string,
    providerUserId: string,
  ): Promise<void>;

  // Security operations
  updatePassword(id: string, passwordHash: string): Promise<void>;
  updateLoginAttempts(
    email: string,
    attempts: number,
    lockAccount?: boolean,
  ): Promise<void>;
  unlockAccount(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;

  // Admin operations
  findAll(
    queryParams?: UserQueryParamsType,
  ): Promise<PaginatedResultType<UserType>>;
  findMany(
    queryParams?: Partial<UserQueryParamsType>,
    limit?: number,
  ): Promise<UserType[]>;
}
