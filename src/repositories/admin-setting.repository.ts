import type { AdminSettingType } from "@/schemas/user.schema";

/**
 * Interface for admin setting repository operations
 */
export interface IAdminSettingRepository {
  /**
   * Create a new admin setting
   * @param data - Setting data
   * @returns Created setting
   */
  create(
    data: Omit<AdminSettingType, "id" | "updatedAt">,
  ): Promise<AdminSettingType>;

  /**
   * Find setting by key
   * @param key - Setting key
   * @returns Setting or null if not found
   */
  findByKey(key: string): Promise<AdminSettingType | null>;

  /**
   * Get all settings
   * @returns Array of all settings
   */
  findAll(): Promise<AdminSettingType[]>;

  /**
   * Update setting by key
   * @param key - Setting key
   * @param data - Updated setting data
   * @returns Updated setting
   */
  updateByKey(
    key: string,
    data: Partial<Omit<AdminSettingType, "id" | "key">>,
  ): Promise<AdminSettingType>;

  /**
   * Delete setting by key
   * @param key - Setting key
   * @returns Success indicator
   */
  deleteByKey(key: string): Promise<boolean>;

  /**
   * Check if setting exists by key
   * @param key - Setting key
   * @returns True if exists
   */
  existsByKey(key: string): Promise<boolean>;

  /**
   * Get setting value by key with type casting
   * @param key - Setting key
   * @param defaultValue - Default value if not found
   * @returns Setting value or default
   */
  getValue<T = unknown>(key: string, defaultValue?: T): Promise<T>;

  /**
   * Set setting value by key (create or update)
   * @param key - Setting key
   * @param value - Setting value
   * @param description - Optional description
   * @returns Updated/created setting
   */
  setValue(
    key: string,
    value: unknown,
    description?: string,
  ): Promise<AdminSettingType>;

  /**
   * Get multiple settings by keys
   * @param keys - Array of setting keys
   * @returns Map of key-value pairs
   */
  getMultiple(keys: string[]): Promise<Map<string, unknown>>;
}
