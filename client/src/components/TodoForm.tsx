import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import type { Category } from '../../../server/src/schema';

interface TodoFormProps {
  categories: Category[];
  onSubmit: (
    title: string, 
    description: string | null, 
    categoryId: number | null, 
    dueDate: Date | null, 
    priority: 'low' | 'medium' | 'high'
  ) => Promise<void>;
}

export function TodoForm({ categories, onSubmit }: TodoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: null as number | null,
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit(
        formData.title.trim(),
        formData.description.trim() || null,
        formData.category_id,
        formData.due_date ? new Date(formData.due_date) : null,
        formData.priority
      );

      // Reset form
      setFormData({
        title: '',
        description: '',
        category_id: null,
        due_date: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (formData.title.trim()) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="What needs to be done?"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            required
            className="text-base"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Add any additional details..."
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <Select
              value={formData.category_id?.toString() || ''}
              onValueChange={(value: string) =>
                setFormData((prev) => ({ 
                  ...prev, 
                  category_id: value ? parseInt(value) : null 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {categories.map((category: Category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center gap-2">
                      {category.color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: 'low' | 'medium' | 'high') =>
                setFormData((prev) => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Low Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    High Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="due_date" className="text-sm font-medium">
            Due Date
          </Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, due_date: e.target.value }))
            }
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
        <p className="text-xs text-gray-500">
          💡 <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 bg-white border rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-white border rounded text-xs">Enter</kbd> to quickly create
        </p>
        
        <Button 
          type="submit" 
          disabled={isLoading || !formData.title.trim()}
          className="min-w-32"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Todo
            </div>
          )}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Form Preview:</span>
            <span className="text-xs text-gray-500">
              {formData.title.length}/100 characters
            </span>
          </div>
          
          <div className="space-y-1">
            <div>
              <strong>Title:</strong> {formData.title || 'Untitled todo'}
            </div>
            {formData.description && (
              <div>
                <strong>Description:</strong> {formData.description.substring(0, 50)}
                {formData.description.length > 50 && '...'}
              </div>
            )}
            <div className="flex gap-4">
              <span>
                <strong>Priority:</strong> {formData.priority}
              </span>
              {formData.due_date && (
                <span>
                  <strong>Due:</strong> {new Date(formData.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}