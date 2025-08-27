import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface AuthFormProps {
  onAuth: (email: string, name: string, authProvider: 'google' | 'email', avatarUrl?: string) => Promise<void>;
  isLoading: boolean;
}

export function AuthForm({ onAuth, isLoading }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: ''
  });

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;
    
    await onAuth(formData.email, formData.name, 'email');
  };

  const handleGoogleAuth = async () => {
    // In a real implementation, this would integrate with Google OAuth
    // For now, we'll simulate Google auth with mock data
    const mockGoogleUser = {
      email: 'demo@gmail.com',
      name: 'Demo User',
      avatarUrl: 'https://via.placeholder.com/40'
    };
    
    await onAuth(mockGoogleUser.email, mockGoogleUser.name, 'google', mockGoogleUser.avatarUrl);
  };

  const handleQuickDemo = async () => {
    // Quick demo login for testing
    await onAuth('demo@example.com', 'Demo User', 'email');
  };

  const handleAdminDemo = async () => {
    // Admin demo login - in real app, admin status would be set in backend
    await onAuth('admin@example.com', 'Admin User', 'email');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !formData.email || !formData.name}
            >
              {isLoading ? 'Signing in...' : 'Sign In / Sign Up'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <Button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            *Mock Google auth for demo purposes
          </p>
        </TabsContent>
      </Tabs>

      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Quick Demo</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleQuickDemo}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            Demo User
          </Button>
          <Button
            onClick={handleAdminDemo}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            Admin Demo
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Quick access for testing features
        </p>
      </div>
    </div>
  );
}