'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

// Helper function to get API URL
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://backend.pureborn.in';
    }
  }
  return 'http://localhost:9000';
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
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
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Supabase is not configured. Please check environment variables.');
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user && session?.access_token) {
          // Get user data from backend
          try {
            const apiUrl = getApiBaseUrl();
            // Refresh session to get a valid token
            const { data: refreshData } = await supabase.auth.refreshSession(session);
            const activeSession = refreshData?.session || session;
            
            const response = await fetch(`${apiUrl}/users/me`, {
              headers: {
                'Authorization': `Bearer ${activeSession?.access_token || session.access_token}`,
              },
              credentials: 'include',
            });

            if (response.ok) {
              const userData = await response.json();
              setAuth(session.access_token, userData, session.user);
              router.push('/');
            }
          } catch (err) {
            console.error('Failed to get user data:', err);
          }
        }
      } catch (err: any) {
        console.error('Session check error:', err);
      }
    };

    checkSession();
  }, [router, setAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      // Sign in with Supabase
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data.session || !data.user || !data.session.access_token) {
        throw new Error('No session returned from Supabase');
      }

      // For fresh sign-in, use the session directly (it should be valid)
      // Only refresh if we detect the token is already expired (shouldn't happen for fresh sign-in)
      let activeSession = data.session;
      const now = Math.floor(Date.now() / 1000);
      const tokenExp = activeSession.expires_at || 0;
      
      // Only refresh if token is actually expired (not just expiring soon)
      // For fresh sign-ins, this should never happen
      if (tokenExp > 0 && tokenExp <= now) {
        console.warn('Token is expired on fresh sign-in, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(data.session);
        if (refreshError) {
          console.error('Failed to refresh expired session:', refreshError);
          throw new Error('Session expired immediately after sign-in. Please try again.');
        }
        if (refreshData?.session) {
          activeSession = refreshData.session;
          console.log('Session refreshed successfully');
        }
      }
      
      if (!activeSession?.access_token) {
        throw new Error('No valid access token available');
      }

      // Get user data from backend
      const apiUrl = getApiBaseUrl();
      let response: Response;
      
      // Log token info for debugging (first 20 chars only for security)
      const tokenPreview = activeSession.access_token.substring(0, 20) + '...';
      console.log('Using token:', {
        length: activeSession.access_token.length,
        preview: tokenPreview,
        expiresAt: activeSession.expires_at,
        expiresIn: activeSession.expires_at ? activeSession.expires_at - Math.floor(Date.now() / 1000) : 'unknown',
      });
      
      try {
        response = await fetch(`${apiUrl}/users/me`, {
          headers: {
            'Authorization': `Bearer ${activeSession.access_token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      } catch (fetchError: any) {
        // Network error - backend might be unreachable or CORS issue
        console.error('Network error:', fetchError);
        throw new Error(
          `Cannot connect to backend at ${apiUrl}. ` +
          `Please check: 1) Backend is running, 2) CORS is configured correctly, 3) Network connectivity.`
        );
      }

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to get user data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error('Backend error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
        } catch {
          // If JSON parsing fails, try text
          try {
            errorMessage = await response.text();
            console.error('Backend error (text):', {
              status: response.status,
              statusText: response.statusText,
              body: errorMessage,
            });
          } catch {
            // If that also fails, use status-based message
            if (response.status === 401 || response.status === 403) {
              errorMessage = 'Authentication failed. The token may be expired or invalid. Please try signing in again.';
            } else if (response.status === 500) {
              errorMessage = 'Server error. Please check backend configuration (SUPABASE_JWT_SECRET may be missing or incorrect).';
            } else {
              errorMessage = `Backend returned error: ${response.status} ${response.statusText}`;
            }
            console.error('Backend error (no body):', {
              status: response.status,
              statusText: response.statusText,
            });
          }
        }
        throw new Error(errorMessage);
      }

      const userData = await response.json();
      setAuth(activeSession.access_token, userData, data.user);
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

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

      // Check if email confirmation is required
      if (signupData.session === null) {
        setError('Please check your email to confirm your account before signing in.');
        setLoading(false);
        setIsSignup(false);
        return;
      }

      // Create user in backend database
      const apiUrl = getApiBaseUrl();
      const signupResponse = await fetch(`${apiUrl}/auth/signup`, {
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

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json().catch(() => ({ detail: 'Failed to create user' }));
        // If user already exists, that's okay
        if (signupResponse.status !== 400 || !errorData.detail?.includes('already')) {
          console.warn('Failed to create user in database:', errorData);
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

      if (!signInData.session || !signInData.user || !signInData.session.access_token) {
        throw new Error('No session returned after signup');
      }

      // Get user data from backend
      const userResponse = await fetch(`${apiUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${signInData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!userResponse.ok) {
        throw new Error('User not found in database. Please contact administrator.');
      }

      const userData = await userResponse.json();
      setAuth(signInData.session.access_token, userData, signInData.user);
      router.push('/');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Signup failed. Please try again.');
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
            {isSignup ? 'Create a new account' : 'Sign in to access the admin panel'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
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
            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(value: 'admin' | 'cashier') => setRole(value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {isSignup ? (
              <p>
                Already have an account?{' '}
                <Button variant="link" onClick={() => setIsSignup(false)} disabled={loading} className="p-0 h-auto">
                  Sign In
                </Button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <Button variant="link" onClick={() => setIsSignup(true)} disabled={loading} className="p-0 h-auto">
                  Sign Up
                </Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
