import { type Collection, type Db, type WithId, ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import type { IUserRepository } from "@/repositories/user.repository";
import type {
  UserType,
  CreateUserType,
  EmailObjectType,
  SocialIdentityObjectType,
} from "@/schemas/user.schema";
import { userSchema } from "@/schemas/user.schema";

// MongoDB document interface (internal to repository)
interface MongoUserDocument extends Omit<UserType, "_id" | "userId"> {
  _id?: ObjectId;
  userId: string;
}

export class MongoDbUserRepository implements IUserRepository {
  private db: Db | null = null;
  private collection: Collection<MongoUserDocument> | null = null;

  constructor(db?: Db) {
    this.db = db;
  }

  async getCollection(): Promise<Collection<MongoUserDocument>> {
    if (!this.collection) {
      if (!this.db) {
        throw new Error("Database connection not initialized");
      }
      this.collection = this.db.collection<MongoUserDocument>("users");
      await this.createIndexes(this.collection);
    }
    return this.collection;
  }

  private async createIndexes(
    collection: Collection<MongoUserDocument>,
  ): Promise<void> {
    await Promise.all([
      collection.createIndex({ userId: 1 }, { unique: true, name: "users_userId" }),
      collection.createIndex({ primaryEmail: 1 }, { unique: true, name: "users_primaryEmail" }),
      collection.createIndex({ "emails.emailAddress": 1 }, { name: "users_emails_emailAddress" }),
      collection.createIndex(
        { "socialIdentities.provider": 1, "socialIdentities.providerUserId": 1 },
        { name: "users_socialIdentities" }
      ),
      collection.createIndex(
        { "emails.verificationToken": 1 },
        { sparse: true, name: "users_verificationToken" }
      ),
      collection.createIndex({ createdAt: -1 }, { name: "users_createdAt_desc" }),
    ]);
  }

  private mapDocumentToEntity(doc: WithId<MongoUserDocument>): UserType {
    const { _id, ...restOfDoc } = doc;
    return userSchema.parse({
      ...restOfDoc,
      _id: _id.toHexString(),
      userId: doc.userId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  private mapEntityToDocument(
    data: CreateUserType,
  ): Omit<MongoUserDocument, "_id"> {
    const now = new Date();
    return {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      primaryEmail: data.primaryEmail,
      passwordHash: data.passwordHash,
      globalRole: data.globalRole,
      emails: data.emails,
      socialIdentities: data.socialIdentities,
      lastLoginAt: data.lastLoginAt,
      passwordLastChangedAt: data.passwordLastChangedAt,
      isAccountLocked: data.isAccountLocked,
      failedLoginAttempts: data.failedLoginAttempts,
      createdAt: now,
      updatedAt: now,
    };
  }

  async create(userData: CreateUserType): Promise<UserType> {
    const collection = await this.getCollection();
    
    // Generate UUID if not provided
    const userWithId: CreateUserType = {
      ...userData,
      userId: userData.userId || uuidv4(),
    };

    const document = this.mapEntityToDocument(userWithId);
    const result = await collection.insertOne(document);
    
    const insertedDoc = await collection.findOne({ _id: result.insertedId });
    if (!insertedDoc) {
      throw new Error("Failed to retrieve created user");
    }
    
    return this.mapDocumentToEntity(insertedDoc);
  }

  async findByUserId(userId: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ userId });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      $or: [
        { primaryEmail: email },
        { "emails.emailAddress": email }
      ]
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async findById(id: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async update(userId: string, updates: Partial<UserType>): Promise<UserType> {
    const collection = await this.getCollection();
    
    // Remove fields that shouldn't be updated directly
    const { _id, userId: _, createdAt, ...updateData } = updates;
    
    const result = await collection.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          ...updateData, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("User not found");
    }

    return this.mapDocumentToEntity(result);
  }

  async delete(userId: string): Promise<void> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ userId });
    
    if (result.deletedCount === 0) {
      throw new Error("User not found");
    }
  }

  // Placeholder implementations for other methods
  async findBySocialIdentity(provider: string, providerUserId: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      "socialIdentities": {
        $elemMatch: {
          provider,
          providerUserId
        }
      }
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async findByVerificationToken(token: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      "emails.verificationToken": token
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  // TODO: Implement remaining methods
  async addEmail(userId: string, email: EmailObjectType): Promise<void> {
    throw new Error("Method not implemented yet");
  }

  async verifyEmail(userId: string, emailAddress: string): Promise<void> {
    throw new Error("Method not implemented yet");
  }

  async removeEmail(userId: string, emailAddress: string): Promise<void> {
    throw new Error("Method not implemented yet");
  }

  async setPrimaryEmail(userId: string, emailAddress: string): Promise<void> {
    throw new Error("Method not implemented yet");
  }

  async linkSocialIdentity(userId: string, socialIdentity: SocialIdentityObjectType): Promise<void> {
    throw new Error("Method not implemented yet");
  }

  async unlinkSocialIdentity(userId: string, provider: string, providerUserId: string): Promise<void> {
    throw new Error("Method not implemented yet");
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      { 
        $set: { 
          passwordHash, 
          passwordLastChangedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );
  }

  async updateLoginAttempts(email: string, attempts: number, lockAccount = false): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { primaryEmail: email },
      { 
        $set: { 
          failedLoginAttempts: attempts,
          isAccountLocked: lockAccount,
          updatedAt: new Date()
        } 
      }
    );
  }

  async unlockAccount(userId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      { 
        $set: { 
          isAccountLocked: false,
          failedLoginAttempts: 0,
          updatedAt: new Date()
        } 
      }
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      { 
        $set: { 
          lastLoginAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    role?: string;
  } = {}): Promise<{
    users: UserType[];
    total: number;
    page: number;
    limit: number;
  }> {
    throw new Error("Method not implemented yet");
  }
}