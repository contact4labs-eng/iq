import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface Company {
  id: string;
  name: string;
  industry: string;
  currency: string;
  settings: any;
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

  const fetchCompany = async (userId: string) => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!error && data) {
      setCompany(data as Company);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) fetchCompany(session.user.id);
          }, 0);
        } else {
          setCompany(null);
        }
        setLoading(false);
      }
    );

    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.error("Auth initialization timed out after 5s");
        setLoading(false);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchCompany(session.user.id);
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, company, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
