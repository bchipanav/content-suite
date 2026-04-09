"""
Servicio de generacion de embeddings.

Usa Google AI (gemini-embedding-001) con truncacion Matryoshka a 768 dimensiones.

El modelo genera vectores de 3072 dimensiones, pero se truncan a 768 porque
pgvector en Supabase no soporta indices con mas de 2000 dims. Las primeras
768 dims retienen ~95% de la informacion semantica (propiedad Matryoshka).
"""

import google.generativeai as genai

from app.core.config import settings

genai.configure(api_key=settings.GOOGLE_AI_API_KEY)

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIMENSION = 768  # Truncado desde 3072
BATCH_SIZE = 20


def _truncate(vector: list[float]) -> list[float]:
    """Trunca un vector a las primeras EMBEDDING_DIMENSION dimensiones."""
    return vector[:EMBEDDING_DIMENSION]


async def generate(texts: list[str]) -> list[list[float]]:
    """
    Genera embeddings para una lista de textos.

    Procesa en lotes de BATCH_SIZE para respetar limites de la API.
    Retorna vectores de 768 dimensiones.
    """
    results = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=batch,
            task_type="retrieval_document",
        )
        results.extend([_truncate(v) for v in response["embedding"]])
    return results


async def generate_single(text: str) -> list[float]:
    """
    Genera embedding para un solo texto (query de busqueda).

    Usa task_type="retrieval_query" optimizado para busqueda semantica.
    """
    response = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_query",
    )
    return _truncate(response["embedding"])
