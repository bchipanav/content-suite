"""
Servicio Creative Engine.

FASE 3 del RAG: Generación.
    Contexto recuperado + Prompt del usuario → Groq (Llama 3) → Contenido final

Aquí se junta todo:
    1. Retrieval trae los chunks relevantes del manual
    2. Se construye un prompt con ese contexto
    3. Groq genera el contenido respetando la marca
"""

from app.core.clients import supabase, groq_client, langfuse
from app.services import retrieval


async def generate(brand_id: str, prompt: str, params: dict) -> dict:
    """
    Pipeline RAG completo.

    Ejemplo:
        result = await generate(
            brand_id="brand-123",
            prompt="Post de Instagram anunciando nueva colección de verano",
            params={"platform": "instagram", "format": "post"}
        )
        # result = {
        #     "id": "draft-456",
        #     "result": "☀️ ¡El verano llegó con todo!...",
        #     "context_used": ["El tono debe ser...", ...],
        #     ...
        # }
    """
    trace = langfuse.trace(
        name="content_generation",
        metadata={"brand_id": brand_id, "platform": params.get("platform")},
    )

    # =============================================
    # PASO 1: RETRIEVE — Buscar contexto relevante
    # =============================================
    # "¿Qué dice el manual de marca sobre lo que me están pidiendo?"
    retrieve_span = trace.span(name="retrieve_context")
    context_chunks = await retrieval.search(brand_id, prompt)
    retrieve_span.end(output={"chunks_found": len(context_chunks)})

    # Unir los chunks en un solo texto de contexto
    # Separados por "---" para que la IA sepa dónde empieza cada uno
    context_text = "\n---\n".join([c["chunk_text"] for c in context_chunks])

    # =============================================
    # PASO 2: BUILD PROMPT — Armar la instrucción
    # =============================================
    platform = params.get("platform", "general")
    content_format = params.get("format", "post")
    tone_override = params.get("tone")

    # Instrucciones específicas por formato
    format_instructions = {
        "post": "Genera un post para redes sociales. Incluye hashtags relevantes si aplica.",
        "story": "Genera texto para una story o reel. Debe ser breve, impactante y con call-to-action.",
        "article": "Genera un artículo completo con título, introducción, desarrollo y cierre.",
        "caption": "Genera un caption corto y atractivo para acompañar una imagen.",
        "newsletter": "Genera un email de newsletter con subject line, saludo, cuerpo y CTA.",
        "video_script": (
            "Genera un guión de video profesional con este formato:\n"
            "- ESCENA 1: [Descripción visual] | [Texto en pantalla] | [Voz en off]\n"
            "- ESCENA 2: ...\n"
            "Incluye notas de dirección (ángulos, transiciones, música sugerida).\n"
            "El guión debe respetar la identidad visual y tono de la marca."
        ),
        "image_prompt": (
            "Genera un prompt detallado para crear una imagen con IA (Midjourney/DALL-E).\n"
            "El prompt debe incluir:\n"
            "- Descripción de la escena principal\n"
            "- Estilo visual (basado en las directrices de marca)\n"
            "- Paleta de colores específica (usar los colores del manual)\n"
            "- Mood/atmósfera\n"
            "- Composición y elementos que deben aparecer\n"
            "- Elementos que NO deben aparecer (según restricciones de marca)\n"
            "Formato: un prompt listo para copiar y pegar en un generador de imágenes."
        ),
        "product_description": (
            "Genera una descripción de producto para e-commerce/catálogo.\n"
            "Incluye: título del producto, descripción corta (1 línea), descripción larga "
            "(2-3 párrafos), bullet points de beneficios, y un tagline."
        ),
    }

    format_instruction = format_instructions.get(content_format, f"Genera contenido en formato: {content_format}")

    system_prompt = f"""Eres un creador de contenido experto que trabaja para una marca específica.

DIRECTRICES DE MARCA (debes seguirlas estrictamente):
{context_text}

REGLAS:
- Respeta el tono de voz definido en las directrices
- Usa solo los colores y estilos visuales mencionados si aplica
- No inventes información sobre la marca que no esté en las directrices
- Plataforma: {platform}
{"- Tono específico solicitado: " + tone_override if tone_override else ""}

FORMATO SOLICITADO:
{format_instruction}"""

    # =============================================
    # PASO 3: GENERATE — Enviar a Groq (Llama 3)
    # =============================================
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
        temperature=0.7,   # Balance entre creatividad y consistencia
        max_tokens=2000,
    )

    generated_text = response.choices[0].message.content
    generation.end(output=generated_text)

    # =============================================
    # PASO 4: SAVE — Guardar borrador en Supabase
    # =============================================
    draft = (
        supabase.table("content_drafts")
        .insert({
            "brand_id": brand_id,
            "prompt": prompt,
            "result": generated_text,
            "platform": platform,
            "status": "pending_review",  # Siempre empieza pendiente de revisión
        })
        .execute()
    )

    trace.update(output={"draft_id": draft.data[0]["id"]})

    return {
        "id": draft.data[0]["id"],
        "brand_id": brand_id,
        "prompt": prompt,
        "result": generated_text,
        "platform": platform,
        "status": "pending_review",
        "context_used": [c["chunk_text"] for c in context_chunks],
        "created_at": draft.data[0]["created_at"],
    }
