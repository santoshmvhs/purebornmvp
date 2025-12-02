'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { logger } from '@/lib/logger';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setSupabaseUser = useAuthStore((state) => state.setSupabaseUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
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
      } catch (err: any) {
        // Supabase not configured - show error to user
        if (err.message?.includes('Supabase') || err.message?.includes('not configured')) {
          setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.');
          logger.error('Supabase configuration error:', err);
        }
      }
    };
    
    // Only check session if Supabase is configured
    const client = getSupabaseClient();
    if (client) {
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
    } else {
      // Supabase not configured - show error immediately
      setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.');
    }
  }, [router, setAuth, setSupabaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        // Sign up flow
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        logger.log('Attempting Supabase signup...');
        
        // Sign up with Supabase
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signupError) {
          throw signupError;
        }

        if (!signupData.user) {
          throw new Error('No user returned from Supabase signup');
        }

        logger.log('Supabase signup successful');

        // Create user in backend database
        try {
          // Use the register endpoint to create user in database
          // Note: This requires admin access, so we'll need to handle this differently
          // For now, we'll create the user via a direct API call
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://purebornmvp.onrender.com'}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              username: email,
              password: 'placeholder', // Not used with Supabase Auth
              role: role,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to create user in database' }));
            // If user already exists, that's okay - they can just log in
            if (response.status !== 400 || !errorData.detail?.includes('already')) {
              throw new Error(errorData.detail || 'Failed to create user in database');
            }
          }
        } catch (dbError: any) {
          // If database creation fails but Supabase signup succeeded, 
          // user can still log in - they just need to be added to database manually
          logger.warn('Failed to create user in database:', dbError);
          if (!dbError.message?.includes('already')) {
            setError('Account created in Supabase, but failed to create database record. Please contact administrator.');
            setLoading(false);
            return;
          }
        }

        // Auto sign in after signup
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        if (!signInData.session || !signInData.user) {
          throw new Error('No session returned after signup');
        }

        // Get user data from backend
        const userData = await authApi.getCurrentUser();
        logger.log('User authenticated after signup:', userData.username);

        setAuth(signInData.session.access_token, userData, signInData.user);
        router.push('/');
      } else {
        // Login flow
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
      }
    } catch (err: any) {
      logger.error(isSignup ? 'Signup error:' : 'Login error:', err);
      
      // Provide helpful error messages
      if (err.message?.includes('Supabase configuration') || err.message?.includes('Failed to fetch')) {
        setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
        setIsSignup(false);
      } else {
        setError(err.message || (isSignup ? 'Signup failed. Please try again.' : 'Login failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Pureborn</CardTitle>
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

