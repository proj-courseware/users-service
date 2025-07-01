import { Collection, Db, ObjectId } from "mongodb";
import type { WithId, Filter, Sort } from "mongodb";
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

// It's essentially our User schema but expects its primary key (_id) to be an ObjectId.
// The 'id' field in our User domain model will be derived from _id.toHexString().
interface MongoUserDocument
  extends Omit<UserType, "id" | "createdAt" | "updatedAt"> {
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
      id: _id.toHexString(),
      firstName: restOfDoc.firstName === null ? undefined : restOfDoc.firstName,
      lastName: restOfDoc.lastName === null ? undefined : restOfDoc.lastName,
      passwordHash:
        restOfDoc.passwordHash === null ? undefined : restOfDoc.passwordHash,
      lastLoginAt:
        restOfDoc.lastLoginAt === null ? undefined : restOfDoc.lastLoginAt,
      passwordLastChangedAt:
        restOfDoc.passwordLastChangedAt === null
          ? undefined
          : restOfDoc.passwordLastChangedAt,
      // Clean up emails array - convert null values to undefined
      emails: restOfDoc.emails.map((email) => ({
        ...email,
        verificationToken:
          email.verificationToken === null
            ? undefined
            : email.verificationToken,
        verificationTokenExpiresAt:
          email.verificationTokenExpiresAt === null
            ? undefined
            : email.verificationTokenExpiresAt,
      })),
      // Clean up social identities array - convert null values to undefined
      socialIdentities: restOfDoc.socialIdentities.map((identity) => ({
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
      firstName: data.firstName,
      lastName: data.lastName,
      primaryEmail: data.primaryEmail,
      passwordHash: data.passwordHash,
      globalRole: data.globalRole || "student",
      emails: data.emails || [
        {
          emailAddress: data.primaryEmail,
          isVerified: false,
          addedAt: now,
        },
      ],
      socialIdentities: data.socialIdentities || [],
      lastLoginAt: data.lastLoginAt,
      passwordLastChangedAt: data.passwordLastChangedAt,
      isAccountLocked: data.isAccountLocked || false,
      failedLoginAttempts: data.failedLoginAttempts || 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async create(userData: CreateUserType): Promise<UserType> {
    const collection = await this.getCollection();
    const documentToInsert = this.mapEntityToDocument(userData);

    const result = await collection.insertOne(documentToInsert);

    if (!result.insertedId) {
      throw new Error(
        "User creation failed, no ObjectId generated by database.",
      );
    }

    // Return the created user with the generated ID
    return userSchema.parse({
      ...documentToInsert,
      id: result.insertedId.toHexString(),
    });
  }

  async findById(id: string): Promise<UserType | null> {
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const collection = await this.getCollection();
    const document = await collection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return null;
    }

    return this.mapDocumentToEntity(document);
  }

  async findByEmail(email: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      $or: [{ primaryEmail: email }, { "emails.emailAddress": email }],
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async update(id: string, updates: Partial<UserType>): Promise<UserType> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();

    // Remove fields that shouldn't be updated directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: userId, createdAt, ...updateData } = updates;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
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

  async delete(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

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

  async findByEmailVerificationToken(token: string): Promise<UserType | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({
      "emails.verificationToken": token,
    });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async addEmail(id: string, email: EmailObjectType): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { emails: email },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async verifyEmail(id: string, emailAddress: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      {
        _id: new ObjectId(id),
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

  async removeEmail(id: string, emailAddress: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { emails: { emailAddress } },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async setPrimaryEmail(id: string, emailAddress: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          primaryEmail: emailAddress,
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateEmailVerificationToken(
    id: string,
    emailAddress: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      {
        _id: new ObjectId(id),
        "emails.emailAddress": emailAddress,
      },
      {
        $set: {
          "emails.$.verificationToken": token,
          "emails.$.verificationTokenExpiresAt": expiresAt,
          updatedAt: new Date(),
        },
      },
    );
  }

  async clearExpiredVerificationTokens(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          "emails.$[elem].verificationToken": undefined,
          "emails.$[elem].verificationTokenExpiresAt": undefined,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [
          {
            "elem.verificationTokenExpiresAt": { $lt: now },
          },
        ],
      },
    );
  }

  async linkSocialIdentity(
    id: string,
    socialIdentity: SocialIdentityObjectType,
  ): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { socialIdentities: socialIdentity },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async unlinkSocialIdentity(
    id: string,
    provider: SocialAuthProviderType,
    providerUserId: string,
  ): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
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

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
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
    lockUntil?: Date,
  ): Promise<void> {
    const collection = await this.getCollection();

    const updateData: {
      failedLoginAttempts: number;
      isAccountLocked: boolean;
      updatedAt: Date;
      accountLockedAt?: Date | null;
      accountLockedUntil?: Date | null;
    } = {
      failedLoginAttempts: attempts,
      isAccountLocked: lockAccount,
      updatedAt: new Date(),
    };

    if (lockAccount) {
      updateData.accountLockedAt = new Date();
      if (lockUntil) {
        updateData.accountLockedUntil = lockUntil;
      }
    } else {
      // Clear lockout timestamps when unlocking - we'll use $unset for these
    }

    const updateOperations: Record<string, unknown> = { $set: updateData };
    if (!lockAccount) {
      updateOperations.$unset = {
        accountLockedAt: "",
        accountLockedUntil: ""
      };
    }

    await collection.updateOne(
      { primaryEmail: email },
      updateOperations,
    );
  }

  async unlockAccount(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isAccountLocked: false,
          failedLoginAttempts: 0,
          updatedAt: new Date(),
        },
        $unset: {
          accountLockedAt: "",
          accountLockedUntil: ""
        },
      },
    );
  }

  async updateLastLogin(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error("User not found");
    }

    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
  }

  async isAccountCurrentlyLocked(email: string): Promise<boolean> {
    const collection = await this.getCollection();
    const user = await collection.findOne({ primaryEmail: email });

    if (!user) {
      return false; // User doesn't exist, not locked
    }

    // If account is not marked as locked, return false
    if (!user.isAccountLocked) {
      return false;
    }

    // If there's no lock expiry time, it's permanently locked
    if (!user.accountLockedUntil) {
      return true;
    }

    // Check if the lock has expired
    const now = new Date();
    return now < user.accountLockedUntil;
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

  async findMany(
    queryParams: Partial<UserQueryParamsType> = {},
    limit = 100,
  ): Promise<UserType[]> {
    const collection = await this.getCollection();

    const {
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

    // Execute query
    const documents = await collection
      .find(filter)
      .sort(sort)
      .limit(limit)
      .toArray();

    // Map to domain entities
    return documents.map((doc) => this.mapDocumentToEntity(doc));
  }
}
