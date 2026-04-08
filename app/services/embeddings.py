"""
Servicio de generación de embeddings.
Usa Google AI (gemini-embedding-001) con Matryoshka truncation a 768 dimensiones.

El modelo genera 3072 dimensiones, pero las truncamos a 768 porque
pgvector en Supabase no soporta índices con más de 2000 dimensiones.
Las primeras 768 dimensiones retienen la mayor parte de la información
(propiedad Matryoshka de los embeddings modernos).
"""

import google.generativeai as genai

from app.core.config import settings

genai.configure(api_key=settings.GOOGLE_AI_API_KEY)

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIMENSION = 768  # Truncado desde 3072


def _truncate(vector: list[float]) -> list[float]:
    """Trunca el vector a las primeras 768 dimensiones."""
    return vector[:EMBEDDING_DIMENSION]


async def generate(texts: list[str]) -> list[list[float]]:
    """
    Genera embeddings para una lista de textos.
    Retorna vectores de 768 dimensiones.
    """
    results = []
    batch_size = 20
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=batch,
            task_type="retrieval_document",
        )
        results.extend([_truncate(v) for v in response["embedding"]])
    return results


async def generate_single(text: str) -> list[float]:
    """
    Genera embedding para un solo texto (query de búsqueda).
    """
    response = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_query",
    )
    return _truncate(response["embedding"])
