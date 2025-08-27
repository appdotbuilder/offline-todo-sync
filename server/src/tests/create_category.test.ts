import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type AdminActionInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input for category creation
const testCategoryInput: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing',
  color: '#FF5733'
};

// Test admin user
const testAdminUser = {
  id: 'admin-user-123',
  email: 'admin@test.com',
  name: 'Admin User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: true
};

// Test non-admin user
const testNormalUser = {
  id: 'normal-user-456',
  email: 'user@test.com',
  name: 'Normal User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: false
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category when requested by admin', async () => {
    // Create admin user first
    await db.insert(usersTable).values(testAdminUser).execute();

    const adminAction: AdminActionInput = {
      admin_user_id: testAdminUser.id
    };

    const result = await createCategory(testCategoryInput, adminAction);

    // Verify returned category data
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('A category for testing');
    expect(result.color).toEqual('#FF5733');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    // Create admin user first
    await db.insert(usersTable).values(testAdminUser).execute();

    const adminAction: AdminActionInput = {
      admin_user_id: testAdminUser.id
    };

    const result = await createCategory(testCategoryInput, adminAction);

    // Query database to verify category was saved
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Test Category');
    expect(categories[0].description).toEqual('A category for testing');
    expect(categories[0].color).toEqual('#FF5733');
    expect(categories[0].created_at).toBeInstanceOf(Date);
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null optional fields correctly', async () => {
    // Create admin user first
    await db.insert(usersTable).values(testAdminUser).execute();

    const minimalCategoryInput: CreateCategoryInput = {
      name: 'Minimal Category'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: testAdminUser.id
    };

    const result = await createCategory(minimalCategoryInput, adminAction);

    expect(result.name).toEqual('Minimal Category');
    expect(result.description).toBeNull();
    expect(result.color).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should reject creation when user is not admin', async () => {
    // Create non-admin user
    await db.insert(usersTable).values(testNormalUser).execute();

    const adminAction: AdminActionInput = {
      admin_user_id: testNormalUser.id
    };

    await expect(createCategory(testCategoryInput, adminAction))
      .rejects.toThrow(/access denied.*admin privileges required/i);
  });

  it('should reject creation when user does not exist', async () => {
    const adminAction: AdminActionInput = {
      admin_user_id: 'non-existent-user'
    };

    await expect(createCategory(testCategoryInput, adminAction))
      .rejects.toThrow(/user not found/i);
  });

  it('should reject duplicate category names', async () => {
    // Create admin user first
    await db.insert(usersTable).values(testAdminUser).execute();

    // Create first category
    await db.insert(categoriesTable).values({
      name: 'Duplicate Category',
      description: 'First category',
      color: '#123456'
    }).execute();

    const duplicateCategoryInput: CreateCategoryInput = {
      name: 'Duplicate Category',
      description: 'Second category with same name',
      color: '#654321'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: testAdminUser.id
    };

    await expect(createCategory(duplicateCategoryInput, adminAction))
      .rejects.toThrow(/category name already exists/i);
  });

  it('should allow categories with same description but different names', async () => {
    // Create admin user first
    await db.insert(usersTable).values(testAdminUser).execute();

    // Create first category
    const firstCategoryInput: CreateCategoryInput = {
      name: 'First Category',
      description: 'Same description',
      color: '#123456'
    };

    const secondCategoryInput: CreateCategoryInput = {
      name: 'Second Category',
      description: 'Same description',
      color: '#654321'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: testAdminUser.id
    };

    const firstResult = await createCategory(firstCategoryInput, adminAction);
    const secondResult = await createCategory(secondCategoryInput, adminAction);

    expect(firstResult.name).toEqual('First Category');
    expect(secondResult.name).toEqual('Second Category');
    expect(firstResult.description).toEqual(secondResult.description);
    expect(firstResult.id).not.toEqual(secondResult.id);
  });
});