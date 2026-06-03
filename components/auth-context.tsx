"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  permissions: Record<string, string[]>;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (moduleCode: string, permissionKey: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("/api/auth/me");
      setUser(res.data.user);
      setPermissions(res.data.permissions || {});
    } catch (error) {
      setUser(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const toastId = toast.loading("Verifying credentials...");
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      setUser(res.data.user);
      setPermissions(res.data.permissions || {});
      toast.success(`Welcome back, ${res.data.user.name}!`, { id: toastId });
      
      // Force page refresh or navigation
      window.location.href = "/dashboard";
    } catch (error: any) {
      const errMsg = error.response?.data?.error || "Login failed";
      toast.error(errMsg, { id: toastId });
      throw error;
    }
  };

  const logout = async () => {
    const toastId = toast.loading("Logging out...");
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      setPermissions({});
      toast.success("Logged out successfully", { id: toastId });
      window.location.href = "/login";
    } catch (error: any) {
      toast.error("Logout failed", { id: toastId });
    }
  };

  const hasPermission = (moduleCode: string, permissionKey: string): boolean => {
    // If the user has a "Super Admin" role (or we can just check if they have full permissions)
    const modulePerms = permissions[moduleCode] || [];
    return modulePerms.includes(permissionKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        login,
        logout,
        hasPermission,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
