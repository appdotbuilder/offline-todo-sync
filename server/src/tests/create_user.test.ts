import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different scenarios
const googleAuthInput: CreateUserInput = {
  email: 'john@example.com',
  name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  auth_provider: 'google',
  is_admin: false
};

const emailAuthInput: CreateUserInput = {
  email: 'jane@example.com',
  name: 'Jane Smith',
  auth_provider: 'email',
  is_admin: false
};

const adminUserInput: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  auth_provider: 'email',
  is_admin: true
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with Google auth', async () => {
    const result = await createUser(googleAuthInput);

    // Basic field validation
    expect(result.email).toEqual('john@example.com');
    expect(result.name).toEqual('John Doe');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.auth_provider).toEqual('google');
    expect(result.is_admin).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^user_/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with email auth', async () => {
    const result = await createUser(emailAuthInput);

    // Basic field validation
    expect(result.email).toEqual('jane@example.com');
    expect(result.name).toEqual('Jane Smith');
    expect(result.avatar_url).toBeNull();
    expect(result.auth_provider).toEqual('email');
    expect(result.is_admin).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^user_/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(adminUserInput);

    // Admin field validation
    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
    expect(result.auth_provider).toEqual('email');
    expect(result.is_admin).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(googleAuthInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('john@example.com');
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(users[0].auth_provider).toEqual('google');
    expect(users[0].is_admin).toEqual(false);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique user IDs', async () => {
    const user1 = await createUser(googleAuthInput);
    const user2 = await createUser({ ...emailAuthInput, email: 'different@example.com' });

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.id).toMatch(/^user_/);
    expect(user2.id).toMatch(/^user_/);
  });

  it('should handle missing optional fields', async () => {
    const minimalInput: CreateUserInput = {
      email: 'minimal@example.com',
      name: 'Minimal User',
      auth_provider: 'email',
      is_admin: false
    };

    const result = await createUser(minimalInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.name).toEqual('Minimal User');
    expect(result.avatar_url).toBeNull();
    expect(result.auth_provider).toEqual('email');
    expect(result.is_admin).toEqual(false); // Should default to false
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(googleAuthInput);

    // Try to create another user with the same email
    const duplicateInput: CreateUserInput = {
      email: 'john@example.com', // Same email
      name: 'Another John',
      auth_provider: 'email',
      is_admin: false
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle null avatar_url explicitly', async () => {
    const inputWithNullAvatar: CreateUserInput = {
      email: 'nullavatar@example.com',
      name: 'No Avatar User',
      avatar_url: null,
      auth_provider: 'email',
      is_admin: false
    };

    const result = await createUser(inputWithNullAvatar);

    expect(result.email).toEqual('nullavatar@example.com');
    expect(result.avatar_url).toBeNull();
    expect(result.auth_provider).toEqual('email');
    expect(result.is_admin).toEqual(false);
  });
});