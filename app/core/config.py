"""
Configuración central de la aplicación.
Lee las variables de entorno desde .env y las expone como un objeto tipado.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ContentSuite"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Groq
    GROQ_API_KEY: str

    # Google AI Studio (Multimodal + Embeddings)
    GOOGLE_AI_API_KEY: str

    # Langfuse
    LANGFUSE_PUBLIC_KEY: str
    LANGFUSE_SECRET_KEY: str
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    model_config = {"env_file": ".env"}


# Instancia única que se importa en toda la app:
#   from app.core.config import settings
settings = Settings()
