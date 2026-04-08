"""
Seed script: Crea los 3 usuarios de prueba para el reto.
Ejecutar UNA VEZ después de configurar Supabase:

    python scripts/seed_users.py

Credenciales que se crean:
    cs.creator@gmail.com     / Creator123!    → Rol: creator
    cs.approvera@gmail.com   / ApproverA123!  → Rol: approver_a
    cs.approverb@gmail.com   / ApproverB123!  → Rol: approver_b
"""

import sys
sys.path.insert(0, ".")

from app.core.clients import supabase

USERS = [
    {
        "email": "cs.creator@gmail.com",
        "password": "Creator123!",
        "full_name": "Ana García (Creador)",
        "role": "creator",
    },
    {
        "email": "cs.approvera@gmail.com",
        "password": "ApproverA123!",
        "full_name": "Carlos López (Aprobador A)",
        "role": "approver_a",
    },
    {
        "email": "cs.approverb@gmail.com",
        "password": "ApproverB123!",
        "full_name": "María Rodríguez (Aprobador B)",
        "role": "approver_b",
    },
]


def seed():
    for u in USERS:
        print(f"Creando {u['email']}...", end=" ")
        try:
            # Crear en Supabase Auth
            auth = supabase.auth.sign_up({"email": u["email"], "password": u["password"]})

            if not auth.user:
                print("ERROR: no se creó el usuario en Auth")
                continue

            # Crear perfil con rol
            supabase.table("user_profiles").insert({
                "id": auth.user.id,
                "full_name": u["full_name"],
                "role": u["role"],
            }).execute()

            print(f"OK → {u['role']}")
        except Exception as e:
            print(f"ERROR: {e}")

    print("\n--- Credenciales de acceso ---")
    for u in USERS:
        print(f"  {u['role']:12} → {u['email']} / {u['password']}")


if __name__ == "__main__":
    seed()
