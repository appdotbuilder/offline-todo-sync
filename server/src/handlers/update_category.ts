import { db } from '../db';
import { categoriesTable, usersTable } from '../db/schema';
import { type UpdateCategoryInput, type Category, type AdminActionInput } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateCategory = async (input: UpdateCategoryInput, adminAction: AdminActionInput): Promise<Category> => {
  try {
    // First verify that the requesting user is an admin
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminAction.admin_user_id))
      .execute();

    if (!adminUser.length || !adminUser[0].is_admin) {
      throw new Error('Access denied: Admin privileges required');
    }

    // Check if the category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .execute();

    if (!existingCategory.length) {
      throw new Error('Category not found');
    }

    // If name is being updated, check for uniqueness
    if (input.name) {
      const duplicateCategory = await db.select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.name, input.name),
            ne(categoriesTable.id, input.id)
          )
        )
        .execute();

      if (duplicateCategory.length > 0) {
        throw new Error('Category name already exists');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.color !== undefined) {
      updateData.color = input.color;
    }

    // Update the category
    const result = await db.update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
};