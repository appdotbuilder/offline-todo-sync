import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, todosTable } from '../db/schema';
import { type GetTodosInput } from '../schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helpers
  const createTestUser = async (id: string = 'test-user-1') => {
    await db.insert(usersTable).values({
      id,
      email: `${id}@test.com`,
      name: `Test User ${id}`,
      auth_provider: 'email'
    }).execute();
    return id;
  };

  const createTestCategory = async () => {
    const result = await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: 'A test category',
      color: '#FF0000'
    }).returning().execute();
    return result[0].id;
  };

  const createTestTodo = async (userId: string, overrides: any = {}) => {
    const result = await db.insert(todosTable).values({
      user_id: userId,
      title: 'Test Todo',
      description: 'A test todo item',
      is_completed: false,
      priority: 'medium',
      client_updated_at: new Date(),
      ...overrides
    }).returning().execute();
    return result[0];
  };

  it('should fetch todos for a specific user', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser('other-user');
    
    // Create todos for both users
    await createTestTodo(userId, { title: 'User 1 Todo' });
    await createTestTodo(otherUserId, { title: 'User 2 Todo' });

    const input: GetTodosInput = { user_id: userId };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Todo');
    expect(result[0].user_id).toEqual(userId);
  });

  it('should filter todos by category', async () => {
    const userId = await createTestUser();
    const categoryId = await createTestCategory();
    
    // Create todos with and without category
    await createTestTodo(userId, { title: 'Categorized Todo', category_id: categoryId });
    await createTestTodo(userId, { title: 'Uncategorized Todo', category_id: null });

    const input: GetTodosInput = { user_id: userId, category_id: categoryId };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Categorized Todo');
    expect(result[0].category_id).toEqual(categoryId);
  });

  it('should filter todos by completion status', async () => {
    const userId = await createTestUser();
    
    // Create completed and incomplete todos
    await createTestTodo(userId, { title: 'Completed Todo', is_completed: true });
    await createTestTodo(userId, { title: 'Incomplete Todo', is_completed: false });

    const input: GetTodosInput = { user_id: userId, is_completed: true };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Completed Todo');
    expect(result[0].is_completed).toBe(true);
  });

  it('should filter todos by due date range', async () => {
    const userId = await createTestUser();
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Create todos with different due dates
    await createTestTodo(userId, { title: 'Due Tomorrow', due_date: tomorrow });
    await createTestTodo(userId, { title: 'Due Next Week', due_date: nextWeek });
    await createTestTodo(userId, { title: 'No Due Date', due_date: null });

    // Test due_before filter
    const inputBefore: GetTodosInput = { user_id: userId, due_before: tomorrow };
    const resultBefore = await getTodos(inputBefore);
    
    expect(resultBefore).toHaveLength(1);
    expect(resultBefore[0].title).toEqual('Due Tomorrow');

    // Test due_after filter
    const inputAfter: GetTodosInput = { user_id: userId, due_after: tomorrow };
    const resultAfter = await getTodos(inputAfter);
    
    expect(resultAfter).toHaveLength(2); // Tomorrow and next week todos
  });

  it('should filter todos by priority', async () => {
    const userId = await createTestUser();
    
    // Create todos with different priorities
    await createTestTodo(userId, { title: 'High Priority', priority: 'high' });
    await createTestTodo(userId, { title: 'Medium Priority', priority: 'medium' });
    await createTestTodo(userId, { title: 'Low Priority', priority: 'low' });

    const input: GetTodosInput = { user_id: userId, priority: 'high' };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('High Priority');
    expect(result[0].priority).toEqual('high');
  });

  it('should support incremental sync by last_synced_after', async () => {
    const userId = await createTestUser();
    
    const oldDate = new Date('2023-01-01');
    const recentDate = new Date();
    
    // Create todos with different client_updated_at timestamps
    await createTestTodo(userId, { 
      title: 'Old Todo', 
      client_updated_at: oldDate 
    });
    await createTestTodo(userId, { 
      title: 'Recent Todo', 
      client_updated_at: recentDate 
    });

    const syncDate = new Date('2023-06-01');
    const input: GetTodosInput = { user_id: userId, last_synced_after: syncDate };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Recent Todo');
  });

  it('should combine multiple filters', async () => {
    const userId = await createTestUser();
    const categoryId = await createTestCategory();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Create various todos
    await createTestTodo(userId, { 
      title: 'Perfect Match',
      category_id: categoryId,
      is_completed: false,
      due_date: tomorrow,
      priority: 'high'
    });
    await createTestTodo(userId, { 
      title: 'Wrong Category',
      category_id: null,
      is_completed: false,
      due_date: tomorrow,
      priority: 'high'
    });
    await createTestTodo(userId, { 
      title: 'Wrong Priority',
      category_id: categoryId,
      is_completed: false,
      due_date: tomorrow,
      priority: 'low'
    });

    const input: GetTodosInput = { 
      user_id: userId,
      category_id: categoryId,
      is_completed: false,
      due_before: tomorrow,
      priority: 'high'
    };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Perfect Match');
  });

  it('should return empty array when no todos match filters', async () => {
    const userId = await createTestUser();
    
    await createTestTodo(userId, { priority: 'low' });

    const input: GetTodosInput = { user_id: userId, priority: 'high' };
    const result = await getTodos(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetTodosInput = { user_id: 'non-existent-user' };
    const result = await getTodos(input);

    expect(result).toHaveLength(0);
  });

  it('should handle null values correctly', async () => {
    const userId = await createTestUser();
    
    // Create todo with null values
    const todo = await createTestTodo(userId, {
      title: 'Todo with nulls',
      description: null,
      category_id: null,
      due_date: null
    });

    const input: GetTodosInput = { user_id: userId };
    const result = await getTodos(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].category_id).toBeNull();
    expect(result[0].due_date).toBeNull();
  });
});