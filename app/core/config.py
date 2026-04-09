"""
Configuracion central de la aplicacion.

Lee variables de entorno desde .env y las expone como un objeto tipado.
Uso:
    from app.core.config import settings
    print(settings.SUPABASE_URL)
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Variables de entorno requeridas por la aplicacion."""

    # App
    APP_NAME: str = "ContentSuite"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Supabase (base de datos + auth + storage)
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Groq (LLM: Llama 3.3 70B)
    GROQ_API_KEY: str

    # Google AI Studio (Embeddings + Gemini Vision)
    GOOGLE_AI_API_KEY: str

    # Langfuse (observabilidad)
    LANGFUSE_PUBLIC_KEY: str
    LANGFUSE_SECRET_KEY: str
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    model_config = {"env_file": ".env"}


settings = Settings()
