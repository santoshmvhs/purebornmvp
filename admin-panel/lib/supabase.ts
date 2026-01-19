import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
// This prevents errors during build time when environment variables aren't available
let supabaseClient: SupabaseClient | null = null;
let lastUrl: string | null = null;
let lastKey: string | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  // Get Supabase URL and anon key from environment variables
  // In Next.js, NEXT_PUBLIC_* vars are available at runtime via process.env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Debug logging in development
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.log('[Supabase] Configuration check:', {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET',
      urlLength: supabaseUrl.length,
      keySet: !!supabaseAnonKey,
      keyLength: supabaseAnonKey.length,
    });
  }

  // If we have a client and the credentials haven't changed, return it
  if (supabaseClient && lastUrl === supabaseUrl && lastKey === supabaseAnonKey) {
    return supabaseClient;
  }

  // During build time or if env vars aren't set, return null instead of throwing
  // This allows the app to load and show a helpful error message
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side/build time: return null to allow build to complete
      return null;
    } else {
      // Client-side runtime: return null, let components handle the error gracefully
      console.error('[Supabase] Configuration is missing!', {
        url: supabaseUrl || 'NOT SET',
        key: supabaseAnonKey ? 'SET (hidden)' : 'NOT SET',
        allEnvVars: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
      });
      console.warn('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.');
      return null;
    }
  }

  // Create a custom fetch function with better error handling
  // This matches the Fetch API signature: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  const customFetch = typeof window !== 'undefined' 
    ? async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        try {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          
          const response = await fetch(input, {
            ...init,
            // Only include credentials if explicitly set, otherwise use 'same-origin'
            credentials: init?.credentials || 'same-origin',
            // Add headers that might help with CORS
            headers: {
              ...init?.headers,
              // Only set Content-Type if not already set and if there's a body
              ...(init?.body && !init?.headers?.['Content-Type'] 
                ? { 'Content-Type': 'application/json' } 
                : {}),
            },
          });
          
          // Log fetch errors for debugging
          if (!response.ok) {
            console.error('[Supabase] Fetch error:', {
              url,
              status: response.status,
              statusText: response.statusText,
              origin: window.location.origin,
            });
          }
          
          return response;
        } catch (error: any) {
          // Enhanced error logging
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'unknown';
          
          console.error('[Supabase] Network error:', {
            url,
            error: error.message,
            origin: window.location.origin,
            supabaseUrl,
            isCorsError: error.message?.includes('CORS') || error.message?.includes('Failed to fetch'),
          });
          
          // Provide helpful error message for network/CORS issues
          if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
            console.error(
              '[Supabase] Network/CORS Error Detected!\n' +
              `Current origin: ${window.location.origin}\n` +
              `Supabase URL: ${supabaseUrl}\n\n` +
              'Possible solutions:\n' +
              '1. Check if your Supabase project is active (not paused)\n' +
              '2. Verify the Supabase URL is correct\n' +
              '3. Check browser console for CORS errors\n' +
              '4. If using a custom domain, ensure it\'s properly configured\n' +
              '5. Try accessing Supabase directly: ' + supabaseUrl + '\n' +
              '6. Check network tab for detailed error information'
            );
          }
          throw error;
        }
      }
    : undefined;

  // Create Supabase client with actual credentials
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Add flow type to help with token refresh
      flowType: 'pkce',
    },
    global: {
      // Use custom fetch if available
      fetch: customFetch,
      // Add headers that might help
      headers: {
        'X-Client-Info': 'pureborn-admin-panel',
      },
    },
  });
  
  // Log successful client creation
  if (typeof window !== 'undefined') {
    console.log('[Supabase] Client created successfully', { 
      url: supabaseUrl,
      origin: window.location.origin,
    });
  }

  lastUrl = supabaseUrl;
  lastKey = supabaseAnonKey;

  return supabaseClient;
};

// Export a default instance for convenience
// This will be initialized on first use
// Returns null if Supabase is not configured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      // Return a mock object that throws helpful errors when methods are called
      if (prop === 'auth') {
        return {
          getSession: () => Promise.reject(new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.')),
          signInWithPassword: () => Promise.reject(new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.')),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.');
    }
    return client[prop as keyof SupabaseClient];
  },
});

