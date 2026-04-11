"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";

type PageState = "idle" | "processing" | "success" | "error";

const SECTION_LABELS: Record<string, string> = {
  tono_de_voz: "Tono de Voz",
  paleta_colores: "Paleta de Colores",
  tipografia: "Tipografia",
  valores_marca: "Valores de Marca",
  personalidad: "Personalidad",
  publico_objetivo: "Publico Objetivo",
  restricciones: "Restricciones",
  uso_logo: "Uso del Logo",
};

export default function BrandManualPage() {
  const { activeBrand } = useStore();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [error, setError] = useState("");

  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [extraContext, setExtraContext] = useState("");

  const [result, setResult] = useState<{
    chunks_stored: number;
    sections: string[];
    generated_manual?: Record<string, string>;
  } | null>(null);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [existingManual, setExistingManual] = useState<Record<string, string | null> | null>(null);
  const [loadingManual, setLoadingManual] = useState(true);

  useEffect(() => {
    if (!activeBrand) { setLoadingManual(false); return; }
    api.getManual(activeBrand.id)
      .then((data) => setExistingManual(data.structured_json))
      .catch(() => setExistingManual(null))
      .finally(() => setLoadingManual(false));
  }, [activeBrand]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBrand) { setError("Selecciona una marca primero"); return; }

    setPageState("processing");
    setError("");

    try {
      const data = await api.generateManual(activeBrand.id, {
        product,
        tone,
        target_audience: audience,
        extra_context: extraContext || undefined,
      });
      setResult(data);
      setPageState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el manual");
      setPageState("error");
    }
  }

  function ManualSections({ data }: { data: Record<string, string | null> }) {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (!value) return null;
          const isOpen = expandedSection === key;
          return (
            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setExpandedSection(isOpen ? null : key)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">
                  {SECTION_LABELS[key] || key}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100 pt-3">
                  {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Manual de Marca</h1>
          <p className="text-slate-500 mt-1">
            Crea la fuente de verdad de tu marca. Todo el contenido generado se basara en este manual.
          </p>
        </div>

        {loadingManual && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {!loadingManual && existingManual && pageState !== "success" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Manual actual</h2>
              <button
                onClick={() => setExistingManual(null)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Regenerar manual
              </button>
            </div>
            <ManualSections data={existingManual} />
          </div>
        )}

        {!loadingManual && (!existingManual || pageState === "success") && (
          <>
            {pageState !== "success" && (
              <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Producto o servicio</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder='Ej: "Snack saludable de quinua", "App de meditacion"'
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={pageState === "processing"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tono de voz deseado</label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder='Ej: "Divertido pero profesional", "Sofisticado y minimalista"'
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={pageState === "processing"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Publico objetivo</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder='Ej: "Gen Z", "Profesionistas 30-45"'
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={pageState === "processing"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contexto adicional <span className="text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    value={extraContext}
                    onChange={(e) => setExtraContext(e.target.value)}
                    placeholder="Competidores, diferenciadores, mercado..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={pageState === "processing"}
                  />
                </div>
                <button
                  type="submit"
                  disabled={pageState === "processing" || !product || !tone || !audience}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {pageState === "processing" ? "Generando manual..." : "Generar Manual de Marca"}
                </button>
              </form>
            )}

            {pageState === "processing" && (
              <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-blue-700 font-medium">
                  La IA esta creando tu manual de marca completo...
                </p>
                <p className="text-xs text-blue-500 mt-1">Esto puede tardar 15-30 segundos.</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
                {error}
              </div>
            )}

            {pageState === "success" && result && (
              <div className="mt-6 space-y-5">
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <h2 className="font-semibold text-emerald-800 mb-1">
                    Manual generado correctamente
                  </h2>
                  <p className="text-sm text-emerald-700">
                    {result.chunks_stored} fragmentos guardados en la base de datos vectorial.
                  </p>
                </div>

                {result.generated_manual && <ManualSections data={result.generated_manual} />}

                <button
                  onClick={() => { setPageState("idle"); setResult(null); setExistingManual(result.generated_manual || null); }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Ver manual
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
