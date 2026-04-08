"use client";

// ============================================
// Dashboard — Página principal después del login
// ============================================
// 1. Si no hay marcas → muestra formulario para crear una
// 2. Si hay marcas pero ninguna seleccionada → muestra selector
// 3. Si hay marca seleccionada → muestra resumen + accesos rápidos

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

  // Formulario de nueva marca
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDesc, setNewBrandDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Cargar marcas al entrar
  useEffect(() => {
    loadBrands();
  }, []);

  // Cargar drafts cuando hay marca activa
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
      // Si solo hay una marca, seleccionarla automáticamente
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

  // Contadores
  const pending = drafts.filter((d) => d.status === "pending_review").length;
  const awaitingFinal = drafts.filter((d) => d.status === "approved_a").length;
  const approved = drafts.filter((d) => d.status === "approved").length;

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          Hola, {user?.full_name || "usuario"}
        </h1>
        <p className="text-gray-500 mb-6">
          Esto es lo que está pasando con tu contenido.
        </p>

        {/* ===== Selector de marca ===== */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Marca activa</h2>
            <button
              onClick={() => setShowNewBrand(!showNewBrand)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showNewBrand ? "Cancelar" : "+ Nueva marca"}
            </button>
          </div>

          {/* Lista de marcas existentes */}
          {brands.length > 0 && !showNewBrand && (
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setActiveBrand(brand)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeBrand?.id === brand.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          )}

          {/* Sin marcas */}
          {brands.length === 0 && !showNewBrand && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">
                No hay marcas creadas. Crea tu primera marca para empezar.
              </p>
              <button
                onClick={() => setShowNewBrand(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Crear primera marca
              </button>
            </div>
          )}

          {/* Formulario de nueva marca */}
          {showNewBrand && (
            <form onSubmit={handleCreateBrand} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre de la marca
                </label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder='Ej: "Quinua Snacks", "Café Bonito", "TechFlow"'
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Descripción <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  placeholder="Breve descripción del producto o servicio"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newBrandName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {creating ? "Creando..." : "Crear Marca"}
              </button>
            </form>
          )}
        </div>

        {/* ===== Contenido del dashboard (solo si hay marca activa) ===== */}
        {activeBrand && (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-yellow-700">{pending}</p>
                <p className="text-sm text-yellow-600">Pendientes</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-blue-700">{awaitingFinal}</p>
                <p className="text-sm text-blue-600">Esperando aprobación final</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-700">{approved}</p>
                <p className="text-sm text-green-600">Aprobados</p>
              </div>
            </div>

            {/* Accesos rápidos según rol */}
            <div className="flex gap-3 mb-8 flex-wrap">
              <Link
                href="/brand-manual"
                className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Manual de Marca
              </Link>

              {user?.role === "creator" && (
                <Link
                  href="/generate"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + Generar Contenido
                </Link>
              )}

              {(user?.role === "approver_a" || user?.role === "approver_b") && (
                <>
                  <Link
                    href="/approvals"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Ver Aprobaciones
                  </Link>
                  <Link
                    href="/image-audit"
                    className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Auditoría de Imagen
                  </Link>
                </>
              )}
            </div>

            {/* Actividad reciente */}
            <h2 className="text-lg font-semibold mb-3">Actividad reciente</h2>
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {drafts.slice(0, 5).map((draft) => (
                <div key={draft.id} className="p-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-gray-700 truncate flex-1">{draft.prompt}</p>
                  <StatusBadge status={draft.status} />
                </div>
              ))}
              {drafts.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No hay contenido aún. Empieza creando el manual de marca.
                </div>
              )}
            </div>
          </>
        )}

        {/* Sin marca seleccionada */}
        {!activeBrand && brands.length > 0 && (
          <div className="text-center py-12 text-gray-400">
            Selecciona una marca arriba para ver el dashboard.
          </div>
        )}
      </div>
    </AppShell>
  );
}
