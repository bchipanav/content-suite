"""
Middleware de observabilidad con Langfuse.

Crea un trace automatico para cada request HTTP, registrando:
    - Metodo y ruta (ej: "POST /api/content/generate")
    - Status code de la respuesta
    - Duracion en milisegundos

El trace se guarda en request.state para que los servicios puedan
agregar spans hijos (retrieve, generate, etc.).
"""

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.clients import langfuse


class LangfuseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace = langfuse.trace(
            name=f"{request.method} {request.url.path}",
            metadata={"method": request.method, "path": request.url.path},
        )
        request.state.langfuse_trace = trace

        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000)

        trace.update(
            output={"status_code": response.status_code, "duration_ms": duration_ms},
        )

        return response
