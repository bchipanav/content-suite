"""
Rutas del modulo Creative Engine.

Generacion de contenido con RAG y gestion de borradores.
Endpoints:
    POST   /api/content/generate      - Generar contenido (RAG)
    GET    /api/content/drafts        - Listar borradores
    GET    /api/content/drafts/{id}   - Detalle de borrador
    PUT    /api/content/drafts/{id}   - Editar borrador
    DELETE /api/content/drafts/{id}   - Eliminar borrador
"""

from fastapi import APIRouter, Depends

from app.core.clients import supabase
from app.schemas.content import GenerateRequest
from app.middleware.rbac import require_permission
from app.services import creative_engine

router = APIRouter(prefix="/api/content", tags=["content"])


@router.post("/generate")
async def generate_content(
    body: GenerateRequest,
    user=Depends(require_permission("content.generate")),
):
    """Generar contenido usando pipeline RAG (retrieve del manual + Groq)."""
    result = await creative_engine.generate(
        brand_id=body.brand_id,
        prompt=body.prompt,
        content_type=body.content_type,
    )
    return result


@router.get("/drafts")
async def list_drafts(
    status: str | None = None,
    brand_id: str | None = None,
    user=Depends(require_permission("content.read")),
):
    """Listar borradores con filtros opcionales por status y marca."""
    query = supabase.table("content_drafts").select("*")
    if status:
        query = query.eq("status", status)
    if brand_id:
        query = query.eq("brand_id", brand_id)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/drafts/{draft_id}")
async def get_draft(draft_id: str, user=Depends(require_permission("content.read"))):
    """Detalle de un borrador por ID."""
    result = supabase.table("content_drafts").select("*").eq("id", draft_id).single().execute()
    return result.data


@router.put("/drafts/{draft_id}")
async def update_draft(
    draft_id: str,
    body: dict,
    user=Depends(require_permission("content.edit")),
):
    """Editar el contenido de un borrador manualmente."""
    result = (
        supabase.table("content_drafts")
        .update({"result": body.get("result")})
        .eq("id", draft_id)
        .execute()
    )
    return result.data[0]


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, user=Depends(require_permission("content.edit"))):
    """Eliminar un borrador."""
    supabase.table("content_drafts").delete().eq("id", draft_id).execute()
    return {"deleted": True}
