import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { nanoid } from 'nanoid';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Generate unique user ID
    const userId = `user_${nanoid(12)}`;
    
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        id: userId,
        email: input.email,
        name: input.name,
        avatar_url: input.avatar_url || null,
        auth_provider: input.auth_provider,
        is_admin: input.is_admin || false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};