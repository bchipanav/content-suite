"""
Servicio Governance & Multimodal Audit (Modulo III).

Funcionalidades:
    - Validacion de texto contra el manual de marca (Groq)
    - Validacion visual de imagenes contra reglas de marca (Gemini Vision)
    - Flujo de aprobacion con registro en audit_log

Flujo:
    Contenido generado --> Validacion --> Revision humana --> Aprobado/Rechazado
"""

import json

from app.core.clients import supabase, groq_client, gemini_model, langfuse
from app.services import retrieval


# ---------------------------------------------------------------------------
# Validacion de texto
# ---------------------------------------------------------------------------

async def validate_text(brand_id: str, text: str) -> dict:
    """
    Valida si un texto cumple con el manual de marca.

    Usa RAG para recuperar directrices relevantes y Groq para evaluar compliance.
    Retorna: {compliant: bool, score: 0-100, issues: []}
    """
    trace = langfuse.trace(name="validate_text", metadata={"brand_id": brand_id})

    context_chunks = await retrieval.search(brand_id, text)
    context = "\n---\n".join([c["chunk_text"] for c in context_chunks])

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un auditor de marca. Analiza si el contenido cumple "
                    "con las directrices de marca proporcionadas.\n\n"
                    f"DIRECTRICES DE MARCA:\n{context}\n\n"
                    "Responde SOLO con un JSON asi:\n"
                    '{"compliant": true/false, "score": 0-100, '
                    '"issues": ["problema 1", "problema 2"]}\n'
                    "Si cumple todo, issues debe ser una lista vacia."
                ),
            },
            {"role": "user", "content": f"Analiza este contenido:\n\n{text}"},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    trace.update(output=result)
    trace.score(name="compliance", value=result["score"] / 100)
    return result


# ---------------------------------------------------------------------------
# Validacion de imagen (multimodal)
# ---------------------------------------------------------------------------

async def validate_image_from_bytes(
    brand_id: str,
    image_bytes: bytes,
    content_type: str,
) -> dict:
    """
    Valida una imagen contra las reglas visuales del manual usando Gemini Vision.

    Analiza: colores, tipografia, uso de logo, estilo general.
    Retorna: {compliant: bool, score: 0-100, issues: []}
    """
    trace = langfuse.trace(name="validate_image", metadata={"brand_id": brand_id})

    # Recuperar reglas visuales del manual via RAG
    visual_chunks = await retrieval.search(
        brand_id, "colores logo tipografia estilo visual paleta"
    )
    visual_rules = "\n---\n".join([c["chunk_text"] for c in visual_chunks])

    # Enviar imagen + reglas a Gemini Vision
    response = gemini_model.generate_content([
        (
            f"Eres un auditor visual de marca. Analiza esta imagen y determina "
            f"si cumple con estas reglas de marca:\n\n{visual_rules}\n\n"
            f"Responde SOLO con un JSON asi:\n"
            f'{{"compliant": true/false, "score": 0-100, '
            f'"issues": ["problema 1", "problema 2"]}}\n'
            f"Revisa: colores, tipografia, uso de logo, estilo general. "
            f"Si cumple todo, issues debe ser una lista vacia."
        ),
        {"mime_type": content_type, "data": image_bytes},
    ])

    raw_text = (response.text or "").strip()

    # Gemini puede bloquear la respuesta por safety filters
    if not raw_text:
        block_reason = None
        if response.candidates:
            block_reason = getattr(response.candidates[0], "finish_reason", None)
        return {
            "compliant": False,
            "score": 0,
            "issues": [
                f"No se pudo analizar la imagen (respuesta vacia de Gemini, razon: {block_reason})"
            ],
        }

    # Limpiar posible bloque ```json ... ``` que Gemini a veces agrega
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`").removeprefix("json").strip()

    result = json.loads(raw_text)
    trace.update(output=result)
    trace.score(name="visual_compliance", value=result["score"] / 100)
    return result


# ---------------------------------------------------------------------------
# Flujo de aprobacion
# ---------------------------------------------------------------------------

async def review_draft(
    draft_id: str,
    action: str,
    reviewer_id: str,
    comments: str | None = None,
) -> dict:
    """
    Registra la decision de un revisor sobre un borrador.

    Actualiza el status del draft y crea un registro en audit_log
    para trazabilidad completa.
    """
    # Actualizar status del borrador
    supabase.table("content_drafts").update({"status": action}).eq("id", draft_id).execute()

    # Registrar en audit log
    supabase.table("audit_log").insert({
        "draft_id": draft_id,
        "action": action,
        "reviewer_id": reviewer_id,
        "comments": comments,
    }).execute()

    return {"draft_id": draft_id, "new_status": action, "reviewer_id": reviewer_id}
