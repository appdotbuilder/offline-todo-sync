import { db } from '../db';
import { categoriesTable, usersTable } from '../db/schema';
import { type CreateCategoryInput, type Category, type AdminActionInput } from '../schema';
import { eq } from 'drizzle-orm';

export const createCategory = async (input: CreateCategoryInput, adminAction: AdminActionInput): Promise<Category> => {
  try {
    // Verify that the requesting user is an admin
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminAction.admin_user_id))
      .execute();

    if (adminUsers.length === 0) {
      throw new Error('User not found');
    }

    if (!adminUsers[0].is_admin) {
      throw new Error('Access denied: Admin privileges required');
    }

    // Check if a category with the same name already exists
    const existingCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.name, input.name))
      .execute();

    if (existingCategories.length > 0) {
      throw new Error('Category name already exists');
    }

    // Insert the new category
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        description: input.description || null,
        color: input.color || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
};