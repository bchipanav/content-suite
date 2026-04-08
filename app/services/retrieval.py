"""
Servicio de Retrieval (búsqueda semántica).

FASE 2 del RAG: Búsqueda.
    Query del usuario → Embedding → Buscar en pgvector → Retornar chunks relevantes

¿Cómo funciona la búsqueda?
    pgvector compara el vector de la pregunta contra todos los vectores guardados.
    Usa "distancia coseno" para medir qué tan parecidos son.

    Similitud = 1.0 → idénticos en significado
    Similitud = 0.0 → nada que ver
    Similitud > 0.3 → suficientemente relevante (nuestro umbral)
"""

from app.core.clients import supabase, langfuse
from app.services import embeddings


async def search(brand_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Busca los chunks del manual más relevantes para una query.

    Ejemplo:
        query = "¿Qué tono de voz debo usar?"
        results = await search("brand-123", query)
        # results = [
        #     {"chunk_text": "El tono debe ser amigable...", "similarity": 0.92},
        #     {"chunk_text": "Evitar lenguaje formal...", "similarity": 0.87},
        # ]

    Parámetros:
        brand_id: ID de la marca (solo busca en SU manual)
        query: Lo que preguntó/pidió el usuario
        top_k: Cuántos resultados devolver (default: 5)
    """
    trace = langfuse.trace(name="retrieval_search")

    # Paso 1: Convertir la query en vector
    embed_span = trace.span(name="embed_query")
    query_vector = await embeddings.generate_single(query)
    embed_span.end()

    # Paso 2: Buscar en pgvector usando la función RPC que creamos en el SQL
    #
    # Esta función (match_brand_embeddings) hace lo siguiente internamente:
    #   - Toma el vector de la query
    #   - Lo compara contra todos los vectores de esa marca
    #   - Calcula similitud coseno entre cada par
    #   - Filtra los que superen el umbral (0.7)
    #   - Retorna los top_k más similares, ordenados de mayor a menor
    search_span = trace.span(name="pgvector_search")
    result = supabase.rpc(
        "match_brand_embeddings",
        {
            "query_embedding": query_vector,
            "match_brand_id": brand_id,
            "match_threshold": 0.3,
            "match_count": top_k,
        },
    ).execute()
    search_span.end(output={"results_found": len(result.data)})

    trace.update(output={
        "query": query,
        "results_found": len(result.data),
        "top_similarity": result.data[0]["similarity"] if result.data else 0,
    })

    return result.data
