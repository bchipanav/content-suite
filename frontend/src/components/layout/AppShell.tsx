"use client";

// ============================================
// AppShell — Layout principal (AuthGuard + Sidebar + Header + Contenido)
// ============================================

import { useStore } from "@/lib/store";
import Sidebar from "./Sidebar";
import AuthGuard from "./AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeBrand, user } = useStore();

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          {/* Header con marca activa */}
          <header className="bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {activeBrand ? (
                <>
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {activeBrand.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{activeBrand.name}</p>
                    <p className="text-xs text-gray-400">Marca activa</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Sin marca seleccionada — selecciona una en el Dashboard</p>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {user?.email}
            </div>
          </header>

          {/* Contenido */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
