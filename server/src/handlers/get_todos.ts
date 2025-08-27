import { type GetTodosInput, type Todo } from '../schema';

export const getTodos = async (input: GetTodosInput): Promise<Todo[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching todos for a specific user with optional filtering
    // Should support filtering by category, completion status, due dates, priority
    // Should support incremental sync by returning only todos modified after last_synced_after
    // Should include related category data if needed
    return Promise.resolve([
        {
            id: 1,
            user_id: input.user_id,
            category_id: 1,
            title: 'Sample Todo 1',
            description: 'This is a sample todo item',
            is_completed: false,
            due_date: new Date(Date.now() + 86400000), // Due tomorrow
            priority: 'high',
            created_at: new Date(),
            updated_at: new Date(),
            last_synced_at: new Date(),
            client_updated_at: new Date()
        },
        {
            id: 2,
            user_id: input.user_id,
            category_id: null,
            title: 'Sample Todo 2',
            description: null,
            is_completed: true,
            due_date: null,
            priority: 'low',
            created_at: new Date(),
            updated_at: new Date(),
            last_synced_at: new Date(),
            client_updated_at: new Date()
        }
    ] as Todo[]);
};