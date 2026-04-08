"""
Inicializa y expone los clientes externos (Supabase, Groq, Google AI, Langfuse).
Se importan donde se necesiten:
    from app.core.clients import supabase, groq_client, langfuse
"""

from supabase import create_client, Client
from groq import Groq
import google.generativeai as genai
from langfuse import Langfuse

from app.core.config import settings

# --- Supabase ---
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY,
)

# --- Groq (Llama 3) ---
groq_client = Groq(api_key=settings.GROQ_API_KEY)

# --- Google AI Studio (Gemini Vision) ---
genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.0-flash-lite")

# --- Langfuse ---
langfuse = Langfuse(
    public_key=settings.LANGFUSE_PUBLIC_KEY,
    secret_key=settings.LANGFUSE_SECRET_KEY,
    host=settings.LANGFUSE_HOST,
)
