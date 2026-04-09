"""
Servicio de Retrieval - Busqueda semantica (Modulo RAG Fase 2).

Pipeline:
    Query del usuario --> Embedding --> Buscar en pgvector --> Retornar chunks relevantes

pgvector compara el vector de la query contra todos los vectores almacenados
usando distancia coseno:
    Similitud 1.0 = identicos en significado
    Similitud 0.0 = sin relacion
    Threshold 0.3 = umbral minimo de relevancia
"""

from app.core.clients import supabase, langfuse
from app.services import embeddings


async def search(brand_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Busca los chunks del manual mas relevantes para una query.

    Args:
        brand_id: ID de la marca (solo busca en SU manual)
        query: Texto de busqueda del usuario
        top_k: Cantidad maxima de resultados (default: 5)

    Returns:
        Lista de chunks con campos: chunk_text, chunk_type, similarity
    """
    trace = langfuse.trace(name="retrieval_search")

    # Paso 1: Convertir query a vector
    embed_span = trace.span(name="embed_query")
    query_vector = await embeddings.generate_single(query)
    embed_span.end()

    # Paso 2: Busqueda por similitud coseno en pgvector (funcion RPC)
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
