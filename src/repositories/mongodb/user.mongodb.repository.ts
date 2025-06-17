import { Collection, Db, ObjectId } from "mongodb";
import type { WithId, Filter, Sort } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import type { IUserRepository } from "@/repositories/user.repository";
import type {
  UserType,
  CreateUserType,
  EmailObjectType,
  SocialIdentityObjectType,
  UserQueryParamsType,
  SocialAuthProviderType,
} from "@/schemas/user.schema";
import { userSchema } from "@/schemas/user.schema";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginatedResultType,
} from "@/schemas/shared.schema";
import { getDatabase } from "@/config/mongodb.setup";

// MongoDB document interface (internal to repository)
// It's essentially our User schema but expects its primary key (_id) to be an ObjectId.
// The '_id' field in our User domain model will be derived from _id.toHexString().
interface MongoUserDocument
  extends Omit<UserType, "_id" | "createdAt" | "updatedAt"> {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoDbUserRepository implements IUserRepository {
  private collection: Collection<MongoUserDocument> | null = null;

  // Lazy load the collection when needed
  // This ensures we only connect to the database when we actually need to perform an operation
  // and not at the time of instantiation.
  // Although, in the current setup, we connect to the database when the application starts,
  // this pattern allows for better separation of concerns and makes testing easier.
  private async getCollection(): Promise<Collection<MongoUserDocument>> {
    if (!this.collection) {
      const db: Db = await getDatabase();
      this.collection = db.collection<MongoUserDocument>("users");
      await this.createIndexes(this.collection);
      console.log("👤 Users collection initialized");
    }
    return this.collection;
  }

  // createIndex is idempotent, so we can safely call it multiple times
  private async createIndexes(
    collection: Collection<MongoUserDocument>,
  ): Promise<void> {
    await Promise.all([
      collection.createIndex(
        { userId: 1 },
        { unique: true, name: "users_userId" },
      ),
      collection.createIndex(
        { primaryEmail: 1 },
        { unique: true, name: "users_primaryEmail" },
      ),
      collection.createIndex(
        { "emails.emailAddress": 1 },
        { name: "users_emails_emailAddress" },
      ),
      collection.createIndex(
        {
          "socialIdentities.provider": 1,
          "socialIdentities.providerUserId": 1,
        },
        { name: "users_socialIdentities" },
      ),
      collection.createIndex(
        { "emails.verificationToken": 1 },
        { sparse: true, name: "users_verificationToken" },
      ),
      collection.createIndex(
        { createdAt: -1 },
        { name: "users_createdAt_desc" },
      ),
      collection.createIndex({ globalRole: 1 }, { name: "users_globalRole" }),
    ]);
  }

  private mapDocumentToEntity(doc: WithId<MongoUserDocument>): UserType {
    const { _id, ...restOfDoc } = doc;
    
    // Convert null values to undefined for optional fields
    const cleanedDoc = {
      ...restOfDoc,
      _id: _id.toHexString(),
      firstName: restOfDoc.firstName === null ? undefined : restOfDoc.firstName,
      lastName: restOfDoc.lastName === null ? undefined : restOfDoc.lastName,
      passwordHash: restOfDoc.passwordHash === null ? undefined : restOfDoc.passwordHash,
      lastLoginAt: restOfDoc.lastLoginAt === null ? undefined : restOfDoc.lastLoginAt,
      passwordLastChangedAt: restOfDoc.passwordLastChangedAt === null ? undefined : restOfDoc.passwordLastChangedAt,
      // Clean up emails array - convert null values to undefined
      emails: restOfDoc.emails.map(email => ({
        ...email,
        verificationToken: email.verificationToken === null ? undefined : email.verificationToken,
        verificationTokenExpiresAt: email.verificationTokenExpiresAt === null ? undefined : email.verificationTokenExpiresAt,
      })),
      // Clean up social identities array - convert null values to undefined
      socialIdentities: restOfDoc.socialIdentities.map(identity => ({
        ...identity,
        email: identity.email === null ? undefined : identity.email,
        name: identity.name === null ? undefined : identity.name,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    
    return userSchema.parse(cleanedDoc);
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
      $or: [{ primaryEmail: email }, { "emails.emailAddress": email }],
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
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
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

  async findBySocialIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      socialIdentities: {
        $elemMatch: {
          provider,
          providerUserId,
        },
      },
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async findByVerificationToken(token: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      "emails.verificationToken": token,
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async addEmail(userId: string, email: EmailObjectType): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $push: { emails: email },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async verifyEmail(userId: string, emailAddress: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      {
        userId,
        "emails.emailAddress": emailAddress,
      },
      {
        $set: {
          "emails.$.isVerified": true,
          "emails.$.verificationToken": undefined,
          "emails.$.verificationTokenExpiresAt": undefined,
          updatedAt: new Date(),
        },
      },
    );
  }

  async removeEmail(userId: string, emailAddress: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $pull: { emails: { emailAddress } },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async setPrimaryEmail(userId: string, emailAddress: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $set: {
          primaryEmail: emailAddress,
          updatedAt: new Date(),
        },
      },
    );
  }

  async linkSocialIdentity(
    userId: string,
    socialIdentity: SocialIdentityObjectType,
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $push: { socialIdentities: socialIdentity },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async unlinkSocialIdentity(
    userId: string,
    provider: SocialAuthProviderType,
    providerUserId: string,
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $pull: {
          socialIdentities: {
            provider,
            providerUserId,
          },
        },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $set: {
          passwordHash,
          passwordLastChangedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateLoginAttempts(
    email: string,
    attempts: number,
    lockAccount = false,
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { primaryEmail: email },
      {
        $set: {
          failedLoginAttempts: attempts,
          isAccountLocked: lockAccount,
          updatedAt: new Date(),
        },
      },
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
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { userId },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
  }

  async findAll(
    queryParams: UserQueryParamsType = {},
  ): Promise<PaginatedResultType<UserType>> {
    const collection = await this.getCollection();

    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      role,
    } = queryParams;

    // Build the filter
    const filter: Filter<MongoUserDocument> = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { primaryEmail: { $regex: search, $options: "i" } },
        { "emails.emailAddress": { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      filter.globalRole = role;
    }

    // Build the sort
    const sort: Sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [documents, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    // Map to domain entities
    const users = documents.map((doc) => this.mapDocumentToEntity(doc));

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
