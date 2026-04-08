"use client";

// ============================================
// PANTALLA 1: Crear Manual de Marca
// ============================================
// DOS modos:
//   A) "Generar" → el usuario da parámetros cortos, la IA genera el manual completo
//   B) "Subir"   → el usuario pega texto de un manual existente
//
// El modo A es lo que pide el reto textualmente.

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";

type Mode = "generate" | "upload";
type PageState = "idle" | "processing" | "success" | "error";

const SECTION_LABELS: Record<string, string> = {
  tono_de_voz: "Tono de Voz",
  paleta_colores: "Paleta de Colores",
  tipografia: "Tipografía",
  valores_marca: "Valores de Marca",
  personalidad: "Personalidad",
  publico_objetivo: "Público Objetivo",
  restricciones: "Restricciones",
  uso_logo: "Uso del Logo",
};

export default function BrandManualPage() {
  const { activeBrand } = useStore();

  const [mode, setMode] = useState<Mode>("generate");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [error, setError] = useState("");

  // Modo A: Generar desde parámetros
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [extraContext, setExtraContext] = useState("");

  // Modo B: Subir texto
  const [rawText, setRawText] = useState("");

  // Resultado
  const [result, setResult] = useState<{
    chunks_stored: number;
    sections: string[];
    generated_manual?: Record<string, string>;
  } | null>(null);

  // Sección del manual expandida para ver detalle
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Manual existente
  const [existingManual, setExistingManual] = useState<Record<string, string | null> | null>(null);
  const [loadingManual, setLoadingManual] = useState(true);

  // Cargar manual existente al entrar
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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBrand) { setError("Selecciona una marca primero"); return; }
    if (rawText.trim().length < 50) { setError("El manual debe tener al menos 50 caracteres"); return; }

    setPageState("processing");
    setError("");

    try {
      const data = await api.uploadManual(activeBrand.id, rawText);
      setResult(data);
      setPageState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el manual");
      setPageState("error");
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Manual de Marca</h1>
        <p className="text-gray-500 mb-6">
          Crea la fuente de verdad de tu marca. Todo el contenido generado
          después se basará en este manual.
        </p>

        {/* ===== Manual existente ===== */}
        {loadingManual && (
          <div className="text-center py-8 text-gray-400">Cargando manual...</div>
        )}

        {!loadingManual && existingManual && pageState !== "success" && (
          <div className="mb-8 bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Manual actual</h2>
              <button
                onClick={() => setExistingManual(null)}
                className="text-xs text-blue-600 hover:underline"
              >
                Regenerar manual
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(existingManual).map(([key, value]) => {
                if (!value) return null;
                return (
                  <div key={key} className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                      className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">
                        {SECTION_LABELS[key] || key}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {expandedSection === key ? "cerrar" : "ver"}
                      </span>
                    </button>
                    {expandedSection === key && (
                      <div className="px-3 pb-3 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-2">
                        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulario (solo si no hay manual o se quiere regenerar) */}
        {!loadingManual && (!existingManual || pageState === "success") && (
        <>
        {/* Selector de modo */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("generate")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "generate"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Generar con IA
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Subir texto existente
          </button>
        </div>

        {/* ========== MODO A: Generar desde parámetros ========== */}
        {mode === "generate" && pageState !== "success" && (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto o servicio
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder='Ej: "Snack saludable de quinua", "App de meditación", "Café artesanal"'
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={pageState === "processing"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tono de voz deseado
              </label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder='Ej: "Divertido pero profesional", "Cercano y cálido", "Sofisticado y minimalista"'
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={pageState === "processing"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Público objetivo
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder='Ej: "Gen Z", "Profesionistas 30-45", "Madres millennials"'
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={pageState === "processing"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contexto adicional <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Cualquier detalle extra: competidores, diferenciadores, mercado..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={pageState === "processing"}
              />
            </div>

            <button
              type="submit"
              disabled={pageState === "processing" || !product || !tone || !audience}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {pageState === "processing" ? "Generando manual..." : "Generar Manual de Marca"}
            </button>
          </form>
        )}

        {/* ========== MODO B: Subir texto ========== */}
        {mode === "upload" && pageState !== "success" && (
          <form onSubmit={handleUpload} className="space-y-4">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Pega aquí el contenido de tu manual de marca...\n\nEjemplo:\nTono de voz: Cercano y cálido...\nColores: #8B4513 marrón...\nValores: Innovación, comunidad..."}
              rows={14}
              className="w-full border border-gray-300 rounded-lg p-4 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={pageState === "processing"}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">{rawText.length} caracteres</span>
              <button
                type="submit"
                disabled={pageState === "processing" || rawText.trim().length < 50}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {pageState === "processing" ? "Procesando..." : "Procesar Manual"}
              </button>
            </div>
          </form>
        )}

        {/* ========== Spinner ========== */}
        {pageState === "processing" && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-blue-700">
              {mode === "generate"
                ? "La IA está creando tu manual de marca completo..."
                : "Analizando y estructurando tu manual..."}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Esto puede tardar 15-30 segundos.
            </p>
          </div>
        )}

        {/* ========== Error ========== */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ========== Resultado ========== */}
        {pageState === "success" && result && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="font-semibold text-green-800 mb-1">
                Manual {mode === "generate" ? "generado" : "procesado"} correctamente
              </h2>
              <p className="text-sm text-green-700">
                {result.chunks_stored} fragmentos guardados en la base de datos vectorial.
              </p>
            </div>

            {/* Secciones del manual generado */}
            {result.generated_manual && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Manual generado:</h3>
                {Object.entries(result.generated_manual).map(([key, value]) => (
                  <div key={key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                      className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">
                        {SECTION_LABELS[key] || key}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {expandedSection === key ? "cerrar" : "ver"}
                      </span>
                    </button>
                    {expandedSection === key && (
                      <div className="px-3 pb-3 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-2">
                        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Secciones detectadas (modo upload) */}
            {!result.generated_manual && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Secciones detectadas:</h3>
                <div className="flex flex-wrap gap-2">
                  {result.sections.map((s) => (
                    <span key={s} className="bg-white border border-green-300 text-green-800 px-3 py-1 rounded-full text-xs">
                      {SECTION_LABELS[s] || s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setPageState("idle"); setResult(null); setExistingManual(result.generated_manual || null); }}
              className="text-sm text-blue-600 hover:underline"
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
