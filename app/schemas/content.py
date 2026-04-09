"""Schemas de validacion para el modulo Creative Engine."""

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    """Request para generar contenido con RAG."""

    brand_id: str
    prompt: str
    content_type: str = "product_description"  # product_description | video_script | image_prompt


class DraftResponse(BaseModel):
    id: str
    brand_id: str
    prompt: str
    result: str
    content_type: str
    status: str
    created_at: str
