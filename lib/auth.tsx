"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase/client";

export type Profile = { id: string; name: string };

type Auth = {
  // False while Supabase isn't configured: the app is local-only.
  enabled: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  saveName: (name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      return;
    }
    let live = true;
    supabase
      .from("profiles")
      .select("id, name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (live) setProfile(data ?? null);
      });
    return () => {
      live = false;
    };
  }, [supabase, user]);

  const saveName = useCallback(
    async (name: string) => {
      if (!supabase || !user) return "Not signed in.";
      const { data, error } = await supabase.from("profiles").upsert({ id: user.id, name: name.trim() }).select("id, name").single();
      if (error) return error.message;
      setProfile(data);
      return null;
    },
    [supabase, user],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return <AuthContext.Provider value={{ enabled: Boolean(supabase), loading, user, profile, saveName, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
