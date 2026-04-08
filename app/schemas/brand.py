"""
Schemas de validación para el módulo Brand DNA.
Definen la forma de los datos que entran y salen de la API.
"""

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
    raw_text: str  # Texto extraído del PDF (el frontend lo envía ya parseado)


class ManualGenerateRequest(BaseModel):
    """El reto pide que el usuario ingrese parámetros y la IA genere el manual."""
    product: str            # "Snack saludable de quinua"
    tone: str               # "Divertido pero profesional"
    target_audience: str    # "Gen Z"
    extra_context: str = "" # Cualquier info adicional


class ManualQueryRequest(BaseModel):
    query: str
    top_k: int = 5
