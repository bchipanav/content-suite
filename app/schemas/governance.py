"""
Schemas de validación para el módulo Governance & Audit.
"""

from pydantic import BaseModel


class ReviewRequest(BaseModel):
    action: str         # "approved" o "rejected"
    comments: str | None = None


class ValidateTextRequest(BaseModel):
    brand_id: str
    text: str


class ValidateImageRequest(BaseModel):
    brand_id: str
    image_url: str


class ValidationResponse(BaseModel):
    compliant: bool
    score: float                        # 0-100
    issues: list[str]                   # Lista de problemas encontrados
    image_url: str | None = None        # Solo presente en upload de archivo
