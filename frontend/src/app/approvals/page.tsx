"use client";

// ============================================
// PANTALLA 3: Lista de Aprobaciones
// ============================================
// Flujo simple: Pendiente → Aprobado / Rechazado

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";

interface DraftItem {
  id: string;
  prompt: string;
  result: string;
  status: string;
  platform: string;
  created_at: string;
}

type StatusFilter = "all" | "pending_review" | "approved" | "rejected";

export default function ApprovalsPage() {
  const { user } = useStore();

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, [filter]);

  async function loadDrafts() {
    setLoading(true);
    try {
      const filters = filter === "all" ? {} : { status: filter };
      const data = await api.listDrafts(filters);
      setDrafts(data as DraftItem[]);
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  async function handleReview(draftId: string, action: "approved" | "rejected") {
    setReviewing(true);
    try {
      await api.reviewDraft(draftId, action, reviewComment || undefined);
      setReviewComment("");
      setExpandedId(null);
      await loadDrafts();
    } catch {
      alert("Error al enviar la revisión");
    }
    setReviewing(false);
  }

  const filterLabels: Record<StatusFilter, string> = {
    all: "Todos",
    pending_review: "Pendientes",
    approved: "Aprobados",
    rejected: "Rechazados",
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Aprobaciones</h1>
        <p className="text-gray-500 mb-6">
          Revisa el contenido generado y decide si cumple con la marca.
        </p>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(Object.keys(filterLabels) as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === status
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filterLabels[status]}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No hay borradores {filter !== "all" ? "con este estado" : ""}
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => {
              const isExpanded = expandedId === draft.id;
              const canReview = draft.status === "pending_review";

              return (
                <div
                  key={draft.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {draft.prompt}
                        </p>
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-xs text-gray-400">{draft.platform}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(draft.created_at).toLocaleDateString("es")}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={draft.status} />
                    </div>
                  </button>

                  {/* Contenido expandido */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* Texto generado */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Contenido generado:
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {draft.result}
                        </p>
                      </div>

                      {/* Acciones — solo si está pendiente */}
                      {canReview && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(draft.id, "approved")}
                              disabled={reviewing}
                              className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleReview(draft.id, "rejected")}
                              disabled={reviewing}
                              className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      )}

                      {!canReview && (
                        <p className="text-xs text-gray-400 italic">
                          {draft.status === "approved"
                            ? "Este contenido fue aprobado."
                            : "Este contenido fue rechazado."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
