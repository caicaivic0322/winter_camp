create table if not exists public.app_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.app_state is 'Application runtime state for cpp-training-camp';
comment on column public.app_state.key is 'Logical dataset key such as users, exams, questions, wrong_book, attempts';
comment on column public.app_state.value is 'Serialized JSON payload for the dataset';
