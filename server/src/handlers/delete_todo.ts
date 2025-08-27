import { db } from '../db';
import { todosTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteTodo = async (todoId: number, userId: string): Promise<boolean> => {
  try {
    // First check if the todo exists and belongs to the user
    const existingTodo = await db.select()
      .from(todosTable)
      .where(and(eq(todosTable.id, todoId), eq(todosTable.user_id, userId)))
      .execute();

    if (existingTodo.length === 0) {
      return false; // Todo doesn't exist or doesn't belong to user
    }

    // Delete the todo
    const result = await db.delete(todosTable)
      .where(and(eq(todosTable.id, todoId), eq(todosTable.user_id, userId)))
      .execute();

    // Check if deletion was successful (affected rows > 0)
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Todo deletion failed:', error);
    throw error;
  }
};