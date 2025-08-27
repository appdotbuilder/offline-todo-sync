import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, todosTable } from '../db/schema';
import { type SyncTodosInput } from '../schema';
import { syncTodos } from '../handlers/sync_todos';
import { eq, and } from 'drizzle-orm';

describe('syncTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const testUser = {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    auth_provider: 'email' as const,
    is_admin: false
  };

  const testCategory = {
    name: 'Work',
    description: 'Work-related todos',
    color: '#FF5733'
  };

  const setupTestData = async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    return {
      userId: testUser.id,
      categoryId: categoryResult[0].id
    };
  };

  it('should create new todos', async () => {
    const { userId, categoryId } = await setupTestData();

    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        {
          title: 'New Todo 1',
          description: 'First new todo',
          category_id: categoryId,
          is_completed: false,
          due_date: new Date('2024-12-31'),
          priority: 'high',
          client_updated_at: new Date(),
          is_deleted: false
        },
        {
          title: 'New Todo 2',
          description: null,
          category_id: null,
          is_completed: true,
          due_date: null,
          priority: 'low',
          client_updated_at: new Date(),
          is_deleted: false
        }
      ]
    };

    const result = await syncTodos(syncInput);

    expect(result.synced).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);

    // Verify first todo
    const todo1 = result.synced[0];
    expect(todo1.id).toBeDefined();
    expect(todo1.title).toEqual('New Todo 1');
    expect(todo1.description).toEqual('First new todo');
    expect(todo1.category_id).toEqual(categoryId);
    expect(todo1.is_completed).toEqual(false);
    expect(todo1.due_date).toBeInstanceOf(Date);
    expect(todo1.priority).toEqual('high');
    expect(todo1.user_id).toEqual(userId);
    expect(todo1.last_synced_at).toBeInstanceOf(Date);

    // Verify second todo
    const todo2 = result.synced[1];
    expect(todo2.title).toEqual('New Todo 2');
    expect(todo2.description).toBeNull();
    expect(todo2.category_id).toBeNull();
    expect(todo2.is_completed).toEqual(true);
    expect(todo2.due_date).toBeNull();
    expect(todo2.priority).toEqual('low');
  });

  it('should update existing todos without conflicts', async () => {
    const { userId, categoryId } = await setupTestData();

    // Create existing todo with explicit timestamp
    const existingTodo = await db.insert(todosTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        title: 'Original Title',
        description: 'Original description',
        is_completed: false,
        priority: 'medium',
        client_updated_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      })
      .returning()
      .execute();

    const todoId = existingTodo[0].id;
    const clientUpdateTime = new Date('2024-01-02'); // After original

    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        {
          id: todoId,
          title: 'Updated Title',
          description: 'Updated description',
          category_id: null,
          is_completed: true,
          due_date: new Date('2024-12-25'),
          priority: 'high',
          client_updated_at: clientUpdateTime,
          is_deleted: false
        }
      ]
    };

    const result = await syncTodos(syncInput);

    expect(result.synced).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);

    const updatedTodo = result.synced[0];
    expect(updatedTodo.id).toEqual(todoId);
    expect(updatedTodo.title).toEqual('Updated Title');
    expect(updatedTodo.description).toEqual('Updated description');
    expect(updatedTodo.category_id).toBeNull();
    expect(updatedTodo.is_completed).toEqual(true);
    expect(updatedTodo.priority).toEqual('high');
    expect(updatedTodo.client_updated_at).toEqual(clientUpdateTime);

    // Verify database was actually updated
    const dbTodo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(dbTodo[0].title).toEqual('Updated Title');
    expect(dbTodo[0].is_completed).toEqual(true);
  });

  it('should detect conflicts and return server version', async () => {
    const { userId, categoryId } = await setupTestData();

    // Create todo and then update it on server (simulating another client's update)
    const originalTime = new Date('2024-01-01');
    const serverUpdateTime = new Date('2024-01-02');
    const clientUpdateTime = new Date('2024-01-01T12:00:00'); // Before server update

    const existingTodo = await db.insert(todosTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        title: 'Original Title',
        description: 'Original description',
        is_completed: false,
        priority: 'medium',
        client_updated_at: originalTime,
        created_at: originalTime,
        updated_at: originalTime
      })
      .returning()
      .execute();

    const todoId = existingTodo[0].id;

    // Simulate server update (from another client)
    await db.update(todosTable)
      .set({
        title: 'Server Updated Title',
        updated_at: serverUpdateTime
      })
      .where(eq(todosTable.id, todoId))
      .execute();

    // Now try to sync with older client data
    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        {
          id: todoId,
          title: 'Client Updated Title',
          description: 'Client updated description',
          category_id: categoryId,
          is_completed: true,
          priority: 'high',
          client_updated_at: clientUpdateTime, // Older than server update
          is_deleted: false
        }
      ]
    };

    const result = await syncTodos(syncInput);

    expect(result.synced).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);

    const conflict = result.conflicts[0];
    expect(conflict.id).toEqual(todoId);
    expect(conflict.title).toEqual('Server Updated Title'); // Server version returned
    expect(conflict.updated_at).toEqual(serverUpdateTime);
  });

  it('should handle soft deletes', async () => {
    const { userId, categoryId } = await setupTestData();

    // Create todo to delete
    const baseTime = new Date('2024-01-01');
    const existingTodo = await db.insert(todosTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        title: 'Todo to Delete',
        description: 'This will be deleted',
        is_completed: false,
        priority: 'medium',
        client_updated_at: baseTime,
        created_at: baseTime,
        updated_at: baseTime
      })
      .returning()
      .execute();

    const todoId = existingTodo[0].id;

    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        {
          id: todoId,
          title: 'Todo to Delete',
          description: 'This will be deleted',
          category_id: categoryId,
          is_completed: false,
          priority: 'medium',
          client_updated_at: new Date(),
          is_deleted: true
        }
      ]
    };

    const result = await syncTodos(syncInput);

    expect(result.synced).toHaveLength(0); // Deleted todos not returned
    expect(result.conflicts).toHaveLength(0);

    // Verify todo was actually deleted from database
    const deletedTodo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(deletedTodo).toHaveLength(0);
  });

  it('should handle mixed operations in batch', async () => {
    const { userId, categoryId } = await setupTestData();

    // Create existing todo for update
    const existingTodo = await db.insert(todosTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        title: 'Existing Todo',
        description: 'To be updated',
        is_completed: false,
        priority: 'medium',
        client_updated_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      })
      .returning()
      .execute();

    const todoId = existingTodo[0].id;

    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        // Create new todo
        {
          title: 'New Todo',
          description: 'Brand new',
          category_id: categoryId,
          is_completed: false,
          priority: 'high',
          client_updated_at: new Date(),
          is_deleted: false
        },
        // Update existing todo
        {
          id: todoId,
          title: 'Updated Existing Todo',
          description: 'Updated description',
          category_id: categoryId,
          is_completed: true,
          priority: 'low',
          client_updated_at: new Date('2024-01-02'),
          is_deleted: false
        }
      ]
    };

    const result = await syncTodos(syncInput);

    expect(result.synced).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);

    // Verify new todo
    const newTodo = result.synced.find(t => t.title === 'New Todo');
    expect(newTodo).toBeDefined();
    expect(newTodo!.description).toEqual('Brand new');

    // Verify updated todo
    const updatedTodo = result.synced.find(t => t.id === todoId);
    expect(updatedTodo).toBeDefined();
    expect(updatedTodo!.title).toEqual('Updated Existing Todo');
    expect(updatedTodo!.is_completed).toEqual(true);
  });

  it('should throw error for non-existent user', async () => {
    const syncInput: SyncTodosInput = {
      user_id: 'non-existent-user',
      todos: [
        {
          title: 'Test Todo',
          description: 'Should fail',
          is_completed: false,
          priority: 'medium',
          client_updated_at: new Date(),
          is_deleted: false
        }
      ]
    };

    await expect(syncTodos(syncInput)).rejects.toThrow(/User with id non-existent-user not found/i);
  });

  it('should throw error for non-existent category', async () => {
    const { userId } = await setupTestData();

    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        {
          title: 'Test Todo',
          description: 'Should fail',
          category_id: 999, // Non-existent category
          is_completed: false,
          priority: 'medium',
          client_updated_at: new Date(),
          is_deleted: false
        }
      ]
    };

    await expect(syncTodos(syncInput)).rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should throw error when updating non-existent todo', async () => {
    const { userId } = await setupTestData();

    const syncInput: SyncTodosInput = {
      user_id: userId,
      todos: [
        {
          id: 999, // Non-existent todo
          title: 'Test Todo',
          description: 'Should fail',
          is_completed: false,
          priority: 'medium',
          client_updated_at: new Date(),
          is_deleted: false
        }
      ]
    };

    await expect(syncTodos(syncInput)).rejects.toThrow(/Todo with id 999 not found or access denied/i);
  });

  it('should prevent cross-user access', async () => {
    const { userId, categoryId } = await setupTestData();

    // Create another user
    const otherUser = {
      id: 'other-user',
      email: 'other@example.com',
      name: 'Other User',
      auth_provider: 'email' as const,
      is_admin: false
    };
    await db.insert(usersTable).values(otherUser).execute();

    // Create todo owned by first user
    const baseTime = new Date('2024-01-01');
    const existingTodo = await db.insert(todosTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        title: 'User 1 Todo',
        description: 'Belongs to user 1',
        is_completed: false,
        priority: 'medium',
        client_updated_at: baseTime,
        created_at: baseTime,
        updated_at: baseTime
      })
      .returning()
      .execute();

    const todoId = existingTodo[0].id;

    // Try to update as second user
    const syncInput: SyncTodosInput = {
      user_id: otherUser.id,
      todos: [
        {
          id: todoId,
          title: 'Hacked Todo',
          description: 'Should not work',
          is_completed: true,
          priority: 'high',
          client_updated_at: new Date(),
          is_deleted: false
        }
      ]
    };

    await expect(syncTodos(syncInput)).rejects.toThrow(/Todo with id .+ not found or access denied/i);
  });
});