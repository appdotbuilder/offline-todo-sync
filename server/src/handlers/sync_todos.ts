import { db } from '../db';
import { todosTable, usersTable, categoriesTable } from '../db/schema';
import { type SyncTodosInput, type Todo } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

export const syncTodos = async (input: SyncTodosInput): Promise<{ synced: Todo[], conflicts: Todo[] }> => {
  try {
    // Verify user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Validate category IDs exist if provided
    const categoryIds = input.todos
      .map(todo => todo.category_id)
      .filter((id): id is number => id !== null && id !== undefined);

    if (categoryIds.length > 0) {
      const existingCategories = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, categoryIds))
        .execute();

      const existingCategoryIds = new Set(existingCategories.map(c => c.id));
      
      for (const categoryId of categoryIds) {
        if (!existingCategoryIds.has(categoryId)) {
          throw new Error(`Category with id ${categoryId} not found`);
        }
      }
    }

    const synced: Todo[] = [];
    const conflicts: Todo[] = [];

    // Process each todo in the batch
    for (const todoData of input.todos) {
      // Handle soft deletes first
      if (todoData.is_deleted) {
        if (todoData.id) {
          await db.delete(todosTable)
            .where(and(
              eq(todosTable.id, todoData.id),
              eq(todosTable.user_id, input.user_id)
            ))
            .execute();
        }
        continue; // Skip deleted todos from response
      }

      if (todoData.id) {
        // Update existing todo - check for conflicts
        const existingTodos = await db.select()
          .from(todosTable)
          .where(and(
            eq(todosTable.id, todoData.id),
            eq(todosTable.user_id, input.user_id)
          ))
          .execute();

        if (existingTodos.length === 0) {
          throw new Error(`Todo with id ${todoData.id} not found or access denied`);
        }

        const existingTodo = existingTodos[0];
        
        // Check for conflict: if server was updated after client's modification time,
        // it means another client/process has modified this todo since this client's last change
        const hasConflict = existingTodo.updated_at > todoData.client_updated_at;
        
        if (hasConflict) {
          // Conflict detected - return server version for client to resolve
          conflicts.push({
            id: existingTodo.id,
            user_id: existingTodo.user_id,
            category_id: existingTodo.category_id,
            title: existingTodo.title,
            description: existingTodo.description,
            is_completed: existingTodo.is_completed,
            due_date: existingTodo.due_date,
            priority: existingTodo.priority,
            created_at: existingTodo.created_at,
            updated_at: existingTodo.updated_at,
            last_synced_at: existingTodo.last_synced_at,
            client_updated_at: existingTodo.client_updated_at
          });
          continue;
        }

        // No conflict - update the todo
        const updateResult = await db.update(todosTable)
          .set({
            category_id: todoData.category_id,
            title: todoData.title,
            description: todoData.description,
            is_completed: todoData.is_completed,
            due_date: todoData.due_date,
            priority: todoData.priority,
            updated_at: new Date(),
            last_synced_at: new Date(),
            client_updated_at: todoData.client_updated_at
          })
          .where(and(
            eq(todosTable.id, todoData.id),
            eq(todosTable.user_id, input.user_id)
          ))
          .returning()
          .execute();

        const updatedTodo = updateResult[0];
        synced.push({
          id: updatedTodo.id,
          user_id: updatedTodo.user_id,
          category_id: updatedTodo.category_id,
          title: updatedTodo.title,
          description: updatedTodo.description,
          is_completed: updatedTodo.is_completed,
          due_date: updatedTodo.due_date,
          priority: updatedTodo.priority,
          created_at: updatedTodo.created_at,
          updated_at: updatedTodo.updated_at,
          last_synced_at: updatedTodo.last_synced_at,
          client_updated_at: updatedTodo.client_updated_at
        });

      } else {
        // Create new todo
        const insertResult = await db.insert(todosTable)
          .values({
            user_id: input.user_id,
            category_id: todoData.category_id,
            title: todoData.title,
            description: todoData.description,
            is_completed: todoData.is_completed,
            due_date: todoData.due_date,
            priority: todoData.priority,
            last_synced_at: new Date(),
            client_updated_at: todoData.client_updated_at
          })
          .returning()
          .execute();

        const newTodo = insertResult[0];
        synced.push({
          id: newTodo.id,
          user_id: newTodo.user_id,
          category_id: newTodo.category_id,
          title: newTodo.title,
          description: newTodo.description,
          is_completed: newTodo.is_completed,
          due_date: newTodo.due_date,
          priority: newTodo.priority,
          created_at: newTodo.created_at,
          updated_at: newTodo.updated_at,
          last_synced_at: newTodo.last_synced_at,
          client_updated_at: newTodo.client_updated_at
        });
      }
    }

    return {
      synced,
      conflicts
    };
  } catch (error) {
    console.error('Todo sync failed:', error);
    throw error;
  }
};