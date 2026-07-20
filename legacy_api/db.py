import os

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None

SCHEMA = """
create table if not exists face_embeddings (
  user_id text primary key,
  embedding double precision[] not null check (array_length(embedding, 1) = 512),
  quality double precision not null check (quality >= 0 and quality <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance (
  id bigserial primary key,
  user_id text not null,
  session_id text not null,
  similarity double precision not null,
  spoof_score double precision not null,
  status text not null default 'present',
  checked_at timestamptz not null default now(),
  unique (user_id, session_id)
);
"""

def get_conn():
    url = os.environ.get("POSTGRES_URL")
    if not url or not psycopg:
        raise RuntimeError("POSTGRES_URL is not set or psycopg is missing")
    return psycopg.connect(url, row_factory=dict_row)

def init_db():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(SCHEMA)
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not initialize database on startup (ignore if running locally without Postgres): {e}")
