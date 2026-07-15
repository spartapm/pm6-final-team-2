-- 추천글 삭제 시 빈 ollpick(추천 이유 0건)도 함께 제거하고, 기존 고아 픽을 정리합니다.

create or replace function public.delete_my_ollpick_reason(
  p_pick_id uuid,
  p_reason_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.ollpick_reasons
  where id = p_reason_id
    and pick_id = p_pick_id
    and user_id = auth.uid();

  if not found then
    raise exception 'reason not found or not owned';
  end if;

  if not exists (
    select 1 from public.ollpick_reasons where pick_id = p_pick_id
  ) then
    delete from public.ollpicks where id = p_pick_id;
  end if;
end;
$$;

revoke all on function public.delete_my_ollpick_reason(uuid, uuid) from public;
grant execute on function public.delete_my_ollpick_reason(uuid, uuid) to authenticated;

-- 이미 남아 있는 고아 픽(추천 이유 없음) 정리
delete from public.ollpicks o
where not exists (
  select 1 from public.ollpick_reasons r where r.pick_id = o.id
);
