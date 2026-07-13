-- Allow reading other users' watch statuses on public profiles (마이페이지 타인 조회).
drop policy if exists "work_statuses_select_own" on public.work_statuses;
drop policy if exists "work_statuses_select" on public.work_statuses;
create policy "work_statuses_select" on public.work_statuses
  for select using (true);
