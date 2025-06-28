import { v4 as uuidv4 } from "uuid";
import type { AdminSettingType } from "@/schemas/user.schema";
import type { IAdminSettingRepository } from "@/repositories/admin-setting.repository";
import { NotFoundError, InternalServerError } from "@/errors";

/**
 * In-memory implementation of admin setting repository for testing
 */
export class MockDbAdminSettingRepository implements IAdminSettingRepository {
  private settings: AdminSettingType[] = [];

  /**
   * Reset the mock database (useful for testing)
   */
  reset(): void {
    this.settings = [];
  }

  /**
   * Get current data (useful for testing)
   */
  getData(): AdminSettingType[] {
    return [...this.settings];
  }

  /**
   * Seed with initial data (useful for testing)
   */
  seed(settings: AdminSettingType[]): void {
    this.settings = [...settings];
  }

  async create(data: Omit<AdminSettingType, "id" | "updatedAt">): Promise<AdminSettingType> {
    // Check if key already exists
    const existing = this.settings.find(s => s.key === data.key);
    if (existing) {
      throw new InternalServerError(`Admin setting with key '${data.key}' already exists`);
    }

    const setting: AdminSettingType = {
      id: uuidv4(),
      key: data.key,
      value: data.value,
      description: data.description,
      updatedAt: new Date(),
    };

    this.settings.push(setting);
    return { ...setting };
  }

  async findByKey(key: string): Promise<AdminSettingType | null> {
    const setting = this.settings.find(s => s.key === key);
    return setting ? { ...setting } : null;
  }

  async findAll(): Promise<AdminSettingType[]> {
    return this.settings
      .map(setting => ({ ...setting }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  async updateByKey(key: string, data: Partial<Omit<AdminSettingType, "id" | "key">>): Promise<AdminSettingType> {
    const index = this.settings.findIndex(s => s.key === key);
    if (index === -1) {
      throw new NotFoundError(`Admin setting with key '${key}' not found`);
    }

    const current = this.settings[index];
    const updated: AdminSettingType = {
      ...current,
      ...data,
      updatedAt: new Date(),
    };

    this.settings[index] = updated;
    return { ...updated };
  }

  async deleteByKey(key: string): Promise<boolean> {
    const index = this.settings.findIndex(s => s.key === key);
    if (index === -1) {
      return false;
    }

    this.settings.splice(index, 1);
    return true;
  }

  async existsByKey(key: string): Promise<boolean> {
    return this.settings.some(s => s.key === key);
  }

  async getValue<T = unknown>(key: string, defaultValue?: T): Promise<T> {
    const setting = await this.findByKey(key);
    return setting?.value as T ?? defaultValue as T;
  }

  async setValue(key: string, value: unknown, description?: string): Promise<AdminSettingType> {
    const existing = await this.findByKey(key);
    
    if (existing) {
      return await this.updateByKey(key, { value, description });
    } else {
      return await this.create({ key, value, description });
    }
  }

  async getMultiple(keys: string[]): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();
    
    for (const key of keys) {
      const setting = this.settings.find(s => s.key === key);
      if (setting) {
        result.set(key, setting.value);
      }
    }
    
    return result;
  }
}