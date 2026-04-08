"""
Punto de entrada de la aplicación FastAPI.
Para ejecutar:  uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.middleware.langfuse_trace import LangfuseMiddleware
from app.api.routes import auth, brands, content, governance

# --- Crear app ---
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",       # Swagger UI en /docs
    redoc_url="/redoc",     # ReDoc en /redoc
)

# --- Middleware ---
# Orden importa: CORS debe ser el ÚLTIMO en agregarse para que se ejecute PRIMERO
app.add_middleware(LangfuseMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registrar routers ---
app.include_router(auth.router)
app.include_router(brands.router)
app.include_router(content.router)
app.include_router(governance.router)


# --- Health check ---
@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
