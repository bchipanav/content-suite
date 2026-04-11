"""
Servicio Brand DNA Architect (Modulo I).

Responsable de procesar manuales de marca: generar con IA, hacer chunking,
generar embeddings y guardar en Supabase.

Fase 1 del RAG - Preparacion de datos:
    Parametros del usuario --> IA genera manual --> Chunks --> Embeddings --> Guardar
"""

import json

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.clients import supabase, groq_client, langfuse
from app.services import embeddings


# ---------------------------------------------------------------------------
# Modo A: Generar manual completo desde parametros
# ---------------------------------------------------------------------------

async def generate_manual(
    brand_id: str,
    product: str,
    tone: str,
    target_audience: str,
    extra_context: str = "",
) -> dict:
    """
    El usuario ingresa parametros cortos y la IA genera un manual de marca completo.

    Flujo:
        1. Groq genera JSON estructurado con 8 secciones
        2. Se convierte a texto plano
        3. Se pasa por el pipeline de ingesta (chunking + embeddings)
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
                    "A partir de los parametros del usuario, genera un Manual de Marca "
                    "completo y profesional en formato JSON con EXACTAMENTE estas claves:\n\n"
                    "- tono_de_voz: Descripcion detallada del tono, con ejemplos de frases que SI usar y que NO usar\n"
                    "- paleta_colores: Colores primarios y secundarios con codigos HEX y su justificacion\n"
                    "- tipografia: Fuentes para titulos y cuerpo, con razon de la eleccion\n"
                    "- valores_marca: 4-6 valores con descripcion de cada uno\n"
                    "- personalidad: Arquetipos y rasgos de personalidad de la marca\n"
                    "- publico_objetivo: Demografia, psicografia, habitos y pain points\n"
                    "- restricciones: Lista de lo que NUNCA debe hacerse con esta marca\n"
                    "- uso_logo: Reglas de uso del logo (tamano minimo, espaciado, fondos permitidos)\n\n"
                    "Se especifico y detallado en cada seccion. Esto sera la fuente de verdad "
                    "para toda la generacion de contenido de la marca.\n"
                    "Responde SOLO con el JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Producto: {product}\n"
                    f"Tono deseado: {tone}\n"
                    f"Publico objetivo: {target_audience}\n"
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

    # Convertir a texto plano para el pipeline de ingesta
    raw_text = "\n\n".join(
        f"## {key}\n{value}" for key, value in structured.items() if value
    )

    result = await ingest_manual(brand_id, structured)
    result["generated_manual"] = structured
    return result


# ---------------------------------------------------------------------------
# Chunking: dividir el manual en fragmentos para busqueda semantica
# ---------------------------------------------------------------------------

def _chunk_manual(structured: dict) -> list[dict]:
    """
    Divide el manual estructurado en chunks de 500 caracteres con 50 de overlap.

    El overlap evita que se corten ideas a la mitad entre chunks contiguos.
    Cada chunk conserva metadata de su seccion de origen.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )

    chunks = []
    for section_name, section_content in structured.items():
        if section_content is None:
            continue

        text = str(section_content)
        section_chunks = splitter.split_text(text)

        for chunk_text in section_chunks:
            chunks.append({
                "text": chunk_text,
                "type": section_name,
            })

    return chunks


# ---------------------------------------------------------------------------
# Pipeline de ingesta: estructura + chunks + embeddings + guardar
# ---------------------------------------------------------------------------

async def ingest_manual(brand_id: str, structured: dict) -> dict:
    """
    Pipeline de ingesta de un manual de marca ya estructurado.

    Pasos:
        1. Guardar JSON estructurado en brand_manuals
        2. Dividir en chunks
        3. Generar embeddings (Google AI, 768 dims)
        4. Guardar chunks + vectores en brand_embeddings
    """
    trace = langfuse.trace(name="brand_dna_ingestion", metadata={"brand_id": brand_id})

    # Paso 2: Guardar JSON (reemplaza version anterior)
    supabase.table("brand_manuals").delete().eq("brand_id", brand_id).execute()
    supabase.table("brand_manuals").insert({
        "brand_id": brand_id,
        "structured_json": structured,
        "version": 1,
    }).execute()

    # Paso 3: Chunking
    chunks = _chunk_manual(structured)
    if not chunks:
        trace.update(output={"error": "No se generaron chunks"})
        return {"chunks_stored": 0}

    # Paso 4: Embeddings
    embed_span = trace.span(name="generate_embeddings", input={"count": len(chunks)})
    vectors = await embeddings.generate([c["text"] for c in chunks])
    embed_span.end()

    # Paso 5: Guardar en Supabase (reemplaza embeddings anteriores)
    supabase.table("brand_embeddings").delete().eq("brand_id", brand_id).execute()

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


# ---------------------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------------------

async def get_manual(brand_id: str) -> dict | None:
    """Retorna el manual estructurado mas reciente de una marca."""
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
    """Elimina el manual y todos sus embeddings de una marca."""
    supabase.table("brand_embeddings").delete().eq("brand_id", brand_id).execute()
    supabase.table("brand_manuals").delete().eq("brand_id", brand_id).execute()
