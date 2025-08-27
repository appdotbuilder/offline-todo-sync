import { db } from '../db';
import { todosTable, categoriesTable } from '../db/schema';
import { type UpdateTodoInput, type Todo } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTodo = async (input: UpdateTodoInput): Promise<Todo> => {
  try {
    // First, fetch the existing todo to validate it exists
    const existingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, input.id))
      .execute();

    if (existingTodos.length === 0) {
      throw new Error(`Todo with ID ${input.id} not found`);
    }

    const existingTodo = existingTodos[0];

    // If category_id is provided, validate that the category exists
    if (input.category_id !== undefined && input.category_id !== null) {
      const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categories.length === 0) {
        throw new Error(`Category with ID ${input.category_id} not found`);
      }
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.is_completed !== undefined) {
      updateData.is_completed = input.is_completed;
    }

    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }

    if (input.client_updated_at !== undefined) {
      updateData.client_updated_at = input.client_updated_at;
    }

    // Perform the update
    const result = await db.update(todosTable)
      .set(updateData)
      .where(eq(todosTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Todo update failed:', error);
    throw error;
  }
};