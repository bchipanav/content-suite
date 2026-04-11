"""
Rutas del modulo Brand DNA Architect.

CRUD de marcas + generacion/consulta de manuales.
Endpoints:
    POST /api/brands/                      - Crear marca
    GET  /api/brands/                      - Listar marcas
    GET  /api/brands/{id}                  - Detalle de marca
    POST /api/brands/{id}/manual/generate  - Generar manual con IA
    GET  /api/brands/{id}/manual           - Obtener manual (JSON)
    POST /api/brands/{id}/manual/query     - Busqueda semantica
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.clients import supabase
from app.schemas.brand import (
    BrandCreate,
    BrandResponse,
    ManualGenerateRequest,
    ManualQueryRequest,
)
from app.middleware.rbac import require_permission
from app.services import brand_dna, retrieval

router = APIRouter(prefix="/api/brands", tags=["brands"], redirect_slashes=False)


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
    """Listar todas las marcas."""
    result = supabase.table("brands").select("*").execute()
    return result.data


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(brand_id: str, user=Depends(require_permission("brand.read"))):
    """Detalle de una marca por ID."""
    result = supabase.table("brands").select("*").eq("id", brand_id).single().execute()
    return result.data


@router.post("/{brand_id}/manual/generate")
async def generate_manual(
    brand_id: str,
    body: ManualGenerateRequest,
    user=Depends(require_permission("manual.upload")),
):
    """Generar manual de marca completo desde parametros con IA."""
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
    """Obtener el manual estructurado (JSON) de una marca."""
    manual = await brand_dna.get_manual(brand_id)
    if not manual:
        raise HTTPException(status_code=404, detail="Esta marca no tiene manual cargado")
    return manual


@router.post("/{brand_id}/manual/query")
async def query_manual(
    brand_id: str,
    body: ManualQueryRequest,
    user=Depends(require_permission("manual.read")),
):
    """Busqueda semantica contra el manual de marca."""
    results = await retrieval.search(brand_id, body.query, body.top_k)
    return {"query": body.query, "results": results}
