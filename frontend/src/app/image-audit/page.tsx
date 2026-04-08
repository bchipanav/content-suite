"use client";

// ============================================
// PANTALLA 4: Auditoría de Imagen
// ============================================
// El Aprobador B sube una imagen desde su computadora.
// Gemini Vision la analiza contra las reglas visuales del manual.

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";
import ScoreBar from "@/components/ui/ScoreBar";

type PageState = "idle" | "analyzing" | "result" | "error";

export default function ImageAuditPage() {
  const { activeBrand } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pageState, setPageState] = useState<PageState>("idle");
  const [error, setError] = useState("");
  const [validationResult, setValidationResult] = useState<{
    compliant: boolean;
    score: number;
    issues: string[];
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFilePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();

    if (!activeBrand) {
      setError("Selecciona una marca primero");
      return;
    }
    if (!selectedFile) {
      setError("Selecciona una imagen primero");
      return;
    }

    setPageState("analyzing");
    setError("");

    try {
      const data = await api.validateImageUpload(activeBrand.id, selectedFile);
      setValidationResult(data);
      setPageState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar la imagen");
      setPageState("error");
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Auditoría de Imagen</h1>
        <p className="text-gray-500 mb-6">
          Sube una imagen para verificar si cumple con las reglas visuales de la marca
          (colores, tipografía, logo, estilo).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda: Upload */}
          <div>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona una imagen
                </label>

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-gray-400 mb-2 text-3xl">+</div>
                    <p className="text-sm text-gray-500">
                      Haz clic para seleccionar una imagen
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, WEBP (max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-48 object-contain bg-gray-50"
                      />
                    )}
                    <div className="p-3 flex items-center justify-between bg-white">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-3"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={pageState === "analyzing" || !selectedFile}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {pageState === "analyzing" ? "Analizando con Gemini Vision..." : "Analizar Imagen"}
              </button>
            </form>
          </div>

          {/* Columna derecha: Resultado */}
          <div>
            {pageState === "analyzing" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-blue-700">
                  Gemini Vision analizando la imagen contra tu manual de marca...
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {pageState === "result" && validationResult && (
              <div className="space-y-4">
                {/* Score y veredicto */}
                <div
                  className={`p-5 rounded-lg border ${
                    validationResult.compliant
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">
                      {validationResult.compliant ? "✓" : "✗"}
                    </span>
                    <p className={`font-semibold ${
                      validationResult.compliant ? "text-green-800" : "text-red-800"
                    }`}>
                      {validationResult.compliant
                        ? "Cumple con la marca"
                        : "No cumple con la marca"}
                    </p>
                  </div>
                  <ScoreBar score={validationResult.score} />
                </div>

                {/* Problemas */}
                {validationResult.issues.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Problemas encontrados:
                    </h3>
                    <ul className="space-y-2">
                      {validationResult.issues.map((issue, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-red-400 shrink-0">-</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.issues.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">
                      No se encontraron problemas. La imagen cumple con las directrices.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
