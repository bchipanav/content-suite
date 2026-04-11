"""Schemas de validacion para el modulo Governance & Audit."""

from pydantic import BaseModel


class ReviewRequest(BaseModel):
    """Accion de aprobacion/rechazo sobre un borrador."""

    action: str              # "approved" | "rejected"
    comments: str | None = None


class ValidateTextRequest(BaseModel):
    brand_id: str
    text: str


class ValidationResponse(BaseModel):
    compliant: bool
    score: float              # 0-100
    issues: list[str]         # Problemas encontrados (vacio si cumple)
    image_url: str | None = None
