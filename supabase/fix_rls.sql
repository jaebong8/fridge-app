-- ===================================================
-- RLS 무한 재귀 버그 수정
-- fridge_members 자기 참조 → security definer 함수로 우회
-- Supabase SQL Editor에서 실행하세요
-- ===================================================

-- 1. RLS를 우회하는 멤버십 확인 헬퍼 함수
--    (security definer = 함수 소유자 권한으로 실행, RLS 비적용)
create or replace function public.is_fridge_member(fridge_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.fridge_members
    where fridge_id = fridge_uuid
      and user_id = auth.uid()
  );
$$;

-- 2. fridges 정책 재생성
drop policy if exists "fridge_select" on public.fridges;
create policy "fridge_select" on public.fridges for select
  using (
    owner_id = auth.uid()
    or is_fridge_member(id)
  );

-- 3. fridge_members 정책 재생성 (자기 참조 제거)
drop policy if exists "members_select" on public.fridge_members;
create policy "members_select" on public.fridge_members for select
  using (
    user_id = auth.uid()
    or is_fridge_member(fridge_id)
  );

drop policy if exists "members_insert" on public.fridge_members;
create policy "members_insert" on public.fridge_members for insert
  with check (
    exists (
      select 1 from public.fridges
      where id = fridge_id
        and owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- 4. inventory / shopping / activities 정책도 is_fridge_member 사용
drop policy if exists "inventory_select" on public.inventory_items;
create policy "inventory_select" on public.inventory_items for select
  using (is_fridge_member(fridge_id));

drop policy if exists "inventory_insert" on public.inventory_items;
create policy "inventory_insert" on public.inventory_items for insert
  with check (is_fridge_member(fridge_id) and added_by = auth.uid());

drop policy if exists "inventory_update" on public.inventory_items;
create policy "inventory_update" on public.inventory_items for update
  using (is_fridge_member(fridge_id));

drop policy if exists "inventory_delete" on public.inventory_items;
create policy "inventory_delete" on public.inventory_items for delete
  using (is_fridge_member(fridge_id));

drop policy if exists "shopping_select" on public.shopping_items;
create policy "shopping_select" on public.shopping_items for select
  using (is_fridge_member(fridge_id));

drop policy if exists "shopping_insert" on public.shopping_items;
create policy "shopping_insert" on public.shopping_items for insert
  with check (is_fridge_member(fridge_id));

drop policy if exists "shopping_update" on public.shopping_items;
create policy "shopping_update" on public.shopping_items for update
  using (is_fridge_member(fridge_id));

drop policy if exists "shopping_delete" on public.shopping_items;
create policy "shopping_delete" on public.shopping_items for delete
  using (is_fridge_member(fridge_id));

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities for select
  using (is_fridge_member(fridge_id));

drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert" on public.activities for insert
  with check (user_id = auth.uid() and is_fridge_member(fridge_id));
