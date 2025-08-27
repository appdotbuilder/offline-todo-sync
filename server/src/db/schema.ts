import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  boolean, 
  integer,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for type safety
export const authProviderEnum = pgEnum('auth_provider', ['google', 'email']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Users table
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(), // Using text for better auth provider compatibility
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatar_url: text('avatar_url'), // Nullable by default
  auth_provider: authProviderEnum('auth_provider').notNull(),
  is_admin: boolean('is_admin').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  color: text('color'), // Hex color code, nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Todos table
export const todosTable = pgTable('todos', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  category_id: integer('category_id'), // Nullable foreign key
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  is_completed: boolean('is_completed').notNull().default(false),
  due_date: timestamp('due_date'), // Nullable by default
  priority: priorityEnum('priority').notNull().default('medium'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  // Offline sync support
  last_synced_at: timestamp('last_synced_at'), // When this todo was last synced to client
  client_updated_at: timestamp('client_updated_at').notNull() // When client last modified this
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  todos: many(todosTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  todos: many(todosTable)
}));

export const todosRelations = relations(todosTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [todosTable.user_id],
    references: [usersTable.id]
  }),
  category: one(categoriesTable, {
    fields: [todosTable.category_id],
    references: [categoriesTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Todo = typeof todosTable.$inferSelect;
export type NewTodo = typeof todosTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable,
  categories: categoriesTable,
  todos: todosTable
};

export const tableRelations = {
  usersRelations,
  categoriesRelations,
  todosRelations
};