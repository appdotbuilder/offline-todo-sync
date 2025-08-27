import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Shield, Palette } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Category } from '../../../server/src/schema';

interface AdminPanelProps {
  user: User;
  categories: Category[];
  onCategoriesUpdate: () => Promise<void>;
}

export function AdminPanel({ user, categories, onCategoriesUpdate }: AdminPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form states
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const [editCategoryForm, setEditCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  // Predefined colors for quick selection
  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ];

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryForm.name.trim()) return;

    setIsLoading(true);
    try {
      await trpc.createCategory.mutate({
        category: {
          name: newCategoryForm.name.trim(),
          description: newCategoryForm.description.trim() || null,
          color: newCategoryForm.color
        },
        adminAction: {
          admin_user_id: user.id
        }
      });

      // Reset form
      setNewCategoryForm({
        name: '',
        description: '',
        color: '#3B82F6'
      });

      await onCategoriesUpdate();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6'
    });
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setIsLoading(true);
    try {
      await trpc.updateCategory.mutate({
        category: {
          id: editingCategory.id,
          name: editCategoryForm.name.trim(),
          description: editCategoryForm.description.trim() || null,
          color: editCategoryForm.color
        },
        adminAction: {
          admin_user_id: user.id
        }
      });

      setEditingCategory(null);
      await onCategoriesUpdate();
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteCategory.mutate({
        categoryId,
        adminAction: {
          admin_user_id: user.id
        }
      });

      await onCategoriesUpdate();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user.is_admin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              You need administrator privileges to access this panel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-purple-600" />
            <div>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>
                Manage categories and system settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Create New Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Category
          </CardTitle>
          <CardDescription>
            Add new categories for users to organize their todos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-name"
                  placeholder="Category name"
                  value={newCategoryForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-color"
                    type="color"
                    value={newCategoryForm.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCategoryForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="w-16 h-10"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {colorOptions.map((color: string) => (
                      <button
                        key={color}
                        type="button"
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategoryForm((prev) => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                placeholder="Category description (optional)"
                value={newCategoryForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNewCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isLoading || !newCategoryForm.name.trim()}>
              {isLoading ? 'Creating...' : 'Create Category'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
          <CardDescription>
            Edit or delete existing categories ({categories.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
              <p className="text-gray-500">
                Create your first category to help users organize their todos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category: Category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: category.color || '#6B7280' }}
                    />
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Created {category.created_at.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Edit Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <form onSubmit={handleUpdateCategory}>
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={editCategoryForm.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setEditCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Color</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  value={editCategoryForm.color}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditCategoryForm((prev) => ({ ...prev, color: e.target.value }))
                                  }
                                  className="w-16 h-10"
                                />
                                <div className="flex gap-1">
                                  {colorOptions.slice(0, 5).map((color: string) => (
                                    <button
                                      key={color}
                                      type="button"
                                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: color }}
                                      onClick={() => setEditCategoryForm((prev) => ({ ...prev, color }))}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={editCategoryForm.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                  setEditCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                                }
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                              {isLoading ? 'Updating...' : 'Update Category'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Delete Dialog */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{category.name}"? 
                            This action cannot be undone and will remove the category 
                            from all existing todos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Category
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}