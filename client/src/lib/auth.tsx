import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Candidate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

interface AuthContextType {
  candidate: Candidate | null;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<Candidate>;
  login: (email: string, password: string) => Promise<Candidate>;
  logout: () => void;
  refreshCandidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  const register = useCallback(async (email: string, password: string): Promise<Candidate> => {
    const res = await fetch(`${API_BASE}/api/candidates/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }
    setCandidate(data);
    return data;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Candidate> => {
    const res = await fetch(`${API_BASE}/api/candidates/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    setCandidate(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    setCandidate(null);
  }, []);

  const refreshCandidate = useCallback(async () => {
    if (!candidate) return;
    const res = await fetch(`${API_BASE}/api/candidates/${candidate.id}`);
    if (res.ok) {
      const data = await res.json();
      setCandidate(data);
    }
  }, [candidate]);

  return (
    <AuthContext.Provider value={{ candidate, isAuthenticated: !!candidate, register, login, logout, refreshCandidate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
