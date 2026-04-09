"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";

type PageState = "idle" | "generating" | "success" | "error";

const CONTENT_TYPES = [
  { value: "product_description", label: "Descripcion de Producto" },
  { value: "video_script", label: "Guion de Video" },
  { value: "image_prompt", label: "Prompt de Imagen (IA)" },
];

export default function GeneratePage() {
  const { activeBrand } = useStore();

  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("product_description");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [generatedContent, setGeneratedContent] = useState<{
    id: string;
    result: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBrand) {
      setError("Selecciona una marca primero");
      return;
    }

    setPageState("generating");
    setError("");

    try {
      const data = await api.generateContent({
        brand_id: activeBrand.id,
        prompt,
        content_type: contentType,
      });
      setGeneratedContent(data);
      setPageState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar contenido");
      setPageState("error");
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Generar Contenido</h1>
          <p className="text-slate-500 mt-1">
            Describe que contenido necesitas. La IA consultara el manual de tu marca.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Que contenido necesitas?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: Un post anunciando nuestra nueva sucursal en la Roma, CDMX..."
                rows={5}
                className="w-full border border-slate-200 rounded-xl p-4 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={pageState === "generating"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de contenido
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={pageState === "generating" || !prompt.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {pageState === "generating" ? "Generando..." : "Generar Contenido"}
            </button>
          </form>

          <div>
            {pageState === "generating" && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-blue-700 font-medium">Consultando manual de marca y generando...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
                {error}
              </div>
            )}

            {pageState === "success" && generatedContent && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">Contenido Generado</h3>
                  <span className="text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 px-2.5 py-0.5 rounded-full">
                    Pendiente de revision
                  </span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {generatedContent.result}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
