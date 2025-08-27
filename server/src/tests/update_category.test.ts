import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, usersTable } from '../db/schema';
import { type UpdateCategoryInput, type AdminActionInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Test data
const adminUser = {
  id: 'admin123',
  email: 'admin@test.com',
  name: 'Admin User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: true
};

const regularUser = {
  id: 'user123',
  email: 'user@test.com',
  name: 'Regular User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: false
};

const testCategory = {
  name: 'Original Category',
  description: 'Original description',
  color: '#FF0000'
};

const secondCategory = {
  name: 'Second Category',
  description: 'Another category',
  color: '#00FF00'
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category with all fields', async () => {
    // Create admin user and category
    await db.insert(usersTable).values(adminUser).execute();
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category',
      description: 'Updated description',
      color: '#0000FF'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    const result = await updateCategory(updateInput, adminAction);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category');
    expect(result.description).toEqual('Updated description');
    expect(result.color).toEqual('#0000FF');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > category.updated_at).toBe(true);
  });

  it('should update category with partial fields', async () => {
    // Create admin user and category
    await db.insert(usersTable).values(adminUser).execute();
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Partially Updated'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    const result = await updateCategory(updateInput, adminAction);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Partially Updated');
    expect(result.description).toEqual(testCategory.description); // Should remain unchanged
    expect(result.color).toEqual(testCategory.color); // Should remain unchanged
  });

  it('should save updated category to database', async () => {
    // Create admin user and category
    await db.insert(usersTable).values(adminUser).execute();
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Database Test Category',
      description: 'Testing database persistence'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    await updateCategory(updateInput, adminAction);

    // Verify changes were saved to database
    const savedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(savedCategory).toHaveLength(1);
    expect(savedCategory[0].name).toEqual('Database Test Category');
    expect(savedCategory[0].description).toEqual('Testing database persistence');
    expect(savedCategory[0].color).toEqual(testCategory.color); // Should remain unchanged
  });

  it('should throw error when user is not admin', async () => {
    // Create regular user and category
    await db.insert(usersTable).values(regularUser).execute();
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Unauthorized Update'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: regularUser.id
    };

    await expect(updateCategory(updateInput, adminAction))
      .rejects.toThrow(/access denied.*admin privileges required/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create category without creating user
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Nonexistent User Update'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: 'nonexistent123'
    };

    await expect(updateCategory(updateInput, adminAction))
      .rejects.toThrow(/access denied.*admin privileges required/i);
  });

  it('should throw error when category does not exist', async () => {
    // Create admin user only
    await db.insert(usersTable).values(adminUser).execute();

    const updateInput: UpdateCategoryInput = {
      id: 99999, // Non-existent category ID
      name: 'Update Nonexistent'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    await expect(updateCategory(updateInput, adminAction))
      .rejects.toThrow(/category not found/i);
  });

  it('should throw error when name conflicts with existing category', async () => {
    // Create admin user and two categories
    await db.insert(usersTable).values(adminUser).execute();
    const [category1] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    await db.insert(categoriesTable)
      .values(secondCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category1.id,
      name: 'Second Category' // This name already exists
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    await expect(updateCategory(updateInput, adminAction))
      .rejects.toThrow(/category name already exists/i);
  });

  it('should allow updating category to same name', async () => {
    // Create admin user and category
    await db.insert(usersTable).values(adminUser).execute();
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: testCategory.name, // Same name as existing
      description: 'Updated description'
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    const result = await updateCategory(updateInput, adminAction);

    expect(result.name).toEqual(testCategory.name);
    expect(result.description).toEqual('Updated description');
  });

  it('should handle null values for optional fields', async () => {
    // Create admin user and category with values
    await db.insert(usersTable).values(adminUser).execute();
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: null,
      color: null
    };

    const adminAction: AdminActionInput = {
      admin_user_id: adminUser.id
    };

    const result = await updateCategory(updateInput, adminAction);

    expect(result.name).toEqual(testCategory.name); // Should remain unchanged
    expect(result.description).toBeNull();
    expect(result.color).toBeNull();
  });
});