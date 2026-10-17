-- 25단계 — 현황판 표 하나. 🔴 우람님이 Supabase 대시보드 SQL Editor 에서 한 번만 돌리신다.
--   id '판'          아이맥 현황판올리기.py 만 쓴다. 지시로그에서 매번 새로 만든 사본이다
--   id '숨김:{항목id}' 브라우저만 쓴다. 「정리」 한 번 = 한 줄. 되살리기는 삭제됨=true
-- 🔴 칸·트리거·RLS 는 v3_지시(16단계)와 글자 하나 안 다르다. 표 이름만 다르다.

create table if not exists public.v3_현황판 (
    id text primary key,
    내용 jsonb not null,
    삭제됨 boolean not null default false,
    수정시각 timestamptz not null default clock_timestamp(),
    수정자 uuid default auth.uid());

drop trigger if exists 손댐 on public.v3_현황판;
create trigger 손댐 before update on public.v3_현황판
    for each row execute function public.v3_손댐();

alter table public.v3_현황판 enable row level security;
revoke all on public.v3_현황판 from anon;
drop policy if exists "로그인한사람만" on public.v3_현황판;
create policy "로그인한사람만" on public.v3_현황판
    for all to authenticated using (true) with check (true);

-- 올리기는 PATCH 만 한다 — 빈 판 줄을 미리 하나 심어 둔다
insert into public.v3_현황판 (id, 내용) values ('판', '{"판":1,"갱신":"","항목":[]}')
    on conflict (id) do nothing;
