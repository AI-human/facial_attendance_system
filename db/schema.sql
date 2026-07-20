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

create index if not exists attendance_session_idx on attendance (session_id, checked_at desc);
create index if not exists attendance_user_idx on attendance (user_id, checked_at desc);
