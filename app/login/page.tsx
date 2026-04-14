"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Falsches Passwort. Bitte versuche es erneut.");
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-8 bg-background p-4">
      {/* Branding */}
      <div className="text-center space-y-2">
        <p className="font-serif text-4xl text-foreground leading-none">
          lernen<span className="italic text-primary">.diy</span>
        </p>
        <p className="text-lg text-muted-foreground tracking-wide">
          Media Studio
        </p>
        <div className="h-px w-16 bg-primary/40 mx-auto mt-4" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-sm bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Workshop-Zugang</CardTitle>
          <CardDescription>Bitte Passwort eingeben</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Einloggen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
