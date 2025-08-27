import { db } from '../db';
import { todosTable } from '../db/schema';
import { type GetTodosInput, type Todo } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getTodos = async (input: GetTodosInput): Promise<Todo[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id (required)
    conditions.push(eq(todosTable.user_id, input.user_id));
    
    // Optional filters
    if (input.category_id !== undefined) {
      conditions.push(eq(todosTable.category_id, input.category_id));
    }
    
    if (input.is_completed !== undefined) {
      conditions.push(eq(todosTable.is_completed, input.is_completed));
    }
    
    if (input.due_before !== undefined) {
      conditions.push(lte(todosTable.due_date, input.due_before));
    }
    
    if (input.due_after !== undefined) {
      conditions.push(gte(todosTable.due_date, input.due_after));
    }
    
    if (input.priority !== undefined) {
      conditions.push(eq(todosTable.priority, input.priority));
    }
    
    // For incremental sync - return only todos modified after the given timestamp
    if (input.last_synced_after !== undefined) {
      conditions.push(gte(todosTable.client_updated_at, input.last_synced_after));
    }
    
    // Build the complete query with all conditions
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const results = await db.select()
      .from(todosTable)
      .where(whereClause)
      .execute();
    
    // Return results (no type conversion needed as all fields are already correct types)
    return results;
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    throw error;
  }
};