"""Schemas de validacion para el modulo Brand DNA."""

from pydantic import BaseModel


class BrandCreate(BaseModel):
    name: str
    description: str | None = None


class BrandResponse(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: str


class ManualUpload(BaseModel):
    """Texto crudo de un manual existente (el frontend lo envia ya parseado)."""

    raw_text: str


class ManualGenerateRequest(BaseModel):
    """Parametros para que la IA genere el manual de marca."""

    product: str             # "Snack saludable de quinua"
    tone: str                # "Divertido pero profesional"
    target_audience: str     # "Gen Z"
    extra_context: str = ""  # Info adicional (opcional)


class ManualQueryRequest(BaseModel):
    """Busqueda semantica contra el manual."""

    query: str
    top_k: int = 5
