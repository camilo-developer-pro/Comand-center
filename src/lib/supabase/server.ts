import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/db/types';

// Legacy export for backward compatibility
export const createClient = createServerSupabaseClient;

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

export async function createServiceRoleClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Creates a Supabase client with workspace context for easier block queries
 * @param workspaceId The workspace ID to scope queries to
 * @returns An object with the Supabase client and workspace-scoped helper methods
 */
export async function createServerSupabaseClientWithWorkspace(workspaceId: string) {
  const client = await createServerSupabaseClient();
  
  return {
    client,
    workspaceId,
    async getBlocks(parentId: string | null) {
      const query = client
        .from('blocks_v3')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true });
      
      // Handle parent_id filter correctly for both null and string values
      if (parentId === null) {
        return query.is('parent_id', null);
      } else {
        return query.eq('parent_id', parentId);
      }
    },
  };
}
