"use client";

import { useStore } from "@/lib/store";
import Sidebar from "./Sidebar";
import AuthGuard from "./AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeBrand, user } = useStore();

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {activeBrand ? (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {activeBrand.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{activeBrand.name}</p>
                    <p className="text-[11px] text-slate-400">Marca activa</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Selecciona una marca en el Dashboard</p>
              )}
            </div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </header>

          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
