"""
Content Suite - Punto de entrada de la aplicacion.

Configura FastAPI con middleware (CORS, Langfuse) y registra
los 4 routers: auth, brands, content, governance.

Ejecucion local:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.middleware.langfuse_trace import LangfuseMiddleware
from app.api.routes import auth, brands, content, governance

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware (orden importa: CORS se agrega ultimo para ejecutarse primero)
app.add_middleware(LangfuseMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(brands.router)
app.include_router(content.router)
app.include_router(governance.router)


@app.get("/health")
async def health():
    """Health check para monitoreo y deploys."""
    return {"status": "ok", "app": settings.APP_NAME}
