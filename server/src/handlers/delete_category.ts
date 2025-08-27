import { db } from '../db';
import { categoriesTable, todosTable, usersTable } from '../db/schema';
import { type AdminActionInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteCategory = async (categoryId: number, adminAction: AdminActionInput): Promise<boolean> => {
  try {
    // First, verify the user is an admin
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminAction.admin_user_id))
      .execute();

    if (adminUser.length === 0 || !adminUser[0].is_admin) {
      throw new Error('Access denied: Admin privileges required');
    }

    // Check if category exists
    const category = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    if (category.length === 0) {
      throw new Error('Category not found');
    }

    // Check if any todos reference this category
    const referencingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.category_id, categoryId))
      .execute();

    if (referencingTodos.length > 0) {
      throw new Error(`Cannot delete category: ${referencingTodos.length} todo(s) are still assigned to this category`);
    }

    // Delete the category
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    return true;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
};