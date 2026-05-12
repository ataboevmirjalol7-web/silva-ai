-- Reference transcript for listening dictation (Supabase `listening_tasks`).
-- Dashboard: `listeningDictationPanel.mjs` reads `transcript` (fallback: reference_transcript, official_transcript).

alter table if exists public.listening_tasks
  add column if not exists transcript text;

comment on column public.listening_tasks.transcript is 'Official dictation transcript for word-level compare (Day N).';
