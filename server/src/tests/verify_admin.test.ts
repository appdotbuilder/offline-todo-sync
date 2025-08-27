import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { verifyAdmin } from '../handlers/verify_admin';

describe('verifyAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return true for admin user', async () => {
    // Create an admin user
    const adminUser = {
      id: 'admin-user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      auth_provider: 'email' as const,
      is_admin: true
    };

    await db.insert(usersTable)
      .values(adminUser)
      .execute();

    const result = await verifyAdmin('admin-user-1');
    expect(result).toBe(true);
  });

  it('should return false for regular user', async () => {
    // Create a regular user
    const regularUser = {
      id: 'regular-user-1',
      email: 'user@example.com',
      name: 'Regular User',
      auth_provider: 'email' as const,
      is_admin: false
    };

    await db.insert(usersTable)
      .values(regularUser)
      .execute();

    const result = await verifyAdmin('regular-user-1');
    expect(result).toBe(false);
  });

  it('should return false for non-existent user', async () => {
    const result = await verifyAdmin('non-existent-user');
    expect(result).toBe(false);
  });

  it('should handle user with default admin status', async () => {
    // Create user without explicitly setting is_admin (should default to false)
    const defaultUser = {
      id: 'default-user-1',
      email: 'default@example.com',
      name: 'Default User',
      auth_provider: 'google' as const
      // is_admin not specified - should default to false
    };

    await db.insert(usersTable)
      .values(defaultUser)
      .execute();

    const result = await verifyAdmin('default-user-1');
    expect(result).toBe(false);
  });

  it('should work with different auth providers', async () => {
    // Test with Google auth provider admin
    const googleAdmin = {
      id: 'google-admin-1',
      email: 'admin@gmail.com',
      name: 'Google Admin',
      auth_provider: 'google' as const,
      is_admin: true,
      avatar_url: 'https://example.com/avatar.jpg'
    };

    await db.insert(usersTable)
      .values(googleAdmin)
      .execute();

    const result = await verifyAdmin('google-admin-1');
    expect(result).toBe(true);
  });

  it('should verify multiple users correctly', async () => {
    // Create multiple users with different admin status
    const users = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        auth_provider: 'email' as const,
        is_admin: true
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        auth_provider: 'email' as const,
        is_admin: false
      },
      {
        id: 'user-3',
        email: 'user3@example.com',
        name: 'User Three',
        auth_provider: 'google' as const,
        is_admin: true
      }
    ];

    await db.insert(usersTable)
      .values(users)
      .execute();

    // Test each user
    const result1 = await verifyAdmin('user-1');
    const result2 = await verifyAdmin('user-2');
    const result3 = await verifyAdmin('user-3');

    expect(result1).toBe(true);
    expect(result2).toBe(false);
    expect(result3).toBe(true);
  });
});