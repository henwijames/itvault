"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RiLockPasswordLine, RiMailLine, RiShieldKeyholeLine, RiArrowRightLine, RiLoader2Line } from "@remixicon/react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      // Error is handled inside auth context toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Decorative premium ambient glow background elements */}
      <div className="absolute top-0 -left-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[100px]" />

      <div className="relative w-full max-w-md animate-fade-in duration-500 px-4">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm mb-4 backdrop-blur-sm">
            <RiShieldKeyholeLine className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ITVault Security Gateway
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access secure network resources and asset repositories
          </p>
        </div>

        <Card className="border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xl relative overflow-hidden">
          {/* Subtle top border gradient */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <CardHeader className="space-y-1 pb-6 pt-6">
            <CardTitle className="text-xl font-semibold text-slate-900">Log In</CardTitle>
            <CardDescription className="text-slate-500">
              Provide authorization credentials linked to your identity profile.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pb-6">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <RiMailLine className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-9 h-10 border-slate-200 bg-white text-slate-950 placeholder-slate-400 focus-visible:ring-primary/20 focus-visible:border-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <RiLockPasswordLine className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-10 border-slate-200 bg-white text-slate-950 placeholder-slate-400 focus-visible:ring-primary/20 focus-visible:border-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3 py-4">
              <Button
                type="submit"
                className="w-full h-10 font-medium tracking-wide shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RiLoader2Line className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <RiArrowRightLine className="h-4 w-4 text-primary-foreground" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-8 text-center text-xs text-slate-400 font-mono">
          SECURE CONNECTIVITY • VER. 1.2.0 • ISSUED BY ERICKTRCO
        </p>
      </div>
    </div>
  );
}
