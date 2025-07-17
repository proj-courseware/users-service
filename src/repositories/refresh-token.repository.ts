import type {
  RefreshTokenType,
  CreateRefreshTokenType,
} from "@/schemas/user.schema";

export interface IRefreshTokenRepository {
  create(token: CreateRefreshTokenType): Promise<RefreshTokenType>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenType | null>;
  findByUserId(userId: string): Promise<RefreshTokenType[]>;
  revokeById(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  listActiveSessions(userId: string): Promise<RefreshTokenType[]>;
}
