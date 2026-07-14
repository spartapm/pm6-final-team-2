-- 타인 마이페이지: 시청 상태(보관함) 공개 조회
-- 1) SELECT 정책 재확인
-- 2) SECURITY DEFINER RPC로 클라이언트에서 안정적으로 조회

drop policy if exists "work_statuses_select_own" on public.work_statuses;
drop policy if exists "work_statuses_select" on public.work_statuses;
create policy "work_statuses_select" on public.work_statuses
  for select using (true);

create or replace function public.get_user_work_statuses(p_user_id uuid)
returns table (
  work_id text,
  status text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ws.work_id, ws.status::text, ws.updated_at
  from public.work_statuses ws
  where ws.user_id = p_user_id
  order by ws.updated_at desc nulls last;
$$;

revoke all on function public.get_user_work_statuses(uuid) from public;
grant execute on function public.get_user_work_statuses(uuid) to anon, authenticated;
