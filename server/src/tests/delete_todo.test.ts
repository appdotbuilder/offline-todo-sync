import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, todosTable } from '../db/schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: false
};

const otherUser = {
  id: 'other-user-456',
  email: 'other@example.com',
  name: 'Other User',
  avatar_url: null,
  auth_provider: 'email' as const,
  is_admin: false
};

const testCategory = {
  name: 'Work',
  description: 'Work related tasks',
  color: '#FF5733'
};

const testTodo = {
  user_id: testUser.id,
  category_id: 1,
  title: 'Complete project',
  description: 'Finish the todo app',
  is_completed: false,
  due_date: new Date('2024-12-31'),
  priority: 'high' as const,
  client_updated_at: new Date()
};

const otherUserTodo = {
  user_id: otherUser.id,
  category_id: 1,
  title: 'Other user task',
  description: 'This belongs to another user',
  is_completed: false,
  due_date: new Date('2024-12-31'),
  priority: 'medium' as const,
  client_updated_at: new Date()
};

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a todo that belongs to the user', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, otherUser]).execute();
    await db.insert(categoriesTable).values(testCategory).execute();
    const createdTodos = await db.insert(todosTable)
      .values(testTodo)
      .returning()
      .execute();
    
    const todoId = createdTodos[0].id;

    // Delete the todo
    const result = await deleteTodo(todoId, testUser.id);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify todo no longer exists in database
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent todo', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(categoriesTable).values(testCategory).execute();

    // Try to delete non-existent todo
    const result = await deleteTodo(99999, testUser.id);

    expect(result).toBe(false);
  });

  it('should return false when trying to delete todo that belongs to another user', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, otherUser]).execute();
    await db.insert(categoriesTable).values(testCategory).execute();
    const createdTodos = await db.insert(todosTable)
      .values(otherUserTodo)
      .returning()
      .execute();
    
    const todoId = createdTodos[0].id;

    // Try to delete other user's todo
    const result = await deleteTodo(todoId, testUser.id);

    // Should return false
    expect(result).toBe(false);

    // Verify todo still exists in database
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(remainingTodos).toHaveLength(1);
    expect(remainingTodos[0].user_id).toBe(otherUser.id);
  });

  it('should only delete the specific todo and not affect others', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, otherUser]).execute();
    await db.insert(categoriesTable).values(testCategory).execute();
    
    // Create multiple todos for same user
    const todo1 = { ...testTodo, title: 'Todo 1' };
    const todo2 = { ...testTodo, title: 'Todo 2' };
    const todo3 = { ...testTodo, title: 'Todo 3' };
    
    const createdTodos = await db.insert(todosTable)
      .values([todo1, todo2, todo3])
      .returning()
      .execute();

    const todoToDelete = createdTodos[1]; // Delete the middle one

    // Delete specific todo
    const result = await deleteTodo(todoToDelete.id, testUser.id);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify only the specific todo was deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.user_id, testUser.id))
      .execute();

    expect(remainingTodos).toHaveLength(2);
    expect(remainingTodos.map(t => t.title)).toEqual(['Todo 1', 'Todo 3']);
    expect(remainingTodos.find(t => t.id === todoToDelete.id)).toBeUndefined();
  });

  it('should handle todos without categories', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    
    const todoWithoutCategory = {
      user_id: testUser.id,
      category_id: null,
      title: 'Uncategorized todo',
      description: 'A todo without category',
      is_completed: false,
      due_date: null,
      priority: 'low' as const,
      client_updated_at: new Date()
    };

    const createdTodos = await db.insert(todosTable)
      .values(todoWithoutCategory)
      .returning()
      .execute();
    
    const todoId = createdTodos[0].id;

    // Delete the todo
    const result = await deleteTodo(todoId, testUser.id);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify todo no longer exists in database
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });

  it('should handle completed todos', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(categoriesTable).values(testCategory).execute();
    
    const completedTodo = {
      ...testTodo,
      title: 'Completed todo',
      is_completed: true
    };

    const createdTodos = await db.insert(todosTable)
      .values(completedTodo)
      .returning()
      .execute();
    
    const todoId = createdTodos[0].id;

    // Delete the completed todo
    const result = await deleteTodo(todoId, testUser.id);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify todo no longer exists in database
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });
});