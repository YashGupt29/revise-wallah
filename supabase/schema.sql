-- ============================================================
-- Revise Wallah — Full DB Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable extensions
create extension if not exists "vector";    -- pgvector (name in Supabase is "vector")

-- ============================================================
-- USERS
-- ============================================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'student', 'pro')),
  minutes_remaining integer not null default 30,
  total_minutes_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PROCESSED VIDEOS (cache — shared across all users)
-- ============================================================
create table public.processed_videos (
  id uuid primary key default gen_random_uuid(),
  url_hash text not null unique,        -- SHA256 of normalized URL
  youtube_url text not null,
  title text,
  channel_name text,
  duration_seconds integer,
  language text default 'hinglish',     -- hindi / english / hinglish
  transcript text,
  notes_json jsonb,                     -- raw Gemini output (source of truth)
  notes_structured text,               -- parsed markdown
  notes_handwritten text,              -- parsed HTML
  flashcards_json jsonb default '[]',
  quiz_json jsonb default '[]',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_processed_videos_url_hash on public.processed_videos(url_hash);
create index idx_processed_videos_status on public.processed_videos(status);

alter table public.processed_videos enable row level security;

-- All authenticated users can read processed videos (it's shared cache)
create policy "Authenticated users can read processed videos"
  on public.processed_videos for select
  to authenticated
  using (true);

-- ============================================================
-- USER NOTES (user's personal library — links to cache)
-- ============================================================
create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  processed_video_id uuid not null references public.processed_videos(id) on delete cascade,
  custom_title text,
  annotations jsonb default '{}',      -- user's own edits/highlights
  is_starred boolean default false,
  created_at timestamptz not null default now(),
  unique(user_id, processed_video_id)
);

create index idx_user_notes_user_id on public.user_notes(user_id);

alter table public.user_notes enable row level security;

create policy "Users manage own notes"
  on public.user_notes for all
  using (auth.uid() = user_id);

-- ============================================================
-- ASYNC JOBS
-- ============================================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  youtube_url text not null,
  url_hash text not null,
  processed_video_id uuid references public.processed_videos(id),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  current_step text,                   -- extracting / transcribing / generating / parsing
  progress integer default 0,         -- 0-100
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_jobs_user_id on public.jobs(user_id);
create index idx_jobs_status on public.jobs(status);

alter table public.jobs enable row level security;

create policy "Users read own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "Users insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- EXPORTS (cached)
-- ============================================================
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  processed_video_id uuid not null references public.processed_videos(id) on delete cascade,
  type text not null check (type in ('pdf', 'gdoc')),
  storage_url text,
  gdoc_url text,
  created_at timestamptz not null default now(),
  unique(processed_video_id, type)
);

alter table public.exports enable row level security;

create policy "Authenticated users can read exports"
  on public.exports for select
  to authenticated
  using (true);

-- ============================================================
-- MINUTES LOG
-- ============================================================
create table public.minutes_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  delta integer not null,              -- positive = credit, negative = debit
  balance_after integer not null,
  reason text not null
    check (reason in ('signup_bonus', 'processed', 'cache_hit', 'booster', 'ad', 'subscription', 'export', 'ai_chat', 'refund')),
  processed_video_id uuid references public.processed_videos(id),
  created_at timestamptz not null default now()
);

create index idx_minutes_log_user_id on public.minutes_log(user_id);

alter table public.minutes_log enable row level security;

create policy "Users read own minutes log"
  on public.minutes_log for select
  using (auth.uid() = user_id);

-- ============================================================
-- CONCEPTS (graph seeds)
-- ============================================================
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  subject text,
  topic text,
  subtopic text,
  difficulty smallint,                 -- 1-10, null until calibrated
  exam_tags text[] default '{}',       -- ['JEE', 'NEET', 'GATE', 'UPSC']
  embedding vector(1536),             -- for semantic search (pgvector)
  created_at timestamptz not null default now()
);

create index idx_concepts_name on public.concepts(name);
create index idx_concepts_subject on public.concepts(subject);
-- Vector similarity index added later once data exists:
-- create index idx_concepts_embedding on public.concepts using ivfflat (embedding vector_cosine_ops);

alter table public.concepts enable row level security;

create policy "Authenticated users can read concepts"
  on public.concepts for select
  to authenticated
  using (true);

-- ============================================================
-- VIDEO CONCEPTS (which concepts appear in which video)
-- ============================================================
create table public.video_concepts (
  id uuid primary key default gen_random_uuid(),
  processed_video_id uuid not null references public.processed_videos(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  timestamp_start integer,            -- seconds into video
  timestamp_end integer,
  importance_score numeric(3,2) default 0.5,
  unique(processed_video_id, concept_id)
);

create index idx_video_concepts_video_id on public.video_concepts(processed_video_id);
create index idx_video_concepts_concept_id on public.video_concepts(concept_id);

alter table public.video_concepts enable row level security;

create policy "Authenticated users can read video_concepts"
  on public.video_concepts for select
  to authenticated
  using (true);

-- ============================================================
-- CONCEPT RELATIONSHIPS (graph edges)
-- ============================================================
create table public.concept_relationships (
  id uuid primary key default gen_random_uuid(),
  concept_a_id uuid not null references public.concepts(id) on delete cascade,
  concept_b_id uuid not null references public.concepts(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('prerequisite', 'similar', 'leads_to', 'confuses_with')),
  confidence numeric(3,2) default 0.5,
  source text default 'ai_extracted'
    check (source in ('ai_extracted', 'validated')),
  created_at timestamptz not null default now(),
  unique(concept_a_id, concept_b_id, relationship_type)
);

create index idx_concept_relationships_a on public.concept_relationships(concept_a_id);
create index idx_concept_relationships_b on public.concept_relationships(concept_b_id);

alter table public.concept_relationships enable row level security;

create policy "Authenticated users can read concept_relationships"
  on public.concept_relationships for select
  to authenticated
  using (true);

-- ============================================================
-- STUDENT CONCEPT MASTERY (current state per student)
-- ============================================================
create table public.student_concept_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  mastery_score numeric(4,3) default 0.0 check (mastery_score >= 0 and mastery_score <= 1),
  attempts integer default 0,
  correct_attempts integer default 0,
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, concept_id)
);

create index idx_mastery_user_id on public.student_concept_mastery(user_id);
create index idx_mastery_concept_id on public.student_concept_mastery(concept_id);

alter table public.student_concept_mastery enable row level security;

create policy "Users manage own mastery"
  on public.student_concept_mastery for all
  using (auth.uid() = user_id);

-- ============================================================
-- MASTERY EVENTS (every interaction — source of truth)
-- ============================================================
create table public.mastery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  processed_video_id uuid references public.processed_videos(id),
  event_type text not null
    check (event_type in ('quiz_attempt', 'flashcard_review', 'ai_chat')),
  score numeric(4,3),                  -- 0.0-1.0, null for flashcard flips
  time_spent_seconds integer,
  created_at timestamptz not null default now()
);

create index idx_mastery_events_user_id on public.mastery_events(user_id);
create index idx_mastery_events_concept_id on public.mastery_events(concept_id);

alter table public.mastery_events enable row level security;

create policy "Users manage own mastery events"
  on public.mastery_events for all
  using (auth.uid() = user_id);

-- ============================================================
-- Enable Realtime on jobs table (for live status updates)
-- ============================================================
alter publication supabase_realtime add table public.jobs;
