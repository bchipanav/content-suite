"""
Middleware RBAC (Role-Based Access Control).

Define 3 roles con permisos granulares:
    - creator:    Genera contenido, edita borradores
    - approver_a: Primera revision (Brand Manager)
    - approver_b: Aprobacion final + auditoria de imagen (Director)

Uso en endpoints:
    @router.post("/algo")
    async def mi_endpoint(user=Depends(require_permission("content.generate"))):
        ...
"""

from enum import Enum

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.clients import supabase

security = HTTPBearer()


class Role(str, Enum):
    CREATOR = "creator"
    APPROVER_A = "approver_a"
    APPROVER_B = "approver_b"


# Matriz de permisos: que roles pueden ejecutar cada accion
PERMISSIONS: dict[str, set[Role]] = {
    # Brand DNA
    "brand.create":        {Role.CREATOR, Role.APPROVER_A, Role.APPROVER_B},
    "brand.read":          {Role.CREATOR, Role.APPROVER_A, Role.APPROVER_B},
    "manual.upload":       {Role.CREATOR, Role.APPROVER_A, Role.APPROVER_B},
    "manual.read":         {Role.CREATOR, Role.APPROVER_A, Role.APPROVER_B},

    # Creative Engine
    "content.generate":    {Role.CREATOR},
    "content.read":        {Role.CREATOR, Role.APPROVER_A, Role.APPROVER_B},
    "content.edit":        {Role.CREATOR},

    # Governance
    "governance.approve":  {Role.APPROVER_A, Role.APPROVER_B},
    "governance.submit":   {Role.CREATOR},
    "governance.validate": {Role.APPROVER_B},

    # Observabilidad
    "observability.read":  {Role.APPROVER_A, Role.APPROVER_B},
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Valida el JWT de Supabase y retorna el perfil del usuario."""
    try:
        token = credentials.credentials
        user = supabase.auth.get_user(token)
        profile = (
            supabase.table("user_profiles")
            .select("*")
            .eq("id", user.user.id)
            .single()
            .execute()
        )
        data = profile.data
        data["email"] = user.user.email
        return data
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")


def require_permission(permission: str):
    """Dependency de FastAPI que verifica si el usuario tiene el permiso requerido."""

    async def checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = Role(current_user["role"])
        allowed_roles = PERMISSIONS.get(permission, set())
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403, detail="No tienes permiso para esta accion"
            )
        return current_user

    return checker
