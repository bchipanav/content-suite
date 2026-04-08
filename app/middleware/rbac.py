"""
Middleware de control de acceso por roles (RBAC).

Roles del reto:
    - creator:    Genera contenido, envía a revisión
    - approver_a: Primera revisión (Brand Manager)
    - approver_b: Aprobación final (Director)

Uso en endpoints:
    @router.post("/algo")
    async def mi_endpoint(user=Depends(require_permission("content.generate"))):
        ...
"""

from enum import Enum
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.clients import supabase

# Esquema de seguridad: espera header "Authorization: Bearer <token>"
security = HTTPBearer()


class Role(str, Enum):
    CREATOR = "creator"
    APPROVER_A = "approver_a"
    APPROVER_B = "approver_b"


# Qué roles pueden hacer qué acción
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


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
        # Agregar email desde auth (no está en user_profiles)
        data = profile.data
        data["email"] = user.user.email
        return data
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def require_permission(permission: str):
    """Dependency de FastAPI que verifica si el usuario tiene permiso."""
    async def checker(current_user=Depends(get_current_user)):
        user_role = Role(current_user["role"])
        allowed_roles = PERMISSIONS.get(permission, set())
        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail="No tienes permiso para esta acción")
        return current_user
    return checker
