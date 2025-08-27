import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { eq } from 'drizzle-orm';

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('Google authentication', () => {
    const googleLoginInput: LoginInput = {
      email: 'test@example.com',
      auth_provider: 'google',
      google_id: 'google123',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    };

    it('should create new user for Google auth when user does not exist', async () => {
      const result = await authenticateUser(googleLoginInput);

      expect(result).not.toBeNull();
      expect(result!.email).toEqual('test@example.com');
      expect(result!.name).toEqual('Test User');
      expect(result!.avatar_url).toEqual('https://example.com/avatar.jpg');
      expect(result!.auth_provider).toEqual('google');
      expect(result!.is_admin).toEqual(false);
      expect(result!.id).toBeDefined();
      expect(result!.id.startsWith('google_')).toBe(true);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should create new user with default name when name not provided', async () => {
      const inputWithoutName: LoginInput = {
        email: 'test2@example.com',
        auth_provider: 'google',
        google_id: 'google456'
      };

      const result = await authenticateUser(inputWithoutName);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Unknown User');
      expect(result!.avatar_url).toBeNull();
    });

    it('should update existing user data for Google auth', async () => {
      // First create a user
      const initialUser = await db.insert(usersTable)
        .values({
          id: 'existing_google_user',
          email: 'existing@example.com',
          name: 'Old Name',
          avatar_url: null,
          auth_provider: 'google',
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning()
        .execute();

      const updateInput: LoginInput = {
        email: 'existing@example.com',
        auth_provider: 'google',
        name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg'
      };

      const result = await authenticateUser(updateInput);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual('existing_google_user');
      expect(result!.name).toEqual('Updated Name');
      expect(result!.avatar_url).toEqual('https://example.com/new-avatar.jpg');
      expect(result!.created_at).toEqual(initialUser[0].created_at);
      expect(result!.updated_at.getTime()).toBeGreaterThan(initialUser[0].updated_at.getTime());
    });

    it('should return existing user without updates when no new data provided', async () => {
      // Create existing user
      const existingUser = await db.insert(usersTable)
        .values({
          id: 'existing_user_no_update',
          email: 'noupdate@example.com',
          name: 'Original Name',
          avatar_url: 'https://example.com/original.jpg',
          auth_provider: 'google',
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning()
        .execute();

      const loginInput: LoginInput = {
        email: 'noupdate@example.com',
        auth_provider: 'google'
      };

      const result = await authenticateUser(loginInput);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual('existing_user_no_update');
      expect(result!.name).toEqual('Original Name');
      expect(result!.avatar_url).toEqual('https://example.com/original.jpg');
      expect(result!.updated_at).toEqual(existingUser[0].updated_at);
    });

    it('should save new Google user to database', async () => {
      await authenticateUser(googleLoginInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.email, 'test@example.com'))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].name).toEqual('Test User');
      expect(users[0].auth_provider).toEqual('google');
      expect(users[0].is_admin).toEqual(false);
    });
  });

  describe('Email authentication', () => {
    const emailLoginInput: LoginInput = {
      email: 'email@example.com',
      auth_provider: 'email'
    };

    it('should return null when email user does not exist', async () => {
      const result = await authenticateUser(emailLoginInput);

      expect(result).toBeNull();
    });

    it('should return existing user for email auth', async () => {
      // Create existing email user
      const existingUser = await db.insert(usersTable)
        .values({
          id: 'existing_email_user',
          email: 'email@example.com',
          name: 'Email User',
          avatar_url: null,
          auth_provider: 'email',
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning()
        .execute();

      const result = await authenticateUser(emailLoginInput);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual('existing_email_user');
      expect(result!.email).toEqual('email@example.com');
      expect(result!.name).toEqual('Email User');
      expect(result!.auth_provider).toEqual('email');
      expect(result!.created_at).toEqual(existingUser[0].created_at);
    });
  });

  describe('Cross-provider scenarios', () => {
    it('should return existing user regardless of auth provider when email matches', async () => {
      // Create user with email auth
      await db.insert(usersTable)
        .values({
          id: 'cross_provider_user',
          email: 'cross@example.com',
          name: 'Cross User',
          avatar_url: null,
          auth_provider: 'email',
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();

      // Try to authenticate with Google using same email
      const googleInput: LoginInput = {
        email: 'cross@example.com',
        auth_provider: 'google',
        name: 'Updated Google Name'
      };

      const result = await authenticateUser(googleInput);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual('cross_provider_user');
      expect(result!.email).toEqual('cross@example.com');
      expect(result!.auth_provider).toEqual('email'); // Original auth provider preserved
      expect(result!.name).toEqual('Updated Google Name'); // But name was updated
    });
  });

  describe('Admin users', () => {
    it('should preserve admin status when updating existing admin user', async () => {
      // Create admin user
      await db.insert(usersTable)
        .values({
          id: 'admin_user',
          email: 'admin@example.com',
          name: 'Admin User',
          avatar_url: null,
          auth_provider: 'google',
          is_admin: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();

      const adminInput: LoginInput = {
        email: 'admin@example.com',
        auth_provider: 'google',
        name: 'Updated Admin'
      };

      const result = await authenticateUser(adminInput);

      expect(result).not.toBeNull();
      expect(result!.is_admin).toBe(true);
      expect(result!.name).toEqual('Updated Admin');
    });
  });

  describe('Edge cases', () => {
    it('should handle valid inputs with empty strings appropriately', async () => {
      const inputWithEmptyName: LoginInput = {
        email: 'empty@example.com',
        auth_provider: 'google',
        name: '' // Empty name should be handled
      };

      const result = await authenticateUser(inputWithEmptyName);

      expect(result).not.toBeNull();
      expect(result!.email).toEqual('empty@example.com');
      expect(result!.name).toEqual(''); // Empty name is preserved, not converted to 'Unknown User'
      expect(result!.auth_provider).toEqual('google');
    });

    it('should handle undefined avatar_url correctly', async () => {
      const inputWithUndefinedAvatar: LoginInput = {
        email: 'undefinedavatar@example.com',
        auth_provider: 'google',
        name: 'Test User'
        // avatar_url is undefined (not provided)
      };

      const result = await authenticateUser(inputWithUndefinedAvatar);

      expect(result).not.toBeNull();
      expect(result!.avatar_url).toBeNull();
    });
  });
});