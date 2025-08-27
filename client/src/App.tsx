import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, Todo, Category } from '../../server/src/schema';

// Import components
import { AuthForm } from '@/components/AuthForm';
import { TodoList } from '@/components/TodoList';
import { TodoForm } from '@/components/TodoForm';
import { AdminPanel } from '@/components/AdminPanel';
import { UserProfile } from '@/components/UserProfile';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { SyncStatus } from '@/components/SyncStatus';
import { WelcomeMessage } from '@/components/WelcomeMessage';

function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // App state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  // Load todos for authenticated user
  const loadTodos = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await trpc.getTodos.query({
        user_id: user.id,
        category_id: selectedCategory || undefined,
        is_completed: showCompleted ? undefined : false
      });
      setTodos(result);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCategory, showCompleted]);

  // Manual sync function
  const handleManualSync = useCallback(async () => {
    if (!user) return;
    await loadTodos();
  }, [loadTodos, user]);

  // Load initial data
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (user) {
      loadTodos();
    }
  }, [loadTodos, user]);

  // Authentication handlers
  const handleAuth = async (email: string, name: string, authProvider: 'google' | 'email', avatarUrl?: string) => {
    setIsAuthenticating(true);
    try {
      const authenticatedUser = await trpc.authenticateUser.mutate({
        email,
        name,
        auth_provider: authProvider,
        avatar_url: avatarUrl
      });
      
      if (authenticatedUser) {
        // For demo purposes, set admin status based on email
        const isAdmin = email.includes('admin');
        const userWithAdminStatus = { ...authenticatedUser, is_admin: isAdmin };
        
        setUser(userWithAdminStatus);
        // Store user in localStorage for offline access
        localStorage.setItem('todoApp_user', JSON.stringify(userWithAdminStatus));
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTodos([]);
    localStorage.removeItem('todoApp_user');
  };

  // Todo handlers
  const handleCreateTodo = async (title: string, description: string | null, categoryId: number | null, dueDate: Date | null, priority: 'low' | 'medium' | 'high') => {
    if (!user) return;

    try {
      const newTodo = await trpc.createTodo.mutate({
        user_id: user.id,
        title,
        description,
        category_id: categoryId,
        due_date: dueDate,
        priority
      });
      
      setTodos((prev: Todo[]) => [newTodo, ...prev]);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleUpdateTodo = async (todoId: number, updates: Partial<Todo>) => {
    try {
      const updatedTodo = await trpc.updateTodo.mutate({
        id: todoId,
        ...updates
      });
      
      setTodos((prev: Todo[]) => 
        prev.map(todo => todo.id === todoId ? { ...todo, ...updatedTodo } : todo)
      );
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    if (!user) return;

    try {
      await trpc.deleteTodo.mutate({
        todoId,
        userId: user.id
      });
      
      setTodos((prev: Todo[]) => prev.filter(todo => todo.id !== todoId));
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  // Check for stored user on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('todoApp_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('todoApp_user');
      }
    }
  }, []);

  // Calculate stats
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.is_completed).length;
  const pendingTodos = totalTodos - completedTodos;
  const overdueTodos = todos.filter(todo => 
    !todo.is_completed && 
    todo.due_date && 
    new Date(todo.due_date) < new Date()
  ).length;

  // If not authenticated, show auth form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xl">✓</span>
              </div>
              <CardTitle className="text-2xl font-bold">Todo App</CardTitle>
              <CardDescription>
                Organize your tasks, achieve your goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm 
                onAuth={handleAuth}
                isLoading={isAuthenticating}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Todo App</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Stats */}
              <div className="hidden sm:flex items-center space-x-4">
                <OfflineIndicator />
                <SyncStatus 
                  lastSyncTime={lastSyncTime} 
                  onManualSync={handleManualSync}
                />
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary" className="text-xs">
                  {totalTodos} total
                </Badge>
                <Badge variant="default" className="text-xs bg-green-600">
                  {completedTodos} done
                </Badge>
                <Badge variant="default" className="text-xs bg-yellow-600">
                  {pendingTodos} pending
                </Badge>
                {overdueTodos > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {overdueTodos} overdue
                  </Badge>
                )}
              </div>
              
              <UserProfile user={user} onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="todos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-fit lg:grid-cols-3">
            <TabsTrigger value="todos">My Todos</TabsTrigger>
            <TabsTrigger value="create">Add Todo</TabsTrigger>
            {user.is_admin && (
              <TabsTrigger value="admin">Admin Panel</TabsTrigger>
            )}
          </TabsList>

          {/* Todos Tab */}
          <TabsContent value="todos" className="space-y-6">
            {/* Welcome Message for new users */}
            <WelcomeMessage user={user} todoCount={totalTodos} />
            
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Your Tasks</CardTitle>
                    <CardDescription>
                      Manage and track your todo items
                    </CardDescription>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedCategory || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category: Category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    
                    <Button
                      variant={showCompleted ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowCompleted(!showCompleted)}
                    >
                      {showCompleted ? "Hide Completed" : "Show Completed"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TodoList
                  todos={todos}
                  categories={categories}
                  isLoading={isLoading}
                  onUpdateTodo={handleUpdateTodo}
                  onDeleteTodo={handleDeleteTodo}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Todo Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New Todo</CardTitle>
                <CardDescription>
                  Add a new task to your list
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TodoForm
                  categories={categories}
                  onSubmit={handleCreateTodo}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Panel Tab */}
          {user.is_admin && (
            <TabsContent value="admin">
              <AdminPanel
                user={user}
                categories={categories}
                onCategoriesUpdate={loadCategories}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default App;