-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================
-- Table: habits
-- ============================================
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(40) not null,
  description varchar(80) not null default '',
  icon varchar(30) not null,
  color varchar(20) not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_habits_user_active_pos on public.habits(user_id, is_active, position);

-- ============================================
-- Table: habit_completions
-- ============================================
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at timestamptz not null default now()
);

alter table public.habit_completions
  add constraint uq_habit_completions_habit_date unique (habit_id, completed_date);

create index idx_habit_completions_user_date on public.habit_completions(user_id, completed_date);

-- ============================================
-- Table: habit_streaks
-- ============================================
create table public.habit_streaks (
  habit_id uuid primary key references public.habits(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date
);

-- ============================================
-- Auto-update updated_at on habits
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger habits_updated_at
  before update on public.habits
  for each row execute function public.handle_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.habit_streaks enable row level security;

-- habits policies
create policy "Users can view own habits"
  on public.habits for select using (auth.uid() = user_id);
create policy "Users can insert own habits"
  on public.habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits"
  on public.habits for update using (auth.uid() = user_id);
create policy "Users can delete own habits"
  on public.habits for delete using (auth.uid() = user_id);

-- habit_completions policies
create policy "Users can view own completions"
  on public.habit_completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions"
  on public.habit_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete own completions"
  on public.habit_completions for delete using (auth.uid() = user_id);

-- habit_streaks: access via habit ownership (join-based)
create policy "Users can view own streaks"
  on public.habit_streaks for select
  using (exists (select 1 from public.habits where habits.id = habit_streaks.habit_id and habits.user_id = auth.uid()));
create policy "Users can update own streaks"
  on public.habit_streaks for update
  using (exists (select 1 from public.habits where habits.id = habit_streaks.habit_id and habits.user_id = auth.uid()));
create policy "Users can insert own streaks"
  on public.habit_streaks for insert
  with check (exists (select 1 from public.habits where habits.id = habit_streaks.habit_id and habits.user_id = auth.uid()));
