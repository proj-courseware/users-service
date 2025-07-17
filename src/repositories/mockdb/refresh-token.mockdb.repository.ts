import type {
  RefreshTokenType,
  CreateRefreshTokenType,
} from "@/schemas/user.schema";
import type { IRefreshTokenRepository } from "@/repositories/refresh-token.repository";
import { v4 as uuidv4 } from "uuid";

export class MockDbRefreshTokenRepository implements IRefreshTokenRepository {
  private tokens: RefreshTokenType[] = [];

  async create(token: CreateRefreshTokenType): Promise<RefreshTokenType> {
    const newToken: RefreshTokenType = {
      ...token,
      id: uuidv4(),
      createdAt: new Date(),
      isRevoked: token.isRevoked ?? false,
    };
    this.tokens.push(newToken);
    return newToken;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenType | null> {
    return this.tokens.find((t) => t.tokenHash === tokenHash) || null;
  }

  async findByUserId(userId: string): Promise<RefreshTokenType[]> {
    return this.tokens.filter((t) => t.userId === userId);
  }

  async revokeById(id: string): Promise<void> {
    const token = this.tokens.find((t) => t.id === id);
    if (token) token.isRevoked = true;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    this.tokens.forEach((t) => {
      if (t.userId === userId) t.isRevoked = true;
    });
  }

  async listActiveSessions(userId: string): Promise<RefreshTokenType[]> {
    const now = new Date();
    return this.tokens.filter(
      (t) => t.userId === userId && !t.isRevoked && t.expiresAt > now,
    );
  }
}
