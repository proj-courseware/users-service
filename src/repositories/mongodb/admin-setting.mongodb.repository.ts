import { type Db, type Collection, ObjectId } from "mongodb";
import type { AdminSettingType } from "@/schemas/user.schema";
import type { IAdminSettingRepository } from "@/repositories/admin-setting.repository";
import { getDatabase } from "@/config/mongodb.setup";
import { NotFoundError, InternalServerError } from "@/errors";

// MongoDB document type (with _id)
interface MongoAdminSettingDocument {
  _id: ObjectId;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: Date;
}

/**
 * MongoDB implementation of admin setting repository
 */
export class MongoDbAdminSettingRepository implements IAdminSettingRepository {
  private db: Db | null = null;
  private collection: Collection<any> | null = null;

  private async getCollection(): Promise<Collection<any>> {
    if (!this.collection) {
      this.db = await getDatabase();
      this.collection = this.db.collection("adminSettings");
      
      // Create indexes for better performance
      await this.collection.createIndex({ key: 1 }, { unique: true });
      await this.collection.createIndex({ updatedAt: 1 });
    }
    return this.collection;
  }

  /**
   * Convert MongoDB document to domain entity
   */
  private documentToEntity(doc: MongoAdminSettingDocument): AdminSettingType {
    return {
      id: doc._id.toHexString(),
      key: doc.key,
      value: doc.value,
      description: doc.description,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Convert domain entity to MongoDB document
   */
  private entityToDocument(entity: Omit<AdminSettingType, "id">): Omit<MongoAdminSettingDocument, "_id"> {
    return {
      key: entity.key,
      value: entity.value,
      description: entity.description,
      updatedAt: new Date(),
    };
  }

  async create(data: Omit<AdminSettingType, "id" | "updatedAt">): Promise<AdminSettingType> {
    try {
      const collection = await this.getCollection();
      
      const docToInsert = {
        key: data.key,
        value: data.value,
        description: data.description,
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(docToInsert);
      
      const insertedDoc = await collection.findOne({ _id: result.insertedId });
      if (!insertedDoc) {
        throw new InternalServerError("Failed to retrieve created admin setting");
      }

      return this.documentToEntity(insertedDoc);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate key")) {
        throw new InternalServerError(`Admin setting with key '${data.key}' already exists`);
      }
      throw new InternalServerError(`Failed to create admin setting: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async findByKey(key: string): Promise<AdminSettingType | null> {
    try {
      const collection = await this.getCollection();
      const doc = await collection.findOne({ key });
      return doc ? this.documentToEntity(doc) : null;
    } catch (error) {
      throw new InternalServerError(`Failed to find admin setting by key: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async findAll(): Promise<AdminSettingType[]> {
    try {
      const collection = await this.getCollection();
      const docs = await collection.find({}).sort({ key: 1 }).toArray();
      return docs.map(doc => this.documentToEntity(doc));
    } catch (error) {
      throw new InternalServerError(`Failed to find all admin settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async updateByKey(key: string, data: Partial<Omit<AdminSettingType, "id" | "key">>): Promise<AdminSettingType> {
    try {
      const collection = await this.getCollection();
      
      const updateData: Partial<Omit<MongoAdminSettingDocument, "_id" | "key">> = {
        updatedAt: new Date(),
      };

      if (data.value !== undefined) updateData.value = data.value;
      if (data.description !== undefined) updateData.description = data.description;

      const result = await collection.findOneAndUpdate(
        { key },
        { $set: updateData },
        { returnDocument: "after" }
      );

      if (!result) {
        throw new NotFoundError(`Admin setting with key '${key}' not found`);
      }

      return this.documentToEntity(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError(`Failed to update admin setting: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async deleteByKey(key: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({ key });
      return result.deletedCount > 0;
    } catch (error) {
      throw new InternalServerError(`Failed to delete admin setting: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async existsByKey(key: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const count = await collection.countDocuments({ key }, { limit: 1 });
      return count > 0;
    } catch (error) {
      throw new InternalServerError(`Failed to check admin setting existence: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getValue<T = unknown>(key: string, defaultValue?: T): Promise<T> {
    try {
      const setting = await this.findByKey(key);
      return setting?.value as T ?? defaultValue as T;
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  async setValue(key: string, value: unknown, description?: string): Promise<AdminSettingType> {
    try {
      const existing = await this.findByKey(key);
      
      if (existing) {
        return await this.updateByKey(key, { value, description });
      } else {
        return await this.create({ key, value, description });
      }
    } catch (error) {
      throw new InternalServerError(`Failed to set admin setting value: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getMultiple(keys: string[]): Promise<Map<string, unknown>> {
    try {
      const collection = await this.getCollection();
      const docs = await collection.find({ key: { $in: keys } }).toArray();
      
      const result = new Map<string, unknown>();
      docs.forEach(doc => {
        result.set(doc.key, doc.value);
      });
      
      return result;
    } catch (error) {
      throw new InternalServerError(`Failed to get multiple admin settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}