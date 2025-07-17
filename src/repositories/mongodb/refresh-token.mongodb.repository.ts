import { Collection, ObjectId, Db } from "mongodb";
import type {
  RefreshTokenType,
  CreateRefreshTokenType,
} from "@/schemas/user.schema";
import type { IRefreshTokenRepository } from "@/repositories/refresh-token.repository";
import { getDatabase } from "@/config/mongodb.setup";

export class MongoDbRefreshTokenRepository implements IRefreshTokenRepository {
  private collection: Collection<RefreshTokenType> | null = null;

  private async getCollection(): Promise<Collection<RefreshTokenType>> {
    if (!this.collection) {
      const db: Db = await getDatabase();
      this.collection = db.collection<RefreshTokenType>("refresh_tokens");
    }
    return this.collection;
  }

  async create(token: CreateRefreshTokenType): Promise<RefreshTokenType> {
    const collection = await this.getCollection();
    const doc = { ...token, createdAt: new Date() };
    const result = await collection.insertOne(doc as RefreshTokenType);
    return { ...doc, id: result.insertedId.toHexString() } as RefreshTokenType;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ tokenHash });
    return doc ? { ...doc, id: doc._id?.toHexString?.() ?? doc.id } : null;
  }

  async findByUserId(userId: string): Promise<RefreshTokenType[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ userId }).toArray();
    return docs.map((doc) => ({
      ...doc,
      id: doc._id?.toHexString?.() ?? doc.id,
    }));
  }

  async revokeById(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRevoked: true } },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateMany({ userId }, { $set: { isRevoked: true } });
  }

  async listActiveSessions(userId: string): Promise<RefreshTokenType[]> {
    const collection = await this.getCollection();
    const docs = await collection
      .find({ userId, isRevoked: false, expiresAt: { $gt: new Date() } })
      .toArray();
    return docs.map((doc) => ({
      ...doc,
      id: doc._id?.toHexString?.() ?? doc.id,
    }));
  }
}
