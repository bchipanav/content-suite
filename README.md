# Content Suite

Plataforma de IA para mantener la consistencia de marca en la generacion masiva de contenido.
Combina RAG multimodal, gobernanza de datos y observabilidad en tiempo real.

## Arquitectura

```
Frontend (Next.js 15)  -->  Backend (FastAPI)  -->  Supabase (PostgreSQL + pgvector)
                                               -->  Groq (Llama 3.3 70B)
                                               -->  Google AI Studio (Gemini)
                                               -->  Langfuse (Observabilidad)
```

## Modulos

### Modulo I: Brand DNA Architect

El usuario ingresa parametros (producto, tono, publico objetivo) y la IA genera un **Manual de Marca
Estructurado** con secciones como tono de voz, paleta de colores, tipografia, valores y restricciones.
El manual se almacena como embeddings en pgvector para consulta semantica por los demas modulos.

**Flujo:**
1. Usuario ingresa parametros cortos (o pega texto de un manual existente)
2. Groq (Llama 3.3 70B) genera el manual completo en JSON estructurado
3. Se aplica chunking (500 chars, 50 overlap) con `RecursiveCharacterTextSplitter`
4. Se generan embeddings con Google AI (`gemini-embedding-001`, 768 dims)
5. Chunks + vectores se guardan en Supabase (pgvector con indice HNSW)

### Modulo II: Creative Engine

Permite crear **descripciones de producto**, **guiones de video** y **prompts de imagen**.
Antes de generar, el sistema realiza una consulta RAG al manual de marca para asegurar
que el contenido respete las directrices.

**Pipeline RAG:**
1. **Retrieve:** Busqueda semantica en pgvector (cosine similarity, threshold 0.3, top 5)
2. **Build:** Construccion del prompt con contexto de marca + instrucciones por formato
3. **Generate:** Groq (Llama 3.3 70B, temp 0.7, max 2000 tokens)
4. **Save:** Borrador guardado con status `pending_review`

### Modulo III: Governance & Multimodal Audit

- **Flujo de aprobacion:** `pending_review` --> `approved` / `rejected`
- **Auditoria visual:** El Aprobador B sube una imagen y Gemini Vision la contrasta contra
  las reglas visuales del manual (colores, tipografia, logo, estilo). Devuelve un score de
  compliance (0-100) y una lista de problemas encontrados.
- **Audit log:** Cada decision queda registrada con reviewer, comentarios y timestamp.

### Modulo IV: Observabilidad (Langfuse)

Trazabilidad completa de cada operacion de IA:

| Trace | Que registra |
|-------|-------------|
| `brand_dna_generation` | Generacion de manual desde parametros |
| `brand_dna_ingestion` | Chunking + generacion de embeddings |
| `retrieval_search` | Query, chunks encontrados, similitud maxima |
| `content_generation` | Pipeline RAG completo: contexto + prompt + respuesta |
| `validate_text` | Validacion de compliance con score |
| `validate_image` | Auditoria visual con Gemini Vision |
| `{METHOD} {PATH}` | Latencia y status code de cada request HTTP |

## Roles y Credenciales de Prueba

| Rol | Permisos | Email | Password |
|-----|----------|-------|----------|
| **Creator** | Crear marcas, generar manual, generar contenido | `cs.creator@gmail.com` | `Creator123!` |
| **Approver A** (Brand Manager) | Aprobar/rechazar contenido | `cs.approvera@gmail.com` | `ApproverA123!` |
| **Approver B** (Director) | Aprobar/rechazar + auditoria de imagen | `cs.approverb@gmail.com` | `ApproverB123!` |

### Matriz de permisos (RBAC)

| Permiso | Creator | Approver A | Approver B |
|---------|---------|------------|------------|
| `brand.create` | Si | Si | Si |
| `brand.read` | Si | Si | Si |
| `manual.upload` | Si | Si | Si |
| `manual.read` | Si | Si | Si |
| `content.generate` | Si | - | - |
| `content.read` | Si | Si | Si |
| `content.edit` | Si | - | - |
| `governance.approve` | - | Si | Si |
| `governance.validate` | - | - | Si |

## Stack Tecnologico

| Componente | Tecnologia | Proposito |
|-----------|-----------|-----------|
| Backend | FastAPI (Python 3.12) | API REST, pipeline RAG, RBAC |
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 | UI diferenciada por rol |
| Base de datos | Supabase (PostgreSQL + pgvector) | Datos, embeddings, auth, storage |
| LLM | Groq (Llama 3.3 70B) | Generacion de texto y manuales |
| Embeddings | Google AI (gemini-embedding-001) | Vectorizacion de texto (768 dims) |
| Multimodal | Google AI (Gemini 2.5 Flash) | Auditoria visual de imagenes |
| Observabilidad | Langfuse | Trazas, scores, metricas |
| Estado (frontend) | Zustand | Estado global del cliente |

## Estructura del Proyecto

