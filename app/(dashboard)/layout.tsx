"use client";

import React from "react";
import { useAuth } from "@/components/auth-context";
import { RiSettingsLine } from "@remixicon/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-3">
          <RiSettingsLine className="size-10 animate-spin text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">
            IT VAULT
          </span>
        </div>
      </div>
    );
  }

  // If loading is done but there's no user, the middleware will redirect to /login
  // We can render a fallback or null while the redirect happens
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
