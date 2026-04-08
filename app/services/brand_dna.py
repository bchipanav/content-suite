"""
Servicio Brand DNA Architect.
Responsable de procesar manuales de marca: estructurar, hacer chunking,
generar embeddings y guardar en Supabase.

FASE 1 del RAG: Preparación de datos.
    Dos modos:
    A) Parámetros → IA genera manual completo → Chunks → Embeddings → Guardar
    B) Texto crudo → IA estructura → Chunks → Embeddings → Guardar
"""

import json

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.clients import supabase, groq_client, langfuse
from app.services import embeddings


# --- Modo A: Generar manual desde parámetros (lo que pide el reto) ---

async def generate_manual(brand_id: str, product: str, tone: str, target_audience: str, extra_context: str = "") -> dict:
    """
    El usuario ingresa parámetros cortos y la IA genera un manual de marca completo.
    Esto es lo que pide el reto:
        "El usuario ingresa parámetros (ej. 'Snack saludable de quinua',
         'Tono divertido pero profesional', 'Público Gen Z').
         La IA genera un Manual de Marca Estructurado."
    """
    trace = langfuse.trace(name="brand_dna_generation", metadata={"brand_id": brand_id})

    gen_span = trace.span(name="generate_full_manual")
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un director creativo de una agencia top de branding. "
                    "A partir de los parámetros del usuario, genera un Manual de Marca "
                    "completo y profesional en formato JSON con EXACTAMENTE estas claves:\n\n"
                    "- tono_de_voz: Descripción detallada del tono, con ejemplos de frases que SÍ usar y que NO usar\n"
                    "- paleta_colores: Colores primarios y secundarios con códigos HEX y su justificación\n"
                    "- tipografia: Fuentes para títulos y cuerpo, con razón de la elección\n"
                    "- valores_marca: 4-6 valores con descripción de cada uno\n"
                    "- personalidad: Arquetipos y rasgos de personalidad de la marca\n"
                    "- publico_objetivo: Demografía, psicografía, hábitos y pain points\n"
                    "- restricciones: Lista de lo que NUNCA debe hacerse con esta marca\n"
                    "- uso_logo: Reglas de uso del logo (tamaño mínimo, espaciado, fondos permitidos)\n\n"
                    "Sé específico y detallado en cada sección. Esto será la fuente de verdad "
                    "para toda la generación de contenido de la marca.\n"
                    "Responde SOLO con el JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Producto: {product}\n"
                    f"Tono deseado: {tone}\n"
                    f"Público objetivo: {target_audience}\n"
                    f"{'Contexto adicional: ' + extra_context if extra_context else ''}"
                ),
            },
        ],
        temperature=0.7,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )

    structured = json.loads(response.choices[0].message.content)
    gen_span.end(output={"sections": list(structured.keys())})

    # Convertir el manual generado a texto plano para pasar por el pipeline de ingesta
    raw_text = "\n\n".join(
        f"## {key}\n{value}" for key, value in structured.items() if value
    )

    # Reutilizar el pipeline de ingesta (chunking + embeddings)
    result = await ingest_manual(brand_id, raw_text, pre_structured=structured)
    result["generated_manual"] = structured
    return result


# --- Modo B: Estructurar manual desde texto crudo ---

async def _structure_manual(raw_text: str, trace) -> dict:
    """
    Usa Groq (Llama 3) para leer el texto crudo del manual
    y organizarlo en secciones claras.

    Entrada:  "Nuestra marca usa colores vibrantes. El tono es amigable..."
    Salida:   {
                "tono_de_voz": "Amigable, cercano, usa tuteo...",
                "paleta_colores": "#FF5733, #33FF57...",
                "valores": "Innovación, cercanía...",
                ...
              }
    """
    span = trace.span(name="structure_manual")

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un experto en branding. Analiza el siguiente manual de marca "
                    "y devuelve un JSON con estas secciones: "
                    "tono_de_voz, paleta_colores, tipografia, valores_marca, "
                    "personalidad, publico_objetivo, restricciones, uso_logo. "
                    "Si alguna sección no existe en el texto, ponla como null. "
                    "Responde SOLO con el JSON, sin explicaciones."
                ),
            },
            {"role": "user", "content": raw_text},
        ],
        temperature=0.1,  # Baja temperatura = respuesta más precisa, menos creativa
        response_format={"type": "json_object"},
    )

    import json
    structured = json.loads(response.choices[0].message.content)
    span.end(output={"sections_found": list(structured.keys())})
    return structured


