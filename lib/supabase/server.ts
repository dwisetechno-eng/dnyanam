import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  hasServiceRole,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";

/**
 * Request-scoped Supabase client that respects RLS and reads/writes the
 * auth cookies managed by @supabase/ssr.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render — middleware takes care of
          // refreshing the session in that case.
        }
      },
    },
  });
}

/**
 * Service-role client. Never import this into a client component and never
 * return its results directly without server-side authorisation checks.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!hasServiceRole) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getCurrentProfile() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { supabase, user, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}
