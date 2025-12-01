import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
// This prevents errors during build time when environment variables aren't available
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  // Get Supabase URL and anon key from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // During build time, environment variables might not be available
  // Use placeholder values that will be replaced at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side/build time: use placeholder
      supabaseClient = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );
      return supabaseClient;
    } else {
      // Client-side runtime: warn and use placeholder
      console.warn('Supabase URL or Anon Key not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      supabaseClient = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );
      return supabaseClient;
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

  return supabaseClient;
};

// Export a default instance for convenience
// This will be initialized on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

