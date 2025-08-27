import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  loginInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  adminActionInputSchema,
  createTodoInputSchema,
  updateTodoInputSchema,
  getTodosInputSchema,
  syncTodosInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { authenticateUser } from './handlers/authenticate_user';
import { getUser } from './handlers/get_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { createTodo } from './handlers/create_todo';
import { getTodos } from './handlers/get_todos';
import { updateTodo } from './handlers/update_todo';
import { deleteTodo } from './handlers/delete_todo';
import { syncTodos } from './handlers/sync_todos';
import { verifyAdmin } from './handlers/verify_admin';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  authenticateUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  getUser: publicProcedure
    .input(z.string())
    .query(({ input }) => getUser(input)),

  // Category management routes (admin only)
  createCategory: publicProcedure
    .input(z.object({
      category: createCategoryInputSchema,
      adminAction: adminActionInputSchema
    }))
    .mutation(({ input }) => createCategory(input.category, input.adminAction)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  updateCategory: publicProcedure
    .input(z.object({
      category: updateCategoryInputSchema,
      adminAction: adminActionInputSchema
    }))
    .mutation(({ input }) => updateCategory(input.category, input.adminAction)),

  deleteCategory: publicProcedure
    .input(z.object({
      categoryId: z.number(),
      adminAction: adminActionInputSchema
    }))
    .mutation(({ input }) => deleteCategory(input.categoryId, input.adminAction)),

  // Todo management routes
  createTodo: publicProcedure
    .input(createTodoInputSchema)
    .mutation(({ input }) => createTodo(input)),

  getTodos: publicProcedure
    .input(getTodosInputSchema)
    .query(({ input }) => getTodos(input)),

  updateTodo: publicProcedure
    .input(updateTodoInputSchema)
    .mutation(({ input }) => updateTodo(input)),

  deleteTodo: publicProcedure
    .input(z.object({
      todoId: z.number(),
      userId: z.string()
    }))
    .mutation(({ input }) => deleteTodo(input.todoId, input.userId)),

  // Offline sync routes
  syncTodos: publicProcedure
    .input(syncTodosInputSchema)
    .mutation(({ input }) => syncTodos(input)),

  // Admin verification
  verifyAdmin: publicProcedure
    .input(z.string())
    .query(({ input }) => verifyAdmin(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();