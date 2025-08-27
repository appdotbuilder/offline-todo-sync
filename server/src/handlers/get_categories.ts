import { type Category } from '../schema';

export const getCategories = async (): Promise<Category[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all categories from the database
    // Should return all categories available for todo assignment
    // Categories are public and can be viewed by all authenticated users
    return Promise.resolve([
        {
            id: 1,
            name: 'Work',
            description: 'Work-related tasks',
            color: '#3B82F6',
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 2,
            name: 'Personal',
            description: 'Personal tasks and reminders',
            color: '#10B981',
            created_at: new Date(),
            updated_at: new Date()
        }
    ] as Category[]);
};