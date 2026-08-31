"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserPersona } from "./types";
import { loginUser, getPersonas } from "./api";

interface AuthContextType {
  user: UserPersona | null;
  role: string;
  token: string | null;
  personas: UserPersona[];
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
  switchPersona: (roleOrId: string) => Promise<void>;
}

const DEFAULT_PERSONA: UserPersona = {
  user_id: "AUTH-MOSPI-01",
  name: "Shri Anil Gupta",
  role: "MINISTRY",
  designation: "Joint Secretary & Central Nodal Officer",
  jurisdiction: "MoSPI Headquarters, New Delhi",
  email: "monitoring.mplads@mospi.gov.in",
  avatar_emoji: "🏛️",
  default_route: "/national-dashboard",
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_PERSONA,
  role: "MINISTRY",
  token: null,
  personas: [],
  loading: true,
  login: async () => {},
  logout: () => {},
  switchPersona: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPersona | null>(DEFAULT_PERSONA);
  const [token, setToken] = useState<string | null>(null);
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load available personas
    getPersonas()
      .then((pList) => {
        setPersonas(pList);
        // Check localStorage for saved persona
        const savedUser = localStorage.getItem("mplads_demo_user");
        const savedToken = localStorage.getItem("mplads_demo_token");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
          } catch {
            setUser(pList[0] || DEFAULT_PERSONA);
          }
        } else if (pList.length > 0) {
          setUser(pList[0]);
        }
      })
      .catch(() => {
        setUser(DEFAULT_PERSONA);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(username: string) {
    try {
      const res = await loginUser(username);
      setUser(res.user);
      setToken(res.access_token);
      localStorage.setItem("mplads_demo_user", JSON.stringify(res.user));
      localStorage.setItem("mplads_demo_token", res.access_token);
    } catch {
      // Fallback matching
      const found = personas.find(
        (p) => p.user_id.toLowerCase() === username.toLowerCase() || p.role.toLowerCase() === username.toLowerCase()
      );
      if (found) {
        setUser(found);
        localStorage.setItem("mplads_demo_user", JSON.stringify(found));
      }
    }
  }

  function logout() {
    setUser(DEFAULT_PERSONA);
    setToken(null);
    localStorage.removeItem("mplads_demo_user");
    localStorage.removeItem("mplads_demo_token");
  }

  async function switchPersona(roleOrId: string) {
    await login(roleOrId);
  }

  const role = user?.role || "MINISTRY";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        personas,
        loading,
        login,
        logout,
        switchPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
