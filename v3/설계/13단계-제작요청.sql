-- 13단계 — 상세페이지 제작요청 표 하나. 🔴 우람님이 Supabase 대시보드 SQL Editor 에서 한 번만 돌리신다.
--
-- 재고 탭에서 품목을 골라 「상세페이지」를 누르면 여기에 한 줄이 쌓인다.
-- 맥에서 `상품/_도구/제작요청받기.py` 가 그 줄을 받아 `상품/품목/{품목}/입력.md` 를 만든다.
--
-- 칸도 트리거도 RLS 도 기존 표 13개와 똑같다 (7단계 설계 §1·§2).
-- 시각만 now() 가 아니라 clock_timestamp() 다 — 7단계 「남은것」 고침에서 바뀐 그대로다.

create table if not exists public.v3_제작요청 (
    id text primary key,
    내용 jsonb not null,
    삭제됨 boolean not null default false,
    수정시각 timestamptz not null default clock_timestamp(),
    수정자 uuid default auth.uid());

drop trigger if exists 손댐 on public.v3_제작요청;
create trigger 손댐 before update on public.v3_제작요청
    for each row execute function public.v3_손댐();

create index if not exists v3_제작요청_시각 on public.v3_제작요청 (수정시각);

do $$
begin
  alter publication supabase_realtime add table public.v3_제작요청;
exception when duplicate_object then null;
end $$;

alter table public.v3_제작요청 enable row level security;
revoke all on public.v3_제작요청 from anon;
drop policy if exists "로그인한사람만" on public.v3_제작요청;
create policy "로그인한사람만" on public.v3_제작요청
    for all to authenticated using (true) with check (true);
