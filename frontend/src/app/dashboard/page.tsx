"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import type { DraftStatus, Brand } from "@/types";

export default function DashboardPage() {
  const { user, activeBrand, setActiveBrand } = useStore();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [drafts, setDrafts] = useState<
    { id: string; prompt: string; status: DraftStatus; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDesc, setNewBrandDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (activeBrand) {
      api.listDrafts({ brand_id: activeBrand.id }).then(setDrafts as any).catch(() => {});
    }
  }, [activeBrand]);

  async function loadBrands() {
    setLoading(true);
    try {
      const data = await api.listBrands();
      setBrands(data as Brand[]);
      if (data.length === 1 && !activeBrand) {
        setActiveBrand(data[0] as Brand);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    setCreating(true);
    try {
      const brand = await api.createBrand(newBrandName, newBrandDesc || undefined);
      setActiveBrand(brand as Brand);
      setBrands((prev) => [...prev, brand as Brand]);
      setShowNewBrand(false);
      setNewBrandName("");
      setNewBrandDesc("");
    } catch {
      alert("Error al crear la marca");
    }
    setCreating(false);
  }

  const pending = drafts.filter((d) => d.status === "pending_review").length;
  const rejected = drafts.filter((d) => d.status === "rejected").length;
  const approved = drafts.filter((d) => d.status === "approved").length;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Hola, {user?.full_name || "usuario"}
          </h1>
          <p className="text-slate-500 mt-1">
            Esto es lo que esta pasando con tu contenido.
          </p>
        </div>

        {/* Selector de marca */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Marca activa</h2>
            <button
              onClick={() => setShowNewBrand(!showNewBrand)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showNewBrand ? "Cancelar" : "+ Nueva marca"}
            </button>
          </div>

          {brands.length > 0 && !showNewBrand && (
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setActiveBrand(brand)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeBrand?.id === brand.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          )}

          {brands.length === 0 && !showNewBrand && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400 mb-4">
                No hay marcas creadas. Crea tu primera marca para empezar.
              </p>
              <button
                onClick={() => setShowNewBrand(true)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
              >
                Crear primera marca
              </button>
            </div>
          )}

          {showNewBrand && (
            <form onSubmit={handleCreateBrand} className="space-y-3">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nombre de la marca"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                value={newBrandDesc}
                onChange={(e) => setNewBrandDesc(e.target.value)}
                placeholder="Descripcion (opcional)"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={creating || !newBrandName.trim()}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creando..." : "Crear Marca"}
              </button>
            </form>
          )}
        </div>

        {activeBrand && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-3xl font-bold text-amber-600">{pending}</p>
                <p className="text-sm text-slate-500 mt-1">Pendientes</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-3xl font-bold text-red-600">{rejected}</p>
                <p className="text-sm text-slate-500 mt-1">Rechazados</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-3xl font-bold text-emerald-600">{approved}</p>
                <p className="text-sm text-slate-500 mt-1">Aprobados</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="flex gap-3 mb-8 flex-wrap">
              <Link
                href="/brand-manual"
                className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
              >
                Manual de Marca
              </Link>

              {user?.role === "creator" && (
                <Link
                  href="/generate"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-all shadow-sm"
                >
                  + Generar Contenido
                </Link>
              )}

              {(user?.role === "approver_a" || user?.role === "approver_b") && (
                <Link
                  href="/approvals"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-all shadow-sm"
                >
                  Ver Aprobaciones
                </Link>
              )}

              {user?.role === "approver_b" && (
                <Link
                  href="/image-audit"
                  className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
                >
                  Auditoria de Imagen
                </Link>
              )}
            </div>

            {/* Recent activity */}
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Actividad reciente</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {drafts.slice(0, 5).map((draft, i) => (
                <div
                  key={draft.id}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    i > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <p className="text-sm text-slate-700 truncate flex-1">{draft.prompt}</p>
                  <StatusBadge status={draft.status} />
                </div>
              ))}
              {drafts.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-sm">
                  No hay contenido aun. Empieza creando el manual de marca.
                </div>
              )}
            </div>
          </>
        )}

        {!activeBrand && brands.length > 0 && (
          <div className="text-center py-16 text-slate-400">
            Selecciona una marca arriba para ver el dashboard.
          </div>
        )}
      </div>
    </AppShell>
  );
}
