// ============================================
// Tipos centrales de Content Suite
// ============================================

// --- Roles ---
// Creador: genera contenido, envía a revisión
// Aprobador A: primera revisión (Brand Manager)
// Aprobador B: aprobación final (Director/Admin)
export type Role = "creator" | "approver_a" | "approver_b";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  brand_ids: string[];
}

// --- Brand DNA ---
export interface Brand {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface BrandManual {
  id: string;
  brand_id: string;
  structured_json: {
    tono_de_voz: string | null;
    paleta_colores: string | null;
    tipografia: string | null;
    valores_marca: string | null;
    personalidad: string | null;
    publico_objetivo: string | null;
    restricciones: string | null;
    uso_logo: string | null;
  };
  version: number;
}

export interface ManualIngestionResult {
  chunks_stored: number;
  sections: string[];
  structured_manual: Record<string, string | null>;
}

// --- Content ---
export type DraftStatus = "pending_review" | "approved" | "rejected";

export interface Draft {
  id: string;
  brand_id: string;
  prompt: string;
  result: string;
  platform: string;
  status: DraftStatus;
  created_by: string;
  created_at: string;
}

// --- Governance ---
export type ReviewAction = "approved" | "rejected";

export interface ValidationResult {
  compliant: boolean;
  score: number;
  issues: string[];
}

export interface AuditLogEntry {
  id: string;
  draft_id: string;
  action: ReviewAction;
  reviewer_id: string;
  comments: string | null;
  compliance_score: number | null;
  created_at: string;
}
