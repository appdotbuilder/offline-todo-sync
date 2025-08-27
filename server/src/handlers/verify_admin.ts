import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const verifyAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Query the user from the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // If user doesn't exist, they're not an admin
    if (users.length === 0) {
      return false;
    }

    // Return the user's admin status
    return users[0].is_admin;
  } catch (error) {
    console.error('Admin verification failed:', error);
    throw error;
  }
};