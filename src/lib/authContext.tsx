"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, authAvailable } from "@/lib/supabaseClient";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  authAvailable: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  authAvailable: false,
  signIn: async () => ({ error: "Auth not configured" }),
  signUp: async () => ({ error: "Auth not configured", needsEmailConfirm: false }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const client = getSupabaseBrowserClient();
    if (!client) return { error: "Auth not configured" };
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string) {
    const client = getSupabaseBrowserClient();
    if (!client) return { error: "Auth not configured", needsEmailConfirm: false };
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error: error.message, needsEmailConfirm: false };
    // If Supabase has email confirmation enabled, a signUp succeeds but returns no session yet.
    const needsEmailConfirm = !data.session;
    return { error: null, needsEmailConfirm };
  }

  async function signOut() {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, authAvailable: authAvailable(), signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
