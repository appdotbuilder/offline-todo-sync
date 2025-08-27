import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const authenticateUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // First, try to find existing user by email
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // For Google auth, update user data if provided
      if (input.auth_provider === 'google' && (input.name || input.avatar_url)) {
        const updateData: Partial<typeof usersTable.$inferInsert> = {
          updated_at: new Date()
        };
        
        if (input.name) {
          updateData.name = input.name;
        }
        
        if (input.avatar_url !== undefined) {
          updateData.avatar_url = input.avatar_url;
        }

        const updatedUsers = await db.update(usersTable)
          .set(updateData)
          .where(eq(usersTable.id, existingUser.id))
          .returning()
          .execute();

        return updatedUsers[0];
      }

      // Return existing user without updates
      return existingUser;
    }

    // For Google auth, create new user if they don't exist
    if (input.auth_provider === 'google') {
      // Generate unique user ID using timestamp and random component
      const userId = `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newUserData = {
        id: userId,
        email: input.email,
        name: input.name !== undefined ? input.name : 'Unknown User',
        avatar_url: input.avatar_url !== undefined ? input.avatar_url : null,
        auth_provider: input.auth_provider,
        is_admin: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const newUsers = await db.insert(usersTable)
        .values(newUserData)
        .returning()
        .execute();

      return newUsers[0];
    }

    // For email auth, user must already exist (registration is separate)
    // Return null if user doesn't exist
    return null;
  } catch (error) {
    console.error('User authentication failed:', error);
    throw error;
  }
};