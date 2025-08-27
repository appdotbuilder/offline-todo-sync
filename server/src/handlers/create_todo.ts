import { db } from '../db';
import { todosTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateTodoInput, type Todo } from '../schema';
import { eq } from 'drizzle-orm';

export const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
  try {
    // Validate that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Validate that the category exists (if provided)
    if (input.category_id !== null && input.category_id !== undefined) {
      const categoryExists = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Insert todo record
    const result = await db.insert(todosTable)
      .values({
        user_id: input.user_id,
        category_id: input.category_id || null,
        title: input.title,
        description: input.description || null,
        is_completed: false,
        due_date: input.due_date || null,
        priority: input.priority || 'medium',
        last_synced_at: new Date(), // Set when created on server
        client_updated_at: input.client_updated_at || new Date()
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Todo creation failed:', error);
    throw error;
  }
};