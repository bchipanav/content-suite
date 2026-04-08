# Content Suite

Plataforma de IA para mantener la consistencia de marca en la generación masiva de contenido. Usa RAG multimodal, gobernanza de datos y observabilidad en tiempo real.

## Arquitectura

```
Frontend (Next.js)  →  Backend (FastAPI)  →  Supabase (pgvector)
                                          →  Groq (Llama 3)
                                          →  Google AI Studio (Gemini)
                                          →  Langfuse (Observabilidad)
```

## Módulos

### Módulo I: Brand DNA Architect
El usuario ingresa parámetros (producto, tono, público objetivo) y la IA genera un Manual de Marca Estructurado con secciones como tono de voz, paleta de colores, tipografía, valores y restricciones. Este manual se guarda como embeddings en una base de datos vectorial (pgvector) para que los siguientes módulos lo consulten automáticamente.

### Módulo II: Creative Engine
Permite generar contenido (posts, artículos, guiones de video, prompts de imagen, descripciones de producto). El sistema realiza una consulta RAG al manual de marca antes de generar cualquier texto, asegurando que el contenido respete las directrices de la marca.

### Módulo III: Governance & Multimodal Audit
- **Flujo de aprobación:** Pendiente → Aprobado / Rechazado.
- **Auditoría multimodal:** El Aprobador B puede subir una imagen. El sistema usa Gemini Vision para contrastarla contra el manual de marca y devuelve un check verde si cumple o una explicación de por qué falla.

### Módulo IV: Observabilidad
Integración con Langfuse para trazabilidad completa: qué contexto se recuperó del RAG, qué prompt se envió al LLM, y cuánto tiempo tomó cada operación.

## Roles y Credenciales

| Rol | Puede hacer | Credenciales |
|-----|------------|-------------|
| **Creator** | Crear marcas, generar manual, generar contenido | `cs.creator@gmail.com` / `Creator123!` |
| **Approver A** | Aprobar o rechazar contenido | `cs.approvera@gmail.com` / `ApproverA123!` |
| **Approver B** | Aprobar o rechazar contenido + auditoría de imagen | `cs.approverb@gmail.com` / `ApproverB123!` |

## Stack Tecnológico

| Componente | Tecnología | Propósito |
|-----------|-----------|-----------|
| Backend | FastAPI | API REST, lógica RAG, RBAC |
| Frontend | Next.js 15 + Tailwind CSS | Interfaces diferenciadas por rol |
| Base de datos | Supabase (PostgreSQL + pgvector) | Datos relacionales, embeddings, auth |
| LLM | Groq (Llama 3.3 70B) | Generación de texto y manuales |
| Embeddings | Google AI (gemini-embedding-001) | Vectorización de texto para RAG |
| Multimodal | Google AI Studio (Gemini Vision) | Auditoría visual de imágenes |
| Observabilidad | Langfuse | Trazas, scores, métricas |

## Estructura del Proyecto

```
content-suite/
├── app/                          # Backend (FastAPI)
│   ├── main.py                   # Punto de entrada
│   ├── core/
│   │   ├── config.py             # Variables de entorno
│   │   └── clients.py            # Clientes: Supabase, Groq, Gemini, Langfuse
│   ├── api/routes/
│   │   ├── auth.py               # Login, register, perfil
│   │   ├── brands.py             # CRUD marcas + manual (genera/sube)
│   │   ├── content.py            # Generación RAG + borradores
│   │   └── governance.py         # Validación + aprobación + auditoría imagen
│   ├── services/
│   │   ├── brand_dna.py          # Genera manual → chunks → embeddings
│   │   ├── embeddings.py         # Google AI embeddings (768 dim)
│   │   ├── retrieval.py          # Búsqueda semántica en pgvector
│   │   ├── creative_engine.py    # Pipeline RAG completo
│   │   └── governance.py         # Validación texto/imagen + workflow
│   ├── middleware/
│   │   ├── rbac.py               # Control de acceso por roles
│   │   └── langfuse_trace.py     # Trazabilidad automática
│   ├── schemas/                  # Validación de request/response
│   └── db/
│       └── supabase_setup.sql    # Tablas + pgvector + funciones RPC
├── frontend/                     # Frontend (Next.js)
│   └── src/
│       ├── app/                  # Páginas (login, dashboard, brand-manual,
│       │                         #   generate, approvals, image-audit)
│       ├── components/           # Componentes reutilizables
│       ├── lib/
│       │   ├── api.ts            # Cliente API
│       │   └── store.ts          # Estado global (Zustand)
│       └── types/                # TypeScript types
├── scripts/
│   └── seed_users.py             # Crea los 3 usuarios de prueba
├── Dockerfile                    # Deploy del backend
├── render.yaml                   # Config deploy en Render
├── requirements.txt              # Dependencias Python
└── .env.example                  # Template de variables de entorno
```

## URLs

| Recurso | URL |
|---------|-----|
| Frontend | `[pendiente deploy]` |
| Backend API | `[pendiente deploy]` |
| Swagger Docs | `[pendiente deploy]/docs` |
| Langfuse | https://us.cloud.langfuse.com/project/cmnq73glw006jad0705f9xv0d |

## Setup Local

### 1. Clonar y configurar
```bash
git clone <repo-url>
cd content-suite
cp .env.example .env
# Rellenar las API keys en .env
```

### 2. Backend
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Base de datos
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a SQL Editor → ejecutar `app/db/supabase_setup.sql`
3. Copiar URL y keys al `.env`
4. En Authentication → Providers → Email → desactivar "Confirm email"
5. En Storage → crear bucket público `brand-images`

### 4. Seed de usuarios
```bash
python scripts/seed_users.py
```

### 5. Ejecutar backend
```bash
uvicorn app.main:app --reload
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### 6. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Deploy

### Backend (Render)
1. Conectar repo en [render.com](https://render.com)
2. Usar `render.yaml` o configurar:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Agregar variables de entorno del `.env`

### Frontend (Vercel)
1. Conectar repo en [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Variable: `NEXT_PUBLIC_API_URL` = URL del backend en Render

## Observabilidad (Langfuse)

Cada operación de IA queda trazada:

| Trace | Qué registra |
|-------|-------------|
| `brand_dna_generation` | Generación de manual desde parámetros |
| `brand_dna_ingestion` | Chunking + embeddings del manual |
| `retrieval_search` | Búsqueda semántica: query, chunks encontrados, similitud |
| `content_generation` | Pipeline RAG: contexto recuperado, prompt enviado, respuesta |
| `validate_text` | Validación de compliance con score |
| `validate_image` | Auditoría visual con Gemini Vision |

## Limitaciones

- La cuota gratuita de Google AI tiene límites diarios de requests
- Los embeddings se truncan a 768 dimensiones (pgvector no soporta >2000 en índices)
- El flujo de aprobación es síncrono (sin notificaciones en tiempo real)
