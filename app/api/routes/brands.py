"""
Rutas del módulo Brand DNA Architect.
CRUD de marcas + subida y consulta de manuales.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.clients import supabase
from app.schemas.brand import BrandCreate, BrandResponse, ManualUpload, ManualGenerateRequest, ManualQueryRequest
from app.middleware.rbac import require_permission
from app.services import brand_dna, retrieval

router = APIRouter(prefix="/api/brands", tags=["brands"])


@router.post("/", response_model=BrandResponse)
async def create_brand(body: BrandCreate, user=Depends(require_permission("brand.create"))):
    """Crear una marca nueva."""
    result = (
        supabase.table("brands")
        .insert({"name": body.name, "description": body.description, "created_by": user["id"]})
        .execute()
    )
    return result.data[0]


@router.get("/")
async def list_brands(user=Depends(require_permission("brand.read"))):
    """Listar marcas del usuario."""
    result = supabase.table("brands").select("*").execute()
    return result.data


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(brand_id: str, user=Depends(require_permission("brand.read"))):
    """Detalle de una marca."""
    result = supabase.table("brands").select("*").eq("id", brand_id).single().execute()
    return result.data


# --- Manual ---

@router.post("/{brand_id}/manual")
async def upload_manual(brand_id: str, body: ManualUpload, user=Depends(require_permission("manual.upload"))):
    """Subir manual de marca como texto. Procesa, genera embeddings y guarda."""
    result = await brand_dna.ingest_manual(brand_id, body.raw_text)
    return result


@router.post("/{brand_id}/manual/generate")
async def generate_manual(brand_id: str, body: ManualGenerateRequest, user=Depends(require_permission("manual.upload"))):
    """Generar manual de marca desde parámetros con IA (lo que pide el reto)."""
    result = await brand_dna.generate_manual(
        brand_id=brand_id,
        product=body.product,
        tone=body.tone,
        target_audience=body.target_audience,
        extra_context=body.extra_context,
    )
    return result


@router.get("/{brand_id}/manual")
async def get_manual(brand_id: str, user=Depends(require_permission("manual.read"))):
    """Obtener el manual estructurado (JSON)."""
    manual = await brand_dna.get_manual(brand_id)
    if not manual:
        raise HTTPException(status_code=404, detail="Esta marca no tiene manual cargado")
    return manual


@router.post("/{brand_id}/manual/query")
async def query_manual(brand_id: str, body: ManualQueryRequest, user=Depends(require_permission("manual.read"))):
    """Búsqueda semántica contra el manual."""
    results = await retrieval.search(brand_id, body.query, body.top_k)
    return {"query": body.query, "results": results}
