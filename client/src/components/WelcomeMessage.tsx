import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Tag, Star } from 'lucide-react';
import type { User } from '../../../server/src/schema';

interface WelcomeMessageProps {
  user: User;
  todoCount: number;
}

export function WelcomeMessage({ user, todoCount }: WelcomeMessageProps) {
  if (todoCount > 0) return null;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">👋</span>
          Welcome, {user.name}!
        </CardTitle>
        <CardDescription className="text-base">
          Ready to get organized? Here's how to make the most of your todo app:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Create Tasks</h3>
              <p className="text-sm text-gray-600">
                Use the "Add Todo" tab to create your first task with priority and due dates
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Organize with Categories</h3>
              <p className="text-sm text-gray-600">
                Group your tasks by category like Work, Personal, or Shopping
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Set Priorities</h3>
              <p className="text-sm text-gray-600">
                Use high, medium, and low priorities to focus on what matters most
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Star className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Works Offline</h3>
              <p className="text-sm text-gray-600">
                Your tasks sync automatically when you're back online
              </p>
            </div>
          </div>
        </div>

        {user.is_admin && (
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="default" className="bg-purple-600">
                Admin Access
              </Badge>
            </div>
            <p className="text-sm text-purple-700">
              You have administrator privileges! Visit the Admin Panel tab to manage categories 
              for all users.
            </p>
          </div>
        )}

        <div className="text-center pt-4 border-t border-blue-200">
          <p className="text-sm text-gray-600">
            Ready to get started? Create your first todo item above! 🚀
          </p>
        </div>
      </CardContent>
    </Card>
  );
}