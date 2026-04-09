"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { User } from "@/types";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (user) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    api.getMe()
      .then((data) => {
        setUser(data as User);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        router.push("/login");
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
