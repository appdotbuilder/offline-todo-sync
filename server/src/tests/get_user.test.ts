import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  auth_provider: 'google',
  is_admin: false
};

const adminUser: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  avatar_url: null,
  auth_provider: 'email',
  is_admin: true
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const [createdUser] = await db.insert(usersTable)
      .values({
        id: 'test-user-id',
        email: testUser.email,
        name: testUser.name,
        avatar_url: testUser.avatar_url,
        auth_provider: testUser.auth_provider,
        is_admin: testUser.is_admin
      })
      .returning()
      .execute();

    const result = await getUser('test-user-id');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test-user-id');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.name).toEqual('Test User');
    expect(result!.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result!.auth_provider).toEqual('google');
    expect(result!.is_admin).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUser('non-existent-user');

    expect(result).toBeNull();
  });

  it('should return admin user with correct admin flag', async () => {
    // Create admin user
    await db.insert(usersTable)
      .values({
        id: 'admin-user-id',
        email: adminUser.email,
        name: adminUser.name,
        avatar_url: adminUser.avatar_url,
        auth_provider: adminUser.auth_provider,
        is_admin: adminUser.is_admin
      })
      .execute();

    const result = await getUser('admin-user-id');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('admin-user-id');
    expect(result!.email).toEqual('admin@example.com');
    expect(result!.name).toEqual('Admin User');
    expect(result!.avatar_url).toBeNull();
    expect(result!.auth_provider).toEqual('email');
    expect(result!.is_admin).toEqual(true);
  });

  it('should handle user with null avatar_url', async () => {
    // Create user with null avatar_url
    await db.insert(usersTable)
      .values({
        id: 'user-no-avatar',
        email: 'noavatar@example.com',
        name: 'No Avatar User',
        avatar_url: null,
        auth_provider: 'email',
        is_admin: false
      })
      .execute();

    const result = await getUser('user-no-avatar');

    expect(result).not.toBeNull();
    expect(result!.avatar_url).toBeNull();
  });

  it('should handle different auth providers', async () => {
    // Create Google auth user
    await db.insert(usersTable)
      .values({
        id: 'google-user',
        email: 'google@example.com',
        name: 'Google User',
        avatar_url: 'https://lh3.googleusercontent.com/avatar',
        auth_provider: 'google',
        is_admin: false
      })
      .execute();

    // Create email auth user
    await db.insert(usersTable)
      .values({
        id: 'email-user',
        email: 'email@example.com',
        name: 'Email User',
        avatar_url: null,
        auth_provider: 'email',
        is_admin: false
      })
      .execute();

    const googleUser = await getUser('google-user');
    const emailUser = await getUser('email-user');

    expect(googleUser!.auth_provider).toEqual('google');
    expect(googleUser!.avatar_url).toEqual('https://lh3.googleusercontent.com/avatar');

    expect(emailUser!.auth_provider).toEqual('email');
    expect(emailUser!.avatar_url).toBeNull();
  });

  it('should return correct timestamp types', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        id: 'timestamp-user',
        email: 'timestamp@example.com',
        name: 'Timestamp User',
        auth_provider: 'email',
        is_admin: false
      })
      .execute();

    const result = await getUser('timestamp-user');

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.created_at.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result!.updated_at.getTime()).toBeLessThanOrEqual(Date.now());
  });
});