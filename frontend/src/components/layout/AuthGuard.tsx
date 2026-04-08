"use client";

// ============================================
// AuthGuard — Recupera el usuario al cargar la app
// ============================================
// Si hay token en localStorage pero no hay user en el store
// (porque se recargó la página), lo recupera llamando a /me.
// Si no hay token, redirige al login.

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

    // Hay token pero no user → recuperar perfil
    api.getMe()
      .then((data) => {
        setUser(data as User);
        setLoading(false);
      })
      .catch(() => {
        // Token expirado
        localStorage.removeItem("access_token");
        router.push("/login");
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  return <>{children}</>;
}
