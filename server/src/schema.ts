import { z } from 'zod';

// User authentication schema
export const userSchema = z.object({
  id: z.string(), // Using string ID for better compatibility with auth providers
  email: z.string().email(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  auth_provider: z.enum(['google', 'email']),
  is_admin: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(), // Hex color code for UI
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Todo item schema
export const todoSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  category_id: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  is_completed: z.boolean().default(false),
  due_date: z.coerce.date().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  // Offline sync fields
  last_synced_at: z.coerce.date().nullable(),
  client_updated_at: z.coerce.date() // For conflict resolution
});

export type Todo = z.infer<typeof todoSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  avatar_url: z.string().nullable().optional(),
  auth_provider: z.enum(['google', 'email']),
  is_admin: z.boolean().optional().default(false)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schemas for authentication
export const loginInputSchema = z.object({
  email: z.string().email(),
  auth_provider: z.enum(['google', 'email']),
  // For Google auth, we might receive additional data
  google_id: z.string().optional(),
  name: z.string().optional(),
  avatar_url: z.string().optional()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Input schemas for categories
export const createCategoryInputSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Category name is required').optional(),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Input schemas for todos
export const createTodoInputSchema = z.object({
  user_id: z.string(),
  category_id: z.number().nullable().optional(),
  title: z.string().min(1, 'Todo title is required'),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  client_updated_at: z.coerce.date().optional().default(() => new Date())
});

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;

export const updateTodoInputSchema = z.object({
  id: z.number(),
  category_id: z.number().nullable().optional(),
  title: z.string().min(1, 'Todo title is required').optional(),
  description: z.string().nullable().optional(),
  is_completed: z.boolean().optional(),
  due_date: z.coerce.date().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  client_updated_at: z.coerce.date().optional().default(() => new Date())
});

export type UpdateTodoInput = z.infer<typeof updateTodoInputSchema>;

// Batch sync schema for offline support
export const syncTodosInputSchema = z.object({
  user_id: z.string(),
  todos: z.array(z.object({
    // For new todos (no server ID yet)
    client_id: z.string().optional(), // Temporary client-side ID
    id: z.number().optional(), // Server ID if exists
    category_id: z.number().nullable().optional(),
    title: z.string().min(1, 'Todo title is required'),
    description: z.string().nullable().optional(),
    is_completed: z.boolean().default(false),
    due_date: z.coerce.date().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    client_updated_at: z.coerce.date(),
    is_deleted: z.boolean().optional().default(false) // For soft deletes during sync
  })),
  last_sync_timestamp: z.coerce.date().nullable().optional()
});

export type SyncTodosInput = z.infer<typeof syncTodosInputSchema>;

// Query schemas
export const getTodosInputSchema = z.object({
  user_id: z.string(),
  category_id: z.number().optional(),
  is_completed: z.boolean().optional(),
  due_before: z.coerce.date().optional(),
  due_after: z.coerce.date().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  last_synced_after: z.coerce.date().optional() // For incremental sync
});

export type GetTodosInput = z.infer<typeof getTodosInputSchema>;

// Admin verification schema
export const adminActionInputSchema = z.object({
  admin_user_id: z.string()
});

export type AdminActionInput = z.infer<typeof adminActionInputSchema>;