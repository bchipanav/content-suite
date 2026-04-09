-- ============================================
-- Content Suite - Setup de Base de Datos
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================

-- 1. Habilitar pgvector
create extension if not exists vector;

-- 2. Tabla de marcas
create table brands (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    description text,
    created_by  uuid references auth.users(id),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

-- 3. Manuales de marca (JSON estructurado)
create table brand_manuals (
    id                uuid primary key default gen_random_uuid(),
    brand_id          uuid references brands(id) on delete cascade,
    structured_json   jsonb not null default '{}',
    original_file_url text,
    version           int default 1,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now(),

    unique(brand_id, version)
);

-- 4. Embeddings del manual (pgvector)
create table brand_embeddings (
    id          uuid primary key default gen_random_uuid(),
    brand_id    uuid references brands(id) on delete cascade,
    chunk_text  text not null,
    chunk_type  text not null,
    metadata    jsonb default '{}',
    embedding   vector(768) not null,
    created_at  timestamptz default now()
);

-- Índice para búsqueda por similitud
create index on brand_embeddings
    using hnsw (embedding vector_cosine_ops);

-- 5. Borradores de contenido
create table content_drafts (
    id          uuid primary key default gen_random_uuid(),
    brand_id    uuid references brands(id) on delete cascade,
    prompt      text not null,
    result      text,
    content_type text,
    status      text not null default 'pending_review'
                check (status in ('pending_review', 'approved', 'rejected')),
    created_by  uuid references auth.users(id),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

-- 6. Perfiles de usuario con roles (3 roles del reto)
create table user_profiles (
    id         uuid primary key references auth.users(id),
    full_name  text,
    role       text not null default 'creator'
               check (role in ('creator', 'approver_a', 'approver_b')),
    brand_ids  uuid[] default '{}',
    created_at timestamptz default now()
);

-- 7. Log de auditoría
create table audit_log (
    id               uuid primary key default gen_random_uuid(),
    draft_id         uuid references content_drafts(id) on delete cascade,
    action           text not null
                     check (action in ('approved', 'rejected')),
    reviewer_id      uuid references auth.users(id),
    comments         text,
    compliance_score float,
    created_at       timestamptz default now()
);

-- 8. Función RPC para búsqueda semántica (usada por el RAG)
create or replace function match_brand_embeddings(
    query_embedding  vector(768),
    match_brand_id   uuid,
    match_threshold  float default 0.7,
    match_count      int default 5
)
returns table (
    id          uuid,
    chunk_text  text,
    chunk_type  text,
    metadata    jsonb,
    similarity  float
)
language sql stable
as $$
    select
        id,
        chunk_text,
        chunk_type,
        metadata,
        1 - (embedding <=> query_embedding) as similarity
    from brand_embeddings
    where brand_id = match_brand_id
      and 1 - (embedding <=> query_embedding) > match_threshold
    order by embedding <=> query_embedding
    limit match_count;
$$;

-- 9. Row Level Security (RLS)
-- Nota: usando service_key en el backend se bypasea RLS.
-- Estas policies aplican si el frontend conecta directo a Supabase.
alter table brands enable row level security;
alter table content_drafts enable row level security;
alter table brand_manuals enable row level security;
alter table brand_embeddings enable row level security;
alter table user_profiles enable row level security;
alter table audit_log enable row level security;

-- Permitir acceso via service_key (backend)
create policy "Service key full access" on brands for all using (true);
create policy "Service key full access" on content_drafts for all using (true);
create policy "Service key full access" on brand_manuals for all using (true);
create policy "Service key full access" on brand_embeddings for all using (true);
create policy "Service key full access" on user_profiles for all using (true);
create policy "Service key full access" on audit_log for all using (true);
