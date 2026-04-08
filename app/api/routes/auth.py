"""
Rutas de autenticación.
Usa Supabase Auth para login/register y manejo de JWT.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.clients import supabase
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.middleware.rbac import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(body: RegisterRequest):
    """Crear cuenta nueva en Supabase Auth + perfil con rol."""
    try:
        # 1. Crear usuario en Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="No se pudo crear el usuario")

        # 2. Crear perfil con rol en nuestra tabla
        supabase.table("user_profiles").insert({
            "id": auth_response.user.id,
            "full_name": body.full_name,
            "role": "creator",  # Rol por defecto
        }).execute()

        return {
            "id": auth_response.user.id,
            "email": body.email,
            "message": "Usuario creado correctamente",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    """Iniciar sesión, devuelve JWT de Supabase."""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })

        return {
            "access_token": auth_response.session.access_token,
            "user_id": auth_response.user.id,
            "email": auth_response.user.email,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    """Perfil del usuario actual."""
    return user
