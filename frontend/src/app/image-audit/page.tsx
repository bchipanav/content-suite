"use client";

import { useState, useRef, useEffect } from "react";
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
  const [hasManual, setHasManual] = useState<boolean | null>(null);

  useEffect(() => {
    if (!activeBrand) { setHasManual(null); return; }
    api.getManual(activeBrand.id)
      .then(() => setHasManual(true))
      .catch(() => setHasManual(false));
  }, [activeBrand]);

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
    if (!activeBrand) { setError("Selecciona una marca primero"); return; }
    if (!selectedFile) { setError("Selecciona una imagen primero"); return; }

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Auditoria de Imagen</h1>
          <p className="text-slate-500 mt-1">
            Sube una imagen para verificar si cumple con las reglas visuales de la marca.
          </p>
        </div>

        {hasManual === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-amber-800 font-medium mb-3">
              Esta marca no tiene un manual de marca generado.
            </p>
            <p className="text-xs text-amber-600">
              El Creator debe generar el manual primero para poder auditar imagenes contra las reglas de la marca.
            </p>
          </div>
        )}

        {hasManual === true && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleAnalyze} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Selecciona una imagen
                </label>

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                      Haz clic para seleccionar
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP (max 10MB)</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-52 object-contain bg-slate-50"
                      />
                    )}
                    <div className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0 ml-3"
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
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {pageState === "analyzing" ? "Analizando..." : "Analizar Imagen"}
              </button>
            </form>
          </div>

          <div>
            {pageState === "analyzing" && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-blue-700 font-medium">
                  Analizando imagen contra tu manual de marca...
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
                {error}
              </div>
            )}

            {pageState === "result" && validationResult && (
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-2xl border ${
                    validationResult.compliant
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      validationResult.compliant ? "bg-emerald-100" : "bg-red-100"
                    }`}>
                      <span className={`text-lg ${validationResult.compliant ? "text-emerald-600" : "text-red-600"}`}>
                        {validationResult.compliant ? "\u2713" : "\u2717"}
                      </span>
                    </div>
                    <p className={`font-semibold ${
                      validationResult.compliant ? "text-emerald-800" : "text-red-800"
                    }`}>
                      {validationResult.compliant
                        ? "Cumple con la marca"
                        : "No cumple con la marca"}
                    </p>
                  </div>
                  <ScoreBar score={validationResult.score} />
                </div>

                {validationResult.issues.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Problemas encontrados
                    </h3>
                    <ul className="space-y-2.5">
                      {validationResult.issues.map((issue, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                          <span className="text-red-400 shrink-0 mt-0.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                          </span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.issues.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-sm text-slate-500">
                      No se encontraron problemas. La imagen cumple con las directrices.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>}
      </div>
    </AppShell>
  );
}
