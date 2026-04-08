"""
Servicio Governance & Multimodal Audit.
Validación de contenido contra el manual de marca (texto e imágenes).

Flujo:
    Contenido generado → Validación automática → Revisión humana → Aprobado/Rechazado
"""

import json

from app.core.clients import supabase, groq_client, gemini_model, langfuse
from app.services import retrieval


async def validate_text(brand_id: str, text: str) -> dict:
    """
    Valida si un texto cumple con el manual de marca.
    Usa Groq para comparar el texto contra las directrices recuperadas por RAG.
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
                    "Responde SOLO con un JSON así:\n"
                    '{"compliant": true/false, "score": 0-100, '
                    '"issues": ["problema 1", "problema 2"]}\n'
                    "Si cumple todo, issues debe ser una lista vacía."
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


async def validate_image_from_bytes(brand_id: str, image_bytes: bytes, content_type: str) -> dict:
    """
    Valida una imagen (bytes) contra las reglas visuales del manual.
    Acepta los bytes directamente — usado por el endpoint de file upload.
    """
    trace = langfuse.trace(name="validate_image", metadata={"brand_id": brand_id})

    # Recuperar reglas visuales del manual vía RAG
    visual_chunks = await retrieval.search(brand_id, "colores logo tipografía estilo visual paleta")
    visual_rules = "\n---\n".join([c["chunk_text"] for c in visual_chunks])

    # Enviar a Gemini Vision: imagen + reglas de marca
    response = gemini_model.generate_content([
        (
            f"Eres un auditor visual de marca. Analiza esta imagen y determina "
            f"si cumple con estas reglas de marca:\n\n{visual_rules}\n\n"
            f"Responde SOLO con un JSON así:\n"
            f'{{"compliant": true/false, "score": 0-100, '
            f'"issues": ["problema 1", "problema 2"]}}\n'
            f"Revisa: colores, tipografía, uso de logo, estilo general. "
            f"Si cumple todo, issues debe ser una lista vacía."
        ),
        {"mime_type": content_type, "data": image_bytes},
    ])

    result = json.loads(response.text)
    trace.update(output=result)
    trace.score(name="visual_compliance", value=result["score"] / 100)
    return result


async def validate_image_from_url(brand_id: str, image_url: str) -> dict:
    """
    Valida una imagen por URL — descarga los bytes y delega a validate_image_from_bytes.
    """
    import httpx
    async with httpx.AsyncClient() as client:
        img_response = await client.get(image_url)
        img_response.raise_for_status()
        image_bytes = img_response.content
        content_type = img_response.headers.get("content-type", "image/png")

    return await validate_image_from_bytes(brand_id, image_bytes, content_type)


async def upload_image_to_storage(brand_id: str, filename: str, file_bytes: bytes, content_type: str) -> str:
    """
    Sube una imagen a Supabase Storage y retorna la URL pública.
    """
    path = f"audits/{brand_id}/{filename}"
    supabase.storage.from_("brand-images").upload(
        path,
        file_bytes,
        {"content-type": content_type},
    )
    url = supabase.storage.from_("brand-images").get_public_url(path)
    return url


async def review_draft(draft_id: str, action: str, reviewer_id: str, comments: str | None = None) -> dict:
    """
    Registra la decisión de un revisor sobre un borrador.
    Cambia el status del draft y crea un registro en audit_log.
    """
    supabase.table("content_drafts").update({"status": action}).eq("id", draft_id).execute()

    log_entry = {
        "draft_id": draft_id,
        "action": action,
        "reviewer_id": reviewer_id,
        "comments": comments,
    }
    supabase.table("audit_log").insert(log_entry).execute()

    return {"draft_id": draft_id, "new_status": action, "reviewer_id": reviewer_id}
