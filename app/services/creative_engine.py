"""
Servicio Creative Engine (Modulo II).

Pipeline RAG completo para generacion de contenido:
    1. RETRIEVE: Buscar chunks relevantes del manual en pgvector
    2. BUILD:    Construir prompt con contexto de marca + instrucciones por formato
    3. GENERATE: Enviar a Groq (Llama 3.3 70B)
    4. SAVE:     Guardar borrador con status pending_review

Tipos de contenido soportados:
    - product_description: Descripcion de producto para e-commerce
    - video_script:        Guion de video con escenas y direccion
    - image_prompt:        Prompt detallado para generadores de imagen (Midjourney/DALL-E)
"""

from app.core.clients import supabase, groq_client, langfuse
from app.services import retrieval

# Instrucciones especificas por tipo de contenido
FORMAT_INSTRUCTIONS = {
    "product_description": (
        "Genera una descripcion de producto para e-commerce/catalogo.\n"
        "Incluye: titulo del producto, descripcion corta (1 linea), descripcion larga "
        "(2-3 parrafos), bullet points de beneficios, y un tagline."
    ),
    "video_script": (
        "Genera un guion de video profesional con este formato:\n"
        "- ESCENA 1: [Descripcion visual] | [Texto en pantalla] | [Voz en off]\n"
        "- ESCENA 2: ...\n"
        "Incluye notas de direccion (angulos, transiciones, musica sugerida).\n"
        "El guion debe respetar la identidad visual y tono de la marca."
    ),
    "image_prompt": (
        "Genera un prompt detallado para crear una imagen con IA (Midjourney/DALL-E).\n"
        "El prompt debe incluir:\n"
        "- Descripcion de la escena principal\n"
        "- Estilo visual (basado en las directrices de marca)\n"
        "- Paleta de colores especifica (usar los colores del manual)\n"
        "- Mood/atmosfera\n"
        "- Composicion y elementos que deben aparecer\n"
        "- Elementos que NO deben aparecer (segun restricciones de marca)\n"
        "Formato: un prompt listo para copiar y pegar en un generador de imagenes."
    ),
}


async def generate(
    brand_id: str,
    prompt: str,
    content_type: str = "product_description",
) -> dict:
    """
    Pipeline RAG completo: retrieve + build + generate + save.

    Args:
        brand_id: ID de la marca
        prompt: Descripcion del contenido deseado
        content_type: Tipo de contenido a generar

    Returns:
        Dict con id, result, content_type, status, context_used, created_at
    """
    trace = langfuse.trace(
        name="content_generation",
        metadata={"brand_id": brand_id, "content_type": content_type},
    )

    # --- RETRIEVE: Buscar contexto relevante del manual ---
    retrieve_span = trace.span(name="retrieve_context")
    context_chunks = await retrieval.search(brand_id, prompt)
    retrieve_span.end(output={"chunks_found": len(context_chunks)})

    context_text = "\n---\n".join([c["chunk_text"] for c in context_chunks])

    # --- BUILD: Construir prompt con contexto + instrucciones ---
    format_instruction = FORMAT_INSTRUCTIONS.get(
        content_type, FORMAT_INSTRUCTIONS["product_description"]
    )

    system_prompt = f"""Eres un creador de contenido experto que trabaja para una marca especifica.

DIRECTRICES DE MARCA (debes seguirlas estrictamente):
{context_text}

REGLAS:
- Respeta el tono de voz definido en las directrices
- Usa solo los colores y estilos visuales mencionados si aplica
- No inventes informacion sobre la marca que no este en las directrices

FORMATO SOLICITADO:
{format_instruction}"""

    # --- GENERATE: Enviar a Groq ---
    generation = trace.generation(
        name="groq_llama3",
        model="llama-3.3-70b-versatile",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=2000,
    )

    generated_text = response.choices[0].message.content
    generation.end(output=generated_text)

    # --- SAVE: Guardar borrador en Supabase ---
    draft = (
        supabase.table("content_drafts")
        .insert({
            "brand_id": brand_id,
            "prompt": prompt,
            "result": generated_text,
            "content_type": content_type,
            "status": "pending_review",
        })
        .execute()
    )

    trace.update(output={"draft_id": draft.data[0]["id"]})

    return {
        "id": draft.data[0]["id"],
        "brand_id": brand_id,
        "prompt": prompt,
        "result": generated_text,
        "content_type": content_type,
        "status": "pending_review",
        "context_used": [c["chunk_text"] for c in context_chunks],
        "created_at": draft.data[0]["created_at"],
    }
