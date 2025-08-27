import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, CalendarDays, Pencil, Trash2, Clock } from 'lucide-react';
import type { Todo, Category } from '../../../server/src/schema';

interface TodoListProps {
  todos: Todo[];
  categories: Category[];
  isLoading: boolean;
  onUpdateTodo: (todoId: number, updates: Partial<Todo>) => Promise<void>;
  onDeleteTodo: (todoId: number) => Promise<void>;
}

export function TodoList({ todos, categories, isLoading, onUpdateTodo, onDeleteTodo }: TodoListProps) {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category_id: null as number | null,
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const handleEditClick = (todo: Todo) => {
    setEditingTodo(todo);
    setEditFormData({
      title: todo.title,
      description: todo.description || '',
      category_id: todo.category_id,
      due_date: todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '',
      priority: todo.priority
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo) return;

    await onUpdateTodo(editingTodo.id, {
      title: editFormData.title,
      description: editFormData.description || null,
      category_id: editFormData.category_id,
      due_date: editFormData.due_date ? new Date(editFormData.due_date) : null,
      priority: editFormData.priority
    });

    setEditingTodo(null);
  };

  const handleToggleComplete = async (todo: Todo) => {
    await onUpdateTodo(todo.id, {
      is_completed: !todo.is_completed
    });
  };

  const getCategoryById = (categoryId: number | null) => {
    if (!categoryId) return null;
    return categories.find((category: Category) => category.id === categoryId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
        <p className="text-gray-500">
          Get started by creating your first todo item!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {todos.map((todo: Todo) => {
        const category = getCategoryById(todo.category_id);
        const dueDateFormatted = formatDueDate(todo.due_date);
        const overdue = isOverdue(todo.due_date);

        return (
          <Card key={todo.id} className={`transition-all hover:shadow-md ${
            todo.is_completed ? 'opacity-60' : ''
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Checkbox
                    checked={todo.is_completed}
                    onCheckedChange={() => handleToggleComplete(todo)}
                    className="h-5 w-5"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className={`font-medium text-gray-900 ${
                        todo.is_completed ? 'line-through text-gray-500' : ''
                      }`}>
                        {todo.title}
                      </h3>

                      {todo.description && (
                        <p className={`text-sm text-gray-600 ${
                          todo.is_completed ? 'line-through' : ''
                        }`}>
                          {todo.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(todo.priority)}`}
                        >
                          {todo.priority} priority
                        </Badge>

                        {/* Category Badge */}
                        {category && (
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: category.color || '#e5e7eb', 
                              color: category.color || '#6b7280' 
                            }}
                          >
                            {category.name}
                          </Badge>
                        )}

                        {/* Due Date Badge */}
                        {dueDateFormatted && (
                          <Badge 
                            variant={overdue ? "destructive" : "secondary"} 
                            className="text-xs flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {dueDateFormatted}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-4">
                      {/* Edit Button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditClick(todo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <form onSubmit={handleEditSubmit}>
                            <DialogHeader>
                              <DialogTitle>Edit Todo</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Input
                                  placeholder="Todo title"
                                  value={editFormData.title}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                                  }
                                  required
                                />
                              </div>
                              
                              <div>
                                <Textarea
                                  placeholder="Description (optional)"
                                  value={editFormData.description}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Select
                                    value={editFormData.category_id?.toString() || ''}
                                    onValueChange={(value: string) =>
                                      setEditFormData((prev) => ({ 
                                        ...prev, 
                                        category_id: value ? parseInt(value) : null 
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">No category</SelectItem>
                                      {categories.map((category: Category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Select
                                    value={editFormData.priority}
                                    onValueChange={(value: 'low' | 'medium' | 'high') =>
                                      setEditFormData((prev) => ({ ...prev, priority: value }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low Priority</SelectItem>
                                      <SelectItem value="medium">Medium Priority</SelectItem>
                                      <SelectItem value="high">High Priority</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <Input
                                  type="date"
                                  value={editFormData.due_date}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditFormData((prev) => ({ ...prev, due_date: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit">Update Todo</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Todo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{todo.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDeleteTodo(todo.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}