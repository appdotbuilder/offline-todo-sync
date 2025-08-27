import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateTodoInput } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: false
};

// Test category data
const testCategory = {
  name: 'Work',
  description: 'Work-related tasks',
  color: '#FF5733'
};

// Test todo input
const testTodoInput: CreateTodoInput = {
  user_id: 'user-123',
  category_id: null,
  title: 'Complete project documentation',
  description: 'Write comprehensive documentation for the new feature',
  due_date: new Date('2024-12-31'),
  priority: 'high',
  client_updated_at: new Date()
};

describe('createTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a todo successfully', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createTodo(testTodoInput);

    // Validate returned todo
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual('user-123');
    expect(result.category_id).toBeNull();
    expect(result.title).toEqual('Complete project documentation');
    expect(result.description).toEqual('Write comprehensive documentation for the new feature');
    expect(result.is_completed).toBe(false);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.priority).toEqual('high');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.last_synced_at).toBeInstanceOf(Date);
    expect(result.client_updated_at).toBeInstanceOf(Date);
  });

  it('should save todo to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createTodo(testTodoInput);

    // Query database to verify todo was saved
    const savedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(savedTodos).toHaveLength(1);
    const savedTodo = savedTodos[0];
    expect(savedTodo.user_id).toEqual('user-123');
    expect(savedTodo.title).toEqual('Complete project documentation');
    expect(savedTodo.description).toEqual('Write comprehensive documentation for the new feature');
    expect(savedTodo.is_completed).toBe(false);
    expect(savedTodo.priority).toEqual('high');
  });

  it('should create todo with category', async () => {
    // Create prerequisite user and category
    await db.insert(usersTable).values(testUser).execute();
    const categoryResult = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const categoryId = categoryResult[0].id;

    const todoWithCategory: CreateTodoInput = {
      ...testTodoInput,
      category_id: categoryId
    };

    const result = await createTodo(todoWithCategory);

    expect(result.category_id).toEqual(categoryId);

    // Verify in database
    const savedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(savedTodos[0].category_id).toEqual(categoryId);
  });

  it('should create todo with minimal fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const minimalInput: CreateTodoInput = {
      user_id: 'user-123',
      title: 'Simple task',
      priority: 'medium', // Required by TypeScript even though Zod has default
      client_updated_at: new Date() // Required by TypeScript even though Zod has default
    };

    const result = await createTodo(minimalInput);

    expect(result.title).toEqual('Simple task');
    expect(result.description).toBeNull();
    expect(result.category_id).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.priority).toEqual('medium'); // Default priority
    expect(result.is_completed).toBe(false);
    expect(result.last_synced_at).toBeInstanceOf(Date);
    expect(result.client_updated_at).toBeInstanceOf(Date);
  });

  it('should handle custom client_updated_at timestamp', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const customTimestamp = new Date('2024-01-15T10:30:00Z');
    const inputWithCustomTimestamp: CreateTodoInput = {
      ...testTodoInput,
      client_updated_at: customTimestamp
    };

    const result = await createTodo(inputWithCustomTimestamp);

    expect(result.client_updated_at).toEqual(customTimestamp);
  });

  it('should throw error if user does not exist', async () => {
    // Don't create user - test validation

    await expect(createTodo(testTodoInput))
      .rejects
      .toThrow(/User with id user-123 not found/i);
  });

  it('should throw error if category does not exist', async () => {
    // Create user but not category
    await db.insert(usersTable).values(testUser).execute();

    const todoWithInvalidCategory: CreateTodoInput = {
      ...testTodoInput,
      category_id: 999 // Non-existent category
    };

    await expect(createTodo(todoWithInvalidCategory))
      .rejects
      .toThrow(/Category with id 999 not found/i);
  });

  it('should handle null category_id correctly', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const todoWithNullCategory: CreateTodoInput = {
      ...testTodoInput,
      category_id: null
    };

    const result = await createTodo(todoWithNullCategory);

    expect(result.category_id).toBeNull();

    // Verify in database
    const savedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(savedTodos[0].category_id).toBeNull();
  });

  it('should set last_synced_at when todo is created on server', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const beforeCreate = new Date();
    const result = await createTodo(testTodoInput);
    const afterCreate = new Date();

    expect(result.last_synced_at).toBeInstanceOf(Date);
    expect(result.last_synced_at!.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.last_synced_at!.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should handle all priority levels', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

    for (const priority of priorities) {
      const todoInput: CreateTodoInput = {
        ...testTodoInput,
        title: `Task with ${priority} priority`,
        priority
      };

      const result = await createTodo(todoInput);
      expect(result.priority).toEqual(priority);
    }
  });
});