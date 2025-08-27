import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, todosTable } from '../db/schema';
import { type UpdateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: string;
  let testCategoryId: number;
  let testTodoId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        auth_provider: 'email'
      })
      .returning()
      .execute();
    testUserId = users[0].id;

    // Create test category
    const categories = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing',
        color: '#FF0000'
      })
      .returning()
      .execute();
    testCategoryId = categories[0].id;

    // Create test todo
    const todos = await db.insert(todosTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        title: 'Original Todo',
        description: 'Original description',
        is_completed: false,
        priority: 'medium',
        due_date: new Date('2024-12-25'),
        client_updated_at: new Date()
      })
      .returning()
      .execute();
    testTodoId = todos[0].id;
  });

  it('should update a todo with all fields', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      title: 'Updated Todo Title',
      description: 'Updated description',
      is_completed: true,
      priority: 'high',
      due_date: new Date('2024-12-31'),
      category_id: testCategoryId,
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toBe(testTodoId);
    expect(result.title).toBe('Updated Todo Title');
    expect(result.description).toBe('Updated description');
    expect(result.is_completed).toBe(true);
    expect(result.priority).toBe('high');
    expect(result.due_date).toEqual(new Date('2024-12-31'));
    expect(result.category_id).toBe(testCategoryId);
    expect(result.user_id).toBe(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.client_updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      title: 'Partially Updated Title',
      is_completed: true,
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.title).toBe('Partially Updated Title');
    expect(result.is_completed).toBe(true);
    // Other fields should remain unchanged
    expect(result.description).toBe('Original description');
    expect(result.priority).toBe('medium');
    expect(result.due_date).toEqual(new Date('2024-12-25'));
    expect(result.category_id).toBe(testCategoryId);
  });

  it('should update category to null', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      category_id: null,
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.category_id).toBe(null);
    expect(result.title).toBe('Original Todo'); // Other fields unchanged
  });

  it('should update due_date to null', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      due_date: null,
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.due_date).toBe(null);
    expect(result.title).toBe('Original Todo'); // Other fields unchanged
  });

  it('should update description to null', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      description: null,
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.description).toBe(null);
    expect(result.title).toBe('Original Todo'); // Other fields unchanged
  });

  it('should save updated todo to database', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      title: 'Database Updated Title',
      is_completed: true,
      client_updated_at: new Date()
    };

    await updateTodo(updateInput);

    // Verify the update was persisted
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Database Updated Title');
    expect(todos[0].is_completed).toBe(true);
    expect(todos[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update client_updated_at timestamp', async () => {
    const clientTimestamp = new Date('2024-01-15T10:30:00Z');
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      title: 'Timestamp Test',
      client_updated_at: clientTimestamp
    };

    const result = await updateTodo(updateInput);

    expect(result.client_updated_at).toEqual(clientTimestamp);
  });

  it('should throw error when todo does not exist', async () => {
    const updateInput: UpdateTodoInput = {
      id: 99999,
      title: 'Non-existent Todo',
      client_updated_at: new Date()
    };

    expect(updateTodo(updateInput)).rejects.toThrow(/Todo with ID 99999 not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      category_id: 99999,
      client_updated_at: new Date()
    };

    expect(updateTodo(updateInput)).rejects.toThrow(/Category with ID 99999 not found/i);
  });

  it('should handle updating to existing valid category', async () => {
    // Create another category
    const newCategories = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        color: '#00FF00'
      })
      .returning()
      .execute();
    const newCategoryId = newCategories[0].id;

    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      category_id: newCategoryId,
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.category_id).toBe(newCategoryId);
  });

  it('should preserve original timestamps when not updated', async () => {
    // Get original timestamps
    const originalTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();
    const originalCreatedAt = originalTodos[0].created_at;

    const updateInput: UpdateTodoInput = {
      id: testTodoId,
      title: 'Preserve Timestamps',
      client_updated_at: new Date()
    };

    const result = await updateTodo(updateInput);

    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.updated_at).not.toEqual(originalCreatedAt); // Should be newer
  });

  it('should update all priority levels correctly', async () => {
    const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

    for (const priority of priorities) {
      const updateInput: UpdateTodoInput = {
        id: testTodoId,
        priority: priority,
        client_updated_at: new Date()
      };

      const result = await updateTodo(updateInput);
      expect(result.priority).toBe(priority);
    }
  });
});