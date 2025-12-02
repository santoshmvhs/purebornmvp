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

// Helper function to get API URL (same as in api.ts)
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://purebornmvp.onrender.com';
    }
  }
  return 'http://localhost:9000';
};

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
        
        // Check if Supabase is configured before attempting signup
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
          setError('Supabase is not configured. Please check your environment variables.');
          setLoading(false);
          return;
        }
        
        logger.log('Supabase client initialized, starting signup...');
        
        // Sign up with Supabase with timeout
        let signupTimeout: NodeJS.Timeout | null = null;
        const signupPromise = supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/login`,
          },
        });
        
        const signupTimeoutPromise = new Promise<never>((_, reject) => {
          signupTimeout = setTimeout(() => {
            reject(new Error('Signup request timed out after 30 seconds. Please check your connection and try again.'));
          }, 30000); // 30 second timeout
        });
        
        let signupData: any = null, signupError: any = null;
        try {
          const result = await Promise.race([signupPromise, signupTimeoutPromise]);
          if (signupTimeout) clearTimeout(signupTimeout);
          
          if (result.error) {
            signupError = result.error;
          } else {
            signupData = result.data;
          }
        } catch (timeoutError: any) {
          if (signupTimeout) clearTimeout(signupTimeout);
          logger.error('Signup timeout error:', timeoutError);
          if (timeoutError.message?.includes('timed out')) {
            setError('Signup request timed out after 30 seconds. This might indicate:\n1. Slow network connection\n2. Supabase service is down\n3. Firewall blocking the request\n\nPlease check your internet connection and try again.');
            setLoading(false);
            return;
          }
          throw timeoutError;
        }
        
        if (signupError) {
          logger.error('Supabase signup error:', signupError);
          throw signupError;
        }

        if (signupError) {
          logger.error('Supabase signup error:', signupError);
          throw signupError;
        }

        if (!signupData.user) {
          throw new Error('No user returned from Supabase signup');
        }

        if (!signupData.user) {
          throw new Error('No user returned from Supabase signup');
        }

        logger.log('Supabase signup successful, user:', signupData.user.email);
        
        // Check if email confirmation is required
        if (signupData.session === null && signupData.user) {
          // Email confirmation required
          setError('Please check your email to confirm your account before signing in.');
          setLoading(false);
          setIsSignup(false);
          return;
        }

        // Create user in backend database
        try {
          logger.log('Creating user in database...');
          const apiUrl = getApiBaseUrl();
          logger.log('API URL:', apiUrl);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch(`${apiUrl}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal: controller.signal,
            body: JSON.stringify({
              username: email,
              password: 'placeholder', // Not used with Supabase Auth
              role: role,
            }),
          });

          clearTimeout(timeoutId);
          logger.log('Database signup response status:', response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to create user in database' }));
            logger.error('Database signup error:', errorData);
            // If user already exists, that's okay - they can just log in
            if (response.status !== 400 || !errorData.detail?.includes('already')) {
              throw new Error(errorData.detail || 'Failed to create user in database');
            }
          } else {
            logger.log('User created in database successfully');
          }
        } catch (dbError: any) {
          // If database creation fails but Supabase signup succeeded, 
          // user can still log in - they just need to be added to database manually
          logger.warn('Failed to create user in database:', dbError);
          
          // Check if it's a timeout or network error
          if (dbError.name === 'AbortError') {
            setError('Request timed out. Please check your connection and try again.');
            setLoading(false);
            return;
          }
          
          if (!dbError.message?.includes('already')) {
            setError(`Account created in Supabase, but failed to create database record: ${dbError.message || 'Unknown error'}. Please contact administrator.`);
            setLoading(false);
            return;
          }
        }

        // Auto sign in after signup
        logger.log('Auto signing in after signup...');
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          logger.error('Auto signin error:', signInError);
          throw signInError;
        }

        if (!signInData.session || !signInData.user) {
          throw new Error('No session returned after signup');
        }

        logger.log('Auto signin successful, getting user data...');

        // Get user data from backend
        try {
          const userData = await authApi.getCurrentUser();
          logger.log('User authenticated after signup:', userData.username);

          setAuth(signInData.session.access_token, userData, signInData.user);
          router.push('/');
        } catch (userError: any) {
          logger.error('Failed to get user data:', userError);
          // If user doesn't exist in database yet, show helpful message
          if (userError.response?.status === 401 || userError.response?.status === 404) {
            setError('Account created in Supabase, but user not found in database. Please contact administrator to add your account.');
            setLoading(false);
            return;
          }
          throw userError;
        }
      } else {
        // Login flow
        logger.log('Attempting Supabase login...');
        
        // Check if Supabase is configured before attempting login
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET';
          logger.error('Supabase not configured:', { url: supabaseUrl, key: supabaseKey });
          setError(`Supabase is not configured. URL: ${supabaseUrl}, Key: ${supabaseKey}. Please check your Cloudflare Pages environment variables.`);
          setLoading(false);
          return;
        }
        
        // Log Supabase configuration (without exposing the key)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'unknown';
        logger.log('Supabase client initialized, starting login...', { 
          url: supabaseUrl,
          urlLength: supabaseUrl.length,
          keySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        });
        
        // Skip connectivity test - it's causing issues, go straight to login
        console.log('[LOGIN] Starting Supabase login...');
        logger.log('Calling Supabase signInWithPassword...');
        const startTime = Date.now();
        
        try {
          console.log('[LOGIN] Calling supabaseClient.auth.signInWithPassword...');
          
          // Add timeout wrapper for Supabase call
          const loginPromise = supabaseClient.auth.signInWithPassword({
            email,
            password,
          });
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Supabase login timed out after 15 seconds'));
            }, 15000); // 15 second timeout
          });
          
          const result = await Promise.race([loginPromise, timeoutPromise]) as any;
          
          console.log('[LOGIN] Supabase response received:', {
            hasError: !!result.error,
            hasSession: !!result.data?.session,
            hasUser: !!result.data?.user,
            error: result.error?.message
          });
          
          const elapsed = Date.now() - startTime;
          console.log(`[LOGIN] Supabase signInWithPassword completed in ${elapsed}ms`);
          logger.log(`Supabase signInWithPassword completed in ${elapsed}ms`, { 
            hasError: !!result.error,
            hasSession: !!result.data?.session,
            hasUser: !!result.data?.user 
          });
          
          if (result.error) {
            console.error('[LOGIN] Supabase error:', result.error);
            throw result.error;
          }
          
          if (!result.data || !result.data.session || !result.data.user) {
            console.error('[LOGIN] No session returned from Supabase');
            throw new Error('No session returned from Supabase');
          }
          
          logger.log('Supabase login successful, getting user data...');
          console.log('[LOGIN] Supabase login successful, starting backend call...');
          
          // Get user data from backend (which will verify the Supabase JWT)
          // Use the session token directly instead of calling getSession() again
          try {
            const apiUrl = getApiBaseUrl();
            console.log('[LOGIN] API URL:', apiUrl);
            logger.log('Calling backend /users/me endpoint...', { 
              apiUrl,
              tokenLength: result.data.session.access_token.length,
              tokenPrefix: result.data.session.access_token.substring(0, 20) + '...'
            });
            
            // Add timeout to fetch request
            const fetchController = new AbortController();
            const fetchTimeout = setTimeout(() => {
              console.error('[LOGIN] Fetch timeout - aborting request');
              fetchController.abort();
            }, 10000); // 10 second timeout for backend call
            
            const accessToken = result.data.session.access_token;
            console.log('[LOGIN] Token details:', {
              tokenLength: accessToken?.length || 0,
              tokenPrefix: accessToken?.substring(0, 20) || 'NO TOKEN',
              isJWTFormat: accessToken?.split('.').length === 3,
              fullToken: accessToken // Log full token for debugging (remove in production)
            });
            
            if (!accessToken) {
              throw new Error('No access token in Supabase session');
            }
            
            console.log('[LOGIN] Starting fetch to', `${apiUrl}/users/me`);
            const fetchStartTime = Date.now();
            const userDataResponse = await fetch(`${apiUrl}/users/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              signal: fetchController.signal,
            });
            
            clearTimeout(fetchTimeout);
            const fetchElapsed = Date.now() - fetchStartTime;
            console.log('[LOGIN] Backend response received:', {
              status: userDataResponse.status,
              ok: userDataResponse.ok,
              elapsed: fetchElapsed
            });
            logger.log(`Backend /users/me response received in ${fetchElapsed}ms`, {
              status: userDataResponse.status,
              ok: userDataResponse.ok
            });
            
            if (!userDataResponse.ok) {
              const errorText = await userDataResponse.text().catch(() => 'Unable to read error');
              logger.error('Backend user lookup failed:', { 
                status: userDataResponse.status, 
                statusText: userDataResponse.statusText,
                error: errorText 
              });
              
              if (userDataResponse.status === 401 || userDataResponse.status === 404) {
                setError('User not found in database. Please contact administrator to add your account.');
                setLoading(false);
                return;
              }
              throw new Error(`Backend returned ${userDataResponse.status}: ${errorText}`);
            }
            
            const userData = await userDataResponse.json();
            logger.log('User authenticated:', userData.username);

            setAuth(result.data.session.access_token, userData, result.data.user);
            router.push('/');
          } catch (userError: any) {
            console.error('[LOGIN] Failed to get user data:', userError);
            logger.error('Failed to get user data:', userError);
            
            // Handle timeout
            if (userError.name === 'AbortError') {
              console.error('[LOGIN] Request was aborted (timeout)');
              setError('Backend request timed out. Please check:\n1. Backend server is running\n2. CORS is configured correctly\n3. Network connectivity');
              setLoading(false);
              return;
            }
            
            // If it's a network/timeout error
            if (userError.name === 'TypeError' && userError.message?.includes('fetch')) {
              setError('Failed to connect to backend server. Please check:\n1. Backend URL is correct\n2. Backend server is running\n3. CORS is configured');
              setLoading(false);
              return;
            }
            
            if (userError.code === 'ERR_NETWORK' || userError.message?.includes('timeout')) {
              setError('Failed to connect to server. Please check your connection and try again.');
              setLoading(false);
              return;
            }
            
            throw userError;
          }
        } catch (err: any) {
          const elapsed = Date.now() - startTime;
          console.error('[LOGIN] Supabase signInWithPassword error:', err);
          logger.error(`Supabase signInWithPassword failed after ${elapsed}ms:`, err);
          
          if (err.message?.includes('timed out')) {
            setError('Login request timed out. Please check:\n1. Your internet connection\n2. Supabase service status\n3. Firewall settings');
            setLoading(false);
            return;
          }
          
          throw err;
        }

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
            {isSignup ? 'Create a new account' : 'Sign in to access the admin panel'}
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
                minLength={6}
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
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    disabled={loading}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </>
            )}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (isSignup ? 'Creating account...' : 'Signing in...') 
                : (isSignup ? 'Sign Up' : 'Sign In')
              }
            </Button>
          </form>
          <div className="mt-4 text-sm text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isSignup 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

