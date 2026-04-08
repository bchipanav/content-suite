"""
Schemas de validación para el módulo Creative Engine.
"""

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    brand_id: str
    prompt: str
    platform: str = "general"       # instagram, twitter, linkedin, blog...
    tone: str | None = None         # overrides del tono por defecto de la marca
    format: str = "post"            # post, story, article, email...


class DraftResponse(BaseModel):
    id: str
    brand_id: str
    prompt: str
    result: str
    platform: str
    status: str
    created_at: str