# --- Paso 2: Chunking (cortar en pedazos) ---

def _chunk_manual(structured: dict) -> list[dict]:
    """
    Toma el manual estructurado y lo corta en pedazos pequeños.

    ¿Por qué cortar?
        Si el manual tiene 20 páginas y alguien pregunta sobre "tono de voz",
        no queremos enviar las 20 páginas a la IA. Solo el pedazo relevante.

    ¿Cómo corta?
        - chunk_size=500: cada pedazo tiene máximo 500 caracteres
        - chunk_overlap=50: los pedazos se solapan un poco para no perder contexto
          Ejemplo: "...ser amigable. | El tono amigable se aplica..."
                                  ↑ overlap (se repite en ambos chunks)
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )

    chunks = []
    for section_name, section_content in structured.items():
        if section_content is None:
            continue

        # Convertir a string si no lo es
        text = str(section_content)

        # Cortar esta sección en pedazos
        section_chunks = splitter.split_text(text)

        for chunk_text in section_chunks:
            chunks.append({
                "text": chunk_text,
                "type": section_name,  # "tono_de_voz", "paleta_colores", etc.
            })

    return chunks


# --- Paso 3 y 4: Embeddings + Guardar ---

async def ingest_manual(brand_id: str, raw_text: str, pre_structured: dict | None = None) -> dict:
    """
    Pipeline completo: recibe texto crudo → lo estructura → lo corta →
    genera embeddings → guarda todo en Supabase.

    Este es el método que llama la ruta POST /api/brands/{id}/manual
    """
    # Crear trace en Langfuse (para monitoreo)
    trace = langfuse.trace(name="brand_dna_ingestion", metadata={"brand_id": brand_id})

    # Paso 1: Estructurar con IA (o usar el pre-estructurado si viene de generate_manual)
    structured = pre_structured or await _structure_manual(raw_text, trace)

    # Guardar el JSON estructurado en la tabla brand_manuals
    # Primero borrar si ya existe (para evitar conflicto de unique constraint)
    supabase.table("brand_manuals").delete().eq("brand_id", brand_id).execute()
    supabase.table("brand_manuals").insert({
        "brand_id": brand_id,
        "structured_json": structured,
        "version": 1,
    }).execute()

    # Paso 2: Cortar en chunks
    chunks = _chunk_manual(structured)

    if not chunks:
        trace.update(output={"error": "No se generaron chunks"})
        return {"chunks_stored": 0}

    # Paso 3: Generar embeddings para todos los chunks
    embed_span = trace.span(name="generate_embeddings", input={"count": len(chunks)})
    vectors = await embeddings.generate([c["text"] for c in chunks])
    embed_span.end()

    # Paso 4: Guardar en Supabase (texto + vector juntos)

    # Primero borrar embeddings anteriores de esta marca (si re-sube el manual)
    supabase.table("brand_embeddings").delete().eq("brand_id", brand_id).execute()

    # Insertar los nuevos
    rows = [
        {
            "brand_id": brand_id,
            "chunk_text": chunks[i]["text"],
            "chunk_type": chunks[i]["type"],
            "metadata": {"section": chunks[i]["type"]},
            "embedding": vectors[i],
        }
        for i in range(len(chunks))
    ]
    supabase.table("brand_embeddings").insert(rows).execute()

    trace.update(output={"chunks_stored": len(rows)})

    return {
        "chunks_stored": len(rows),
        "sections": list(structured.keys()),
        "structured_manual": structured,
    }


async def get_manual(brand_id: str) -> dict | None:
    """Retorna el manual estructurado de una marca."""
    result = (
        supabase.table("brand_manuals")
        .select("*")
        .eq("brand_id", brand_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def delete_manual(brand_id: str) -> None:
    """Elimina el manual y todos sus embeddings."""
    supabase.table("brand_embeddings").delete().eq("brand_id", brand_id).execute()
    supabase.table("brand_manuals").delete().eq("brand_id", brand_id).execute()
