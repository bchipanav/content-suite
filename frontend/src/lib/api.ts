// ============================================
// Cliente API — Conecta el frontend con FastAPI
// ============================================
// Cada función corresponde a un endpoint del backend.
// Todas envían el token JWT para autenticación.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Obtener token del localStorage (lo guarda Supabase al hacer login)
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  return res.json();
}

// --- Auth ---
export const api = {
  login(email: string, password: string) {
    return request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  getMe() {
    return request<{ id: string; email: string; full_name: string; role: string }>(
      "/api/auth/me"
    );
  },

  // --- Brands ---
  listBrands() {
    return request<{ id: string; name: string; description: string | null }[]>("/api/brands");
  },

  createBrand(name: string, description?: string) {
    return request<{ id: string; name: string; description: string | null; created_at: string }>(
      "/api/brands",
      { method: "POST", body: JSON.stringify({ name, description }) }
    );
  },

  generateManual(brandId: string, params: { product: string; tone: string; target_audience: string; extra_context?: string }) {
    return request<{ chunks_stored: number; sections: string[]; generated_manual: Record<string, string> }>(
      `/api/brands/${brandId}/manual/generate`,
      { method: "POST", body: JSON.stringify(params) }
    );
  },

  getManual(brandId: string) {
    return request<{ structured_json: Record<string, string | null> }>(
      `/api/brands/${brandId}/manual`
    );
  },

  // --- Content ---
  generateContent(params: {
    brand_id: string;
    prompt: string;
    content_type: string;
  }) {
    return request<{
      id: string;
      result: string;
      context_used: string[];
      status: string;
    }>("/api/content/generate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  listDrafts(filters?: { status?: string; brand_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.brand_id) params.set("brand_id", filters.brand_id);
    const query = params.toString();
    return request<
      { id: string; prompt: string; result: string; status: string; content_type: string; created_at: string }[]
    >(`/api/content/drafts${query ? `?${query}` : ""}`);
  },

  // --- Governance ---
  validateText(brandId: string, text: string) {
    return request<{ compliant: boolean; score: number; issues: string[] }>(
      "/api/governance/validate",
      { method: "POST", body: JSON.stringify({ brand_id: brandId, text }) }
    );
  },

  async validateImageUpload(brandId: string, file: File) {
    // Este endpoint usa FormData (file upload), no JSON
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const formData = new FormData();
    formData.append("brand_id", brandId);
    formData.append("file", file);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/governance/validate-image/upload`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        // No poner Content-Type: el browser lo pone automáticamente con el boundary de FormData
        body: formData,
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Error desconocido" }));
      throw new Error(error.detail || `Error ${res.status}`);
    }

    return res.json() as Promise<{ compliant: boolean; score: number; issues: string[]; image_url?: string }>;
  },

  reviewDraft(draftId: string, action: string, comments?: string) {
    return request<{ draft_id: string; new_status: string }>(
      `/api/governance/drafts/${draftId}/review`,
      { method: "POST", body: JSON.stringify({ action, comments }) }
    );
  },

  getAuditLog(draftId?: string) {
    const query = draftId ? `?draft_id=${draftId}` : "";
    return request<
      { id: string; draft_id: string; action: string; comments: string; created_at: string }[]
    >(`/api/governance/audit-log${query}`);
  },
};
