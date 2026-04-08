"""
Middleware que crea un trace de Langfuse para cada request.
Permite medir latencia y rastrear errores automáticamente.
"""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.clients import langfuse


class LangfuseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Crear trace para este request
        trace = langfuse.trace(
            name=f"{request.method} {request.url.path}",
            metadata={"method": request.method, "path": request.url.path},
        )

        # Guardar el trace en el request para que los servicios lo usen
        request.state.langfuse_trace = trace

        start = time.time()
        response = await call_next(request)
        duration = time.time() - start

        trace.update(
            output={"status_code": response.status_code, "duration_ms": round(duration * 1000)},
        )

        return response
