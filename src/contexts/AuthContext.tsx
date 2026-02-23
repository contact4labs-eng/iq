import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

interface Company {
  id: string;
  name: string;
  industry: string;
  currency: string;
  settings: Record<string, unknown>;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  company: Company | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  company: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Track which user ID we've already fetched company for to prevent duplicates
  const fetchedCompanyForRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchCompany = useCallback(async (userId: string, userMeta?: Record<string, unknown>) => {
    // Skip if we already fetched for this user
    if (fetchedCompanyForRef.current === userId) return;
    fetchedCompanyForRef.current = userId;

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (!isMountedRef.current) return;

      if (error) {
        console.error("Failed to fetch company:", error.message);
        return;
      }

      if (data) {
        setCompany(data as Company);
        return;
      }

      // Auto-repair: if no company exists but user metadata has company info,
      // create the company row. This handles cases where registration's
      // company insert failed silently.
      const companyName = userMeta?.company_name as string | undefined;
      const afm = userMeta?.afm as string | undefined;
      if (companyName && afm) {
        console.info("No company found — auto-creating from user metadata");
        const { data: created, error: createErr } = await supabase
          .from("companies")
          .insert({ owner_user_id: userId, name: companyName, afm })
          .select("*")
          .maybeSingle();

        if (!isMountedRef.current) return;

        if (createErr) {
          console.error("Auto-create company failed:", createErr.message);
        } else if (created) {
          setCompany(created as Company);
        }
      } else {
        console.warn("No company found for user and no metadata to auto-create.");
      }
    } catch (err) {
      console.error("Company fetch error:", err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Only use onAuthStateChange as the single source of truth.
    // getSession() can cause duplicate calls; onAuthStateChange fires
    // with INITIAL_SESSION on setup which covers the initial load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMountedRef.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout(0) to avoid Supabase deadlock on auth state change
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchCompany(
                newSession.user.id,
                newSession.user.user_metadata as Record<string, unknown> | undefined
              );
            }
          }, 0);
        } else {
          // Logged out â clear everything
          setCompany(null);
          fetchedCompanyForRef.current = null;
        }

        setLoading(false);
      }
    );

    // Safety timeout â if onAuthStateChange never fires (e.g. offline)
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.warn("Auth initialization timed out after 5s");
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Supabase signOut error:", error.message);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
    // Always clear local state regardless of API result
    setUser(null);
    setSession(null);
    setCompany(null);
    fetchedCompanyForRef.current = null;
    try {
      queryClient.clear();
    } catch (err) {
      console.error("QueryClient clear error:", err);
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, session, company, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