```
content-suite/
|-- app/                          # Backend (FastAPI)
|   |-- main.py                   # Punto de entrada + middleware + routers
|   |-- core/
|   |   |-- config.py             # Variables de entorno (pydantic-settings)
|   |   +-- clients.py            # Clientes: Supabase, Groq, Gemini, Langfuse
|   |-- api/routes/
|   |   |-- auth.py               # POST /register, /login, GET /me
|   |   |-- brands.py             # CRUD marcas + manual (genera/sube/consulta)
|   |   |-- content.py            # Generacion RAG + CRUD borradores
|   |   +-- governance.py         # Validacion texto/imagen + aprobacion + audit log
|   |-- services/
|   |   |-- brand_dna.py          # Genera manual -> chunks -> embeddings
|   |   |-- embeddings.py         # Google AI embeddings (768 dims, Matryoshka)
|   |   |-- retrieval.py          # Busqueda semantica en pgvector
|   |   |-- creative_engine.py    # Pipeline RAG: retrieve + build + generate + save
|   |   +-- governance.py         # Validacion texto/imagen + review workflow
|   |-- middleware/
|   |   |-- rbac.py               # Control de acceso por roles (3 roles, 9 permisos)
|   |   +-- langfuse_trace.py     # Traza automatica por request
|   |-- schemas/                  # Validacion Pydantic (request/response)
|   +-- db/
|       +-- supabase_setup.sql    # DDL: tablas, pgvector, indices, RLS, funciones RPC
|-- frontend/                     # Frontend (Next.js 15)
|   +-- src/
|       |-- app/                  # Paginas: login, dashboard, brand-manual,
|       |                         #   generate, approvals, image-audit
|       |-- components/
|       |   |-- layout/           # AppShell, AuthGuard, Sidebar
|       |   +-- ui/               # StatusBadge, ScoreBar
|       |-- lib/
|       |   |-- api.ts            # Cliente HTTP hacia FastAPI
|       |   +-- store.ts          # Estado global (Zustand)
|       +-- types/                # Interfaces TypeScript
|-- scripts/
|   +-- seed_users.py             # Crea los 3 usuarios de prueba
|-- requirements.txt              # Dependencias Python
|-- render.yaml                   # Deploy en Render.com (backend + frontend)
+-- .env.example                  # Template de variables de entorno
```

## Endpoints de la API

### Autenticacion (`/api/auth`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta + perfil con rol |
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/auth/me` | Perfil del usuario autenticado |

### Marcas (`/api/brands`)

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| POST | `/api/brands/` | `brand.create` | Crear marca |
| GET | `/api/brands/` | `brand.read` | Listar marcas |
| GET | `/api/brands/{id}` | `brand.read` | Detalle de marca |
| POST | `/api/brands/{id}/manual/generate` | `manual.upload` | Generar manual con IA |
| GET | `/api/brands/{id}/manual` | `manual.read` | Obtener manual (JSON) |
| POST | `/api/brands/{id}/manual/query` | `manual.read` | Busqueda semantica |

### Contenido (`/api/content`)

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| POST | `/api/content/generate` | `content.generate` | Generar contenido (RAG) |
| GET | `/api/content/drafts` | `content.read` | Listar borradores |
| GET | `/api/content/drafts/{id}` | `content.read` | Detalle de borrador |
| PUT | `/api/content/drafts/{id}` | `content.edit` | Editar borrador |
| DELETE | `/api/content/drafts/{id}` | `content.edit` | Eliminar borrador |

### Gobernanza (`/api/governance`)

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| POST | `/api/governance/validate` | `governance.validate` | Validar texto vs manual |
| POST | `/api/governance/validate-image/upload` | `governance.validate` | Validar imagen (file upload) |
| POST | `/api/governance/drafts/{id}/review` | `governance.approve` | Aprobar/rechazar borrador |
| GET | `/api/governance/audit-log` | `governance.validate` | Historial de auditoria |

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
source .venv/bin/activate    # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Base de datos (Supabase)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `app/db/supabase_setup.sql`
3. Copiar URL y keys al `.env`
4. En **Authentication > Providers > Email**: desactivar "Confirm email"
5. En **Storage**: crear bucket publico `brand-images`

### 4. Seed de usuarios

```bash
python scripts/seed_users.py
```

### 5. Ejecutar backend

```bash
uvicorn app.main:app --reload
# API:  http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 6. Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:3000
```

## URLs de Produccion

| Servicio | URL |
|----------|-----|
| Frontend | https://content-suite-app.onrender.com |
| Backend API | https://content-suite-mk05.onrender.com |
| Swagger Docs | https://content-suite-mk05.onrender.com/docs |

## Deploy (Render - monorepo)

El proyecto se despliega completo en Render desde un solo repositorio
usando `render.yaml` (Infrastructure as Code).

1. Conectar el repo en [render.com](https://render.com)
2. Render detecta `render.yaml` y crea 2 servicios automaticamente:
   - **content-suite-api** (Python): Backend FastAPI
   - **content-suite-app** (Node): Frontend Next.js
3. Configurar las variables de entorno en cada servicio:
   - Backend: copiar las keys del `.env`
   - Frontend: `NEXT_PUBLIC_API_URL` = `https://content-suite-mk05.onrender.com`

## Decisiones Tecnicas

| Decision | Justificacion |
|----------|--------------|
| Embeddings truncados a 768 dims | pgvector en Supabase no soporta indices >2000 dims. Matryoshka preserva 95%+ de la info semantica en las primeras 768 dims |
| Groq en vez de OpenAI | Latencia ~10x menor por inference en hardware dedicado (LPU). Modelo Llama 3.3 70B es competitivo con GPT-4 |
| Gemini Vision para auditoria | Unico modelo multimodal gratuito con calidad suficiente para analisis visual de marca |
| Chunking 500/50 overlap | Balance entre granularidad (chunks pequenos = resultados precisos) y contexto (overlap evita cortar ideas a la mitad) |
| Threshold 0.3 en retrieval | Valor bajo para no perder chunks relevantes. Mejor traer de mas y dejar que el LLM filtre |
| Temperatura 0.7 en generacion | Balance entre creatividad y consistencia con la marca |
| Temperatura 0.1 en validacion | Respuestas precisas y deterministicas para auditorias |

## Limitaciones

- La cuota gratuita de Google AI tiene limites diarios de requests
- Los embeddings se truncan a 768 dimensiones (pgvector no soporta >2000 en indices)
- El flujo de aprobacion es sincrono (sin notificaciones en tiempo real)
- Las imagenes no se persisten en storage (solo se analizan en memoria)
