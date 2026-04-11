"""
Rutas del modulo Governance & Multimodal Audit.

Validacion de contenido, flujo de aprobacion y auditoria de imagen.
Endpoints:
    POST /api/governance/validate              - Validar texto vs manual
    POST /api/governance/validate-image/upload - Validar imagen (file upload)
    POST /api/governance/drafts/{id}/review    - Aprobar/rechazar borrador
    GET  /api/governance/audit-log             - Historial de auditoria
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.clients import supabase
from app.schemas.governance import (
    ReviewRequest,
    ValidateTextRequest,
    ValidationResponse,
)
from app.middleware.rbac import require_permission
from app.services import governance

router = APIRouter(prefix="/api/governance", tags=["governance"])


@router.post("/validate", response_model=ValidationResponse)
async def validate_text(
    body: ValidateTextRequest,
    user=Depends(require_permission("governance.validate")),
):
    """Validar texto contra el manual de marca (compliance score)."""
    result = await governance.validate_text(body.brand_id, body.text)
    return result


@router.post("/validate-image/upload", response_model=ValidationResponse)
async def validate_image_upload(
    brand_id: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(require_permission("governance.validate")),
):
    """Subir imagen y validarla contra el manual con Gemini Vision."""
    file_bytes = await file.read()
    content_type = file.content_type or "image/png"
    result = await governance.validate_image_from_bytes(brand_id, file_bytes, content_type)
    return result


@router.post("/drafts/{draft_id}/review")
async def review_draft(
    draft_id: str,
    body: ReviewRequest,
    user=Depends(require_permission("governance.approve")),
):
    """Aprobar o rechazar un borrador. Registra en audit_log."""
    result = await governance.review_draft(
        draft_id=draft_id,
        action=body.action,
        reviewer_id=user["id"],
        comments=body.comments,
    )
    return result


@router.get("/audit-log")
async def get_audit_log(
    draft_id: str | None = None,
    user=Depends(require_permission("governance.validate")),
):
    """Historial de auditoria, opcionalmente filtrado por borrador."""
    query = supabase.table("audit_log").select("*")
    if draft_id:
        query = query.eq("draft_id", draft_id)
    result = query.order("created_at", desc=True).execute()
    return result.data
