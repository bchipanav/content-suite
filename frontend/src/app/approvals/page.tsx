"use client";

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
  content_type: string;
  created_at: string;
}

type StatusFilter = "all" | "pending_review" | "approved" | "rejected";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Todos",
  pending_review: "Pendientes",
  approved: "Aprobados",
  rejected: "Rechazados",
};

export default function ApprovalsPage() {
  const { user, activeBrand } = useStore();

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, [filter, activeBrand]);

  async function loadDrafts() {
    setLoading(true);
    try {
      const filters: { status?: string; brand_id?: string } = {};
      if (filter !== "all") filters.status = filter;
      if (activeBrand) filters.brand_id = activeBrand.id;
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
      await api.reviewDraft(draftId, action);
      setExpandedId(null);
      await loadDrafts();
    } catch {
      alert("Error al enviar la revision");
    }
    setReviewing(false);
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Aprobaciones</h1>
          <p className="text-slate-500 mt-1">
            Revisa el contenido generado y decide si cumple con la marca.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === status
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {FILTER_LABELS[status]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
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
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                    className="w-full p-5 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {draft.prompt}
                        </p>
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-xs text-slate-400">{draft.content_type}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(draft.created_at).toLocaleDateString("es")}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={draft.status} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                          Contenido generado
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {draft.result}
                        </p>
                      </div>

                      {canReview && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(draft.id, "approved")}
                            disabled={reviewing}
                            className="px-5 py-2.5 rounded-xl text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReview(draft.id, "rejected")}
                            disabled={reviewing}
                            className="px-5 py-2.5 rounded-xl text-sm text-white font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-all"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}

                      {!canReview && (
                        <p className="text-xs text-slate-400">
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
