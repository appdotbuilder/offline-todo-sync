import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
  });

  it('should return all categories ordered by creation date (newest first)', async () => {
    // Create test categories in specific order
    const firstCategory = await db.insert(categoriesTable)
      .values({
        name: 'Work',
        description: 'Work-related tasks',
        color: '#3B82F6'
      })
      .returning()
      .execute();

    // Add small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondCategory = await db.insert(categoriesTable)
      .values({
        name: 'Personal',
        description: 'Personal tasks',
        color: '#10B981'
      })
      .returning()
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    
    // Should be ordered by creation date (newest first)
    expect(result[0].id).toEqual(secondCategory[0].id);
    expect(result[0].name).toEqual('Personal');
    expect(result[0].description).toEqual('Personal tasks');
    expect(result[0].color).toEqual('#10B981');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].id).toEqual(firstCategory[0].id);
    expect(result[1].name).toEqual('Work');
    expect(result[1].description).toEqual('Work-related tasks');
    expect(result[1].color).toEqual('#3B82F6');
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should handle categories with nullable fields', async () => {
    // Create category with minimal required fields only
    await db.insert(categoriesTable)
      .values({
        name: 'Minimal Category'
        // description and color are nullable
      })
      .returning()
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Minimal Category');
    expect(result[0].description).toBeNull();
    expect(result[0].color).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple categories with consistent structure', async () => {
    // Create multiple categories with different data patterns
    const categories = [
      { name: 'Category A', description: 'Description A', color: '#FF0000' },
      { name: 'Category B', description: null, color: '#00FF00' },
      { name: 'Category C', description: 'Description C', color: null },
      { name: 'Category D', description: null, color: null }
    ];

    for (const category of categories) {
      await db.insert(categoriesTable)
        .values(category)
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    const result = await getCategories();

    expect(result).toHaveLength(4);
    
    // Verify all results have required structure
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(typeof category.name).toBe('string');
      expect(category.created_at).toBeInstanceOf(Date);
      expect(category.updated_at).toBeInstanceOf(Date);
      // description and color can be null or string
      expect(category.description === null || typeof category.description === 'string').toBe(true);
      expect(category.color === null || typeof category.color === 'string').toBe(true);
    });

    // Should be ordered by creation date (newest first)
    expect(result[0].name).toEqual('Category D');
    expect(result[1].name).toEqual('Category C');
    expect(result[2].name).toEqual('Category B');
    expect(result[3].name).toEqual('Category A');
  });

  it('should maintain consistent date ordering across multiple calls', async () => {
    // Create categories
    await db.insert(categoriesTable)
      .values({ name: 'First' })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(categoriesTable)
      .values({ name: 'Second' })
      .execute();

    // Make multiple calls and verify consistent ordering
    const result1 = await getCategories();
    const result2 = await getCategories();

    expect(result1).toHaveLength(2);
    expect(result2).toHaveLength(2);
    
    // Both calls should return same order
    expect(result1[0].name).toEqual(result2[0].name);
    expect(result1[1].name).toEqual(result2[1].name);
    
    // Should be ordered newest first
    expect(result1[0].name).toEqual('Second');
    expect(result1[1].name).toEqual('First');
  });
});