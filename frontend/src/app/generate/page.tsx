"use client";

// ============================================
// PANTALLA 2: Generar Contenido (RAG)
// ============================================
// El creador describe qué contenido necesita.
// El backend busca en el manual (RAG) y genera con Groq.
//
// Estados:
//   idle        → formulario listo
//   generating  → la IA está trabajando
//   success     → muestra el contenido generado + contexto usado
//   error       → algo falló

import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";

type PageState = "idle" | "generating" | "success" | "error";

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "blog", label: "Blog" },
  { value: "email", label: "Email Marketing" },
];

const FORMATS = [
  { value: "post", label: "Post" },
  { value: "story", label: "Story / Reel" },
  { value: "article", label: "Artículo" },
  { value: "caption", label: "Caption" },
  { value: "newsletter", label: "Newsletter" },
  { value: "video_script", label: "Guión de Video" },
  { value: "image_prompt", label: "Prompt de Imagen (IA)" },
  { value: "product_description", label: "Descripción de Producto" },
];

export default function GeneratePage() {
  const { activeBrand } = useStore();

  // --- Estados del formulario ---
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [format, setFormat] = useState("post");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [generatedContent, setGeneratedContent] = useState<{
    id: string;
    result: string;
    context_used: string[];
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
        platform,
        format,
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Generar Contenido</h1>
        <p className="text-gray-500 mb-8">
          Describe qué contenido necesitas. La IA consultará el manual de tu marca
          para generar algo alineado con tu identidad.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda: Formulario */}
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Qué contenido necesitas?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ejemplo: Un post anunciando nuestra nueva sucursal en la Roma, CDMX. Queremos transmitir emoción y cercanía."
                rows={5}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={pageState === "generating"}
              />
            </div>

            {/* Plataforma y formato en una fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plataforma
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={pageState === "generating" || !prompt.trim()}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {pageState === "generating" ? "Generando..." : "Generar Contenido"}
            </button>
          </form>

          {/* Columna derecha: Resultado */}
          <div>
            {pageState === "generating" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-blue-700">Consultando manual de marca y generando...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {pageState === "success" && generatedContent && (
              <div className="space-y-4">
                {/* Contenido generado */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-sm text-gray-500">Contenido Generado</h3>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      Pendiente de revisión
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {generatedContent.result}
                  </div>
                </div>

                {/* Contexto usado (transparencia del RAG) */}
                <details className="bg-gray-50 border border-gray-200 rounded-lg">
                  <summary className="p-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100">
                    Ver contexto del manual usado ({generatedContent.context_used.length} fragmentos)
                  </summary>
                  <div className="px-3 pb-3 space-y-2">
                    {generatedContent.context_used.map((chunk, i) => (
                      <div key={i} className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-600">
                        {chunk}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
