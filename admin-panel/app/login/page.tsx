'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { logger } from '@/lib/logger';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setSupabaseUser = useAuthStore((state) => state.setSupabaseUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseUser(session.user);
        // Get user data from backend
        try {
          const userData = await authApi.getCurrentUser();
          setAuth(session.access_token, userData, session.user);
          router.push('/');
        } catch (err) {
          logger.error('Failed to get user data:', err);
        }
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSupabaseUser(session.user);
        try {
          const userData = await authApi.getCurrentUser();
          setAuth(session.access_token, userData, session.user);
          router.push('/');
        } catch (err) {
          logger.error('Failed to get user data:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuth('', null, null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, setAuth, setSupabaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      logger.log('Attempting Supabase login...');
      
      // Sign in with Supabase
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data.session || !data.user) {
        throw new Error('No session returned from Supabase');
      }

      logger.log('Supabase login successful');

      // Get user data from backend (which will verify the Supabase JWT)
      const userData = await authApi.getCurrentUser();
      logger.log('User authenticated:', userData.username);

      setAuth(data.session.access_token, userData, data.user);
      router.push('/');
    } catch (err: any) {
      logger.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Augment POS Admin</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            <p>Sign in with your email and password</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

