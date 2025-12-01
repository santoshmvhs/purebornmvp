import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
// This prevents errors during build time when environment variables aren't available
let supabaseClient: SupabaseClient | null = null;
let lastUrl: string | null = null;
let lastKey: string | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  // Get Supabase URL and anon key from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // If we have a client and the credentials haven't changed, return it
  if (supabaseClient && lastUrl === supabaseUrl && lastKey === supabaseAnonKey) {
    return supabaseClient;
  }

  // During build time, environment variables might not be available
  // In that case, we'll throw a more helpful error at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side/build time: throw error to prevent silent failures
      throw new Error(
        'Supabase environment variables are not set. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'
      );
    } else {
      // Client-side runtime: throw error with helpful message
      throw new Error(
        'Supabase configuration is missing. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages environment variables.'
      );
    }
  }

  // Create Supabase client with actual credentials
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });

  lastUrl = supabaseUrl;
  lastKey = supabaseAnonKey;

  return supabaseClient;
};

// Export a default instance for convenience
// This will be initialized on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

