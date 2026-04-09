"""
Inicializacion de clientes externos.

Cada cliente se instancia una vez al arrancar la app y se importa donde se necesite:
    from app.core.clients import supabase, groq_client, gemini_model, langfuse
"""

from supabase import create_client, Client
from groq import Groq
import google.generativeai as genai
from langfuse import Langfuse

from app.core.config import settings

# Supabase (PostgreSQL + pgvector + Auth + Storage)
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY,
)

# Groq (Llama 3.3 70B - generacion de texto)
groq_client = Groq(api_key=settings.GROQ_API_KEY)

# Google AI Studio (Gemini 2.5 Flash - auditoria visual)
genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

# Langfuse (observabilidad y trazas)
langfuse = Langfuse(
    public_key=settings.LANGFUSE_PUBLIC_KEY,
    secret_key=settings.LANGFUSE_SECRET_KEY,
    host=settings.LANGFUSE_HOST,
)
