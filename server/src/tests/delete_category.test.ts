import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, usersTable, todosTable } from '../db/schema';
import { type AdminActionInput, type CreateUserInput, type CreateCategoryInput, type CreateTodoInput } from '../schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

// Test data
const adminUser: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  auth_provider: 'email',
  is_admin: true
};

const regularUser: CreateUserInput = {
  email: 'user@example.com',
  name: 'Regular User',
  auth_provider: 'email',
  is_admin: false
};

const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing',
  color: '#FF0000'
};

describe('deleteCategory', () => {
  let adminUserId: string;
  let regularUserId: string;
  let categoryId: number;

  beforeEach(async () => {
    await createDB();

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        id: 'admin-123',
        email: adminUser.email,
        name: adminUser.name,
        auth_provider: adminUser.auth_provider,
        is_admin: adminUser.is_admin
      })
      .returning()
      .execute();
    adminUserId = adminResult[0].id;

    // Create regular user
    const userResult = await db.insert(usersTable)
      .values({
        id: 'user-123',
        email: regularUser.email,
        name: regularUser.name,
        auth_provider: regularUser.auth_provider,
        is_admin: regularUser.is_admin
      })
      .returning()
      .execute();
    regularUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description,
        color: testCategory.color
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  it('should successfully delete category when admin user makes request', async () => {
    const adminAction: AdminActionInput = {
      admin_user_id: adminUserId
    };

    const result = await deleteCategory(categoryId, adminAction);

    expect(result).toBe(true);

    // Verify category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should throw error when non-admin user attempts deletion', async () => {
    const adminAction: AdminActionInput = {
      admin_user_id: regularUserId
    };

    await expect(deleteCategory(categoryId, adminAction))
      .rejects.toThrow(/access denied.*admin privileges required/i);

    // Verify category was not deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should throw error when user does not exist', async () => {
    const adminAction: AdminActionInput = {
      admin_user_id: 'nonexistent-user'
    };

    await expect(deleteCategory(categoryId, adminAction))
      .rejects.toThrow(/access denied.*admin privileges required/i);

    // Verify category was not deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should throw error when category does not exist', async () => {
    const adminAction: AdminActionInput = {
      admin_user_id: adminUserId
    };

    const nonexistentCategoryId = 99999;

    await expect(deleteCategory(nonexistentCategoryId, adminAction))
      .rejects.toThrow(/category not found/i);
  });

  it('should prevent deletion when todos reference the category', async () => {
    // Create a todo that references the category
    const todoInput: CreateTodoInput = {
      user_id: adminUserId,
      category_id: categoryId,
      title: 'Test Todo',
      description: 'A todo for testing',
      priority: 'medium',
      client_updated_at: new Date()
    };

    await db.insert(todosTable)
      .values({
        user_id: todoInput.user_id,
        category_id: todoInput.category_id,
        title: todoInput.title,
        description: todoInput.description,
        priority: todoInput.priority,
        client_updated_at: todoInput.client_updated_at
      })
      .execute();

    const adminAction: AdminActionInput = {
      admin_user_id: adminUserId
    };

    await expect(deleteCategory(categoryId, adminAction))
      .rejects.toThrow(/cannot delete category.*todo.*assigned/i);

    // Verify category was not deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should allow deletion when category has no referencing todos', async () => {
    // Create a todo with no category (null category_id)
    const todoInput: CreateTodoInput = {
      user_id: adminUserId,
      category_id: null,
      title: 'Uncategorized Todo',
      description: 'A todo without category',
      priority: 'low',
      client_updated_at: new Date()
    };

    await db.insert(todosTable)
      .values({
        user_id: todoInput.user_id,
        category_id: todoInput.category_id,
        title: todoInput.title,
        description: todoInput.description,
        priority: todoInput.priority,
        client_updated_at: todoInput.client_updated_at
      })
      .execute();

    const adminAction: AdminActionInput = {
      admin_user_id: adminUserId
    };

    const result = await deleteCategory(categoryId, adminAction);

    expect(result).toBe(true);

    // Verify category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);

    // Verify the uncategorized todo still exists
    const todos = await db.select()
      .from(todosTable)
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].category_id).toBeNull();
  });

  it('should handle multiple todos referencing category correctly', async () => {
    // Create multiple todos that reference the category
    const todo1: CreateTodoInput = {
      user_id: adminUserId,
      category_id: categoryId,
      title: 'Todo 1',
      description: 'First todo',
      priority: 'high',
      client_updated_at: new Date()
    };

    const todo2: CreateTodoInput = {
      user_id: regularUserId,
      category_id: categoryId,
      title: 'Todo 2',
      description: 'Second todo',
      priority: 'low',
      client_updated_at: new Date()
    };

    await db.insert(todosTable)
      .values([
        {
          user_id: todo1.user_id,
          category_id: todo1.category_id,
          title: todo1.title,
          description: todo1.description,
          priority: todo1.priority,
          client_updated_at: todo1.client_updated_at
        },
        {
          user_id: todo2.user_id,
          category_id: todo2.category_id,
          title: todo2.title,
          description: todo2.description,
          priority: todo2.priority,
          client_updated_at: todo2.client_updated_at
        }
      ])
      .execute();

    const adminAction: AdminActionInput = {
      admin_user_id: adminUserId
    };

    await expect(deleteCategory(categoryId, adminAction))
      .rejects.toThrow(/cannot delete category.*2 todo.*assigned/i);

    // Verify category was not deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });
});