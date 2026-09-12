-- 15단계 B — 상세페이지 원고 표 하나. 🔴 우람님이 Supabase 대시보드 SQL Editor 에서 한 번만 돌리신다.
--
-- 줄이 두 종류다 (15단계B 설계 §2)
--   {품목코드}#{칸}  글칸 한 개 — 내용 {품목코드, 칸, 소제목, 본문, 고친때, 맥시각}
--   {품목코드}        품목 머리 — 내용 {품목코드, 만들기요청, 만든때, 장수, 만들기상태, 말}
--
-- 🔴 한 품목의 글을 한 줄에 담지 않는다. 우람님이 2구역을, 두용씨가 5구역을
--    같은 때에 고쳐도 서로를 안 지운다.
--
-- 칸도 트리거도 RLS 도 13단계 표와 글자 하나 안 다르다 — 표 이름만 다르다.

create table if not exists public.v3_원고 (
    id text primary key,
    내용 jsonb not null,
    삭제됨 boolean not null default false,
    수정시각 timestamptz not null default clock_timestamp(),
    수정자 uuid default auth.uid());

drop trigger if exists 손댐 on public.v3_원고;
create trigger 손댐 before update on public.v3_원고
    for each row execute function public.v3_손댐();

create index if not exists v3_원고_시각 on public.v3_원고 (수정시각);

do $$
begin
  alter publication supabase_realtime add table public.v3_원고;
exception when duplicate_object then null;
end $$;

alter table public.v3_원고 enable row level security;
revoke all on public.v3_원고 from anon;
drop policy if exists "로그인한사람만" on public.v3_원고;
create policy "로그인한사람만" on public.v3_원고
    for all to authenticated using (true) with check (true);
