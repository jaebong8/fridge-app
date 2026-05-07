-- ===================================================
-- 냉장고 앱 Supabase 스키마
-- Supabase SQL Editor에서 실행하세요
-- ===================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────────
-- Fridges (냉장고)
-- ───────────────────────────────────────────────────
create table public.fridges (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  color       text not null default '#7fc89c',
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────
-- Fridge members (공유 멤버)
-- ───────────────────────────────────────────────────
create table public.fridge_members (
  id          uuid primary key default uuid_generate_v4(),
  fridge_id   uuid not null references public.fridges(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  nickname    text not null,
  joined_at   timestamptz default now(),
  unique(fridge_id, user_id)
);

-- ───────────────────────────────────────────────────
-- Inventory items (식재료)
-- ───────────────────────────────────────────────────
create table public.inventory_items (
  id          uuid primary key default uuid_generate_v4(),
  fridge_id   uuid not null references public.fridges(id) on delete cascade,
  added_by    uuid not null references auth.users(id),
  name        text not null,
  category    text not null check (category in ('채소','과일','육류','단백질','유제품','소스','곡물')),
  amount      text not null,
  loc         text not null check (loc in ('냉장','냉동','실온')),
  exp         date not null,
  color       text not null default '#7fc89c',
  added       date not null default current_date,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────
-- Shopping items (쇼핑 리스트)
-- ───────────────────────────────────────────────────
create table public.shopping_items (
  id          uuid primary key default uuid_generate_v4(),
  fridge_id   uuid not null references public.fridges(id) on delete cascade,
  name        text not null,
  qty         text not null default '1개',
  from_note   text,
  done        boolean not null default false,
  urgent      boolean not null default false,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────
-- Activity log (가족 활동 피드)
-- ───────────────────────────────────────────────────
create table public.activities (
  id          uuid primary key default uuid_generate_v4(),
  fridge_id   uuid not null references public.fridges(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  action      text not null,   -- 'add' | 'consume' | 'discard'
  item_name   text not null,
  item_amount text,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────
-- User profiles
-- ───────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      '사용자'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ───────────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────────
alter table public.fridges         enable row level security;
alter table public.fridge_members  enable row level security;
alter table public.inventory_items enable row level security;
alter table public.shopping_items  enable row level security;
alter table public.activities      enable row level security;
alter table public.profiles        enable row level security;

-- Fridges: owner or member can read; only owner can write
create policy "fridge_select" on public.fridges for select
  using (
    owner_id = auth.uid() or
    exists (select 1 from public.fridge_members where fridge_id = id and user_id = auth.uid())
  );
create policy "fridge_insert" on public.fridges for insert with check (owner_id = auth.uid());
create policy "fridge_update" on public.fridges for update using (owner_id = auth.uid());
create policy "fridge_delete" on public.fridges for delete using (owner_id = auth.uid());

-- Members: same fridge members can read
create policy "members_select" on public.fridge_members for select
  using (
    user_id = auth.uid() or
    exists (select 1 from public.fridge_members m2 where m2.fridge_id = fridge_id and m2.user_id = auth.uid())
  );
create policy "members_insert" on public.fridge_members for insert
  with check (
    exists (select 1 from public.fridges where id = fridge_id and owner_id = auth.uid())
  );
create policy "members_delete" on public.fridge_members for delete using (user_id = auth.uid());

-- Inventory: members can CRUD
create policy "inventory_select" on public.inventory_items for select
  using (
    exists (select 1 from public.fridge_members where fridge_id = inventory_items.fridge_id and user_id = auth.uid())
    or exists (select 1 from public.fridges where id = inventory_items.fridge_id and owner_id = auth.uid())
  );
create policy "inventory_insert" on public.inventory_items for insert
  with check (added_by = auth.uid());
create policy "inventory_update" on public.inventory_items for update
  using (
    exists (select 1 from public.fridge_members where fridge_id = inventory_items.fridge_id and user_id = auth.uid())
    or exists (select 1 from public.fridges where id = inventory_items.fridge_id and owner_id = auth.uid())
  );
create policy "inventory_delete" on public.inventory_items for delete
  using (
    exists (select 1 from public.fridge_members where fridge_id = inventory_items.fridge_id and user_id = auth.uid())
    or exists (select 1 from public.fridges where id = inventory_items.fridge_id and owner_id = auth.uid())
  );

-- Shopping: same as inventory
create policy "shopping_select" on public.shopping_items for select
  using (
    exists (select 1 from public.fridge_members where fridge_id = shopping_items.fridge_id and user_id = auth.uid())
    or exists (select 1 from public.fridges where id = shopping_items.fridge_id and owner_id = auth.uid())
  );
create policy "shopping_insert" on public.shopping_items for insert with check (true);
create policy "shopping_update" on public.shopping_items for update using (true);
create policy "shopping_delete" on public.shopping_items for delete using (true);

-- Activities: readable by all members
create policy "activities_select" on public.activities for select
  using (
    exists (select 1 from public.fridge_members where fridge_id = activities.fridge_id and user_id = auth.uid())
    or exists (select 1 from public.fridges where id = activities.fridge_id and owner_id = auth.uid())
  );
create policy "activities_insert" on public.activities for insert with check (user_id = auth.uid());

-- Profiles: users can read all, update own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- ───────────────────────────────────────────────────
-- Realtime 활성화 (가족 공유 동기화)
-- ───────────────────────────────────────────────────
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.activities;
