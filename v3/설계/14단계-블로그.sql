-- 14단계 — 블로그 원고 표 하나. 🔴 우람님이 Supabase 대시보드 SQL Editor 에서 한 번만 돌리신다.
--
-- 맥 편집기(상품/_도구/편집.py)의 [저장]이 원고 한 편을 여기 한 줄로 올린다.
-- 통합관리 「상품 › 블로그」 탭이 그 줄을 읽는다 — 그래서 어느 PC에서든 원고가 보인다.
-- 고치신 것은 같은 줄의 「고친본문」에 들어간다. 맥에서 고치든 밖에서 고치든 한 자리다.
--
-- 이미지는 여기 안 들어간다 — Storage 공개 버킷 「blog」 에 올라가고, 줄에는 주소만 담긴다.
-- 칸도 트리거도 RLS 도 기존 표 14개와 똑같다 (7단계 설계 §1·§2 · 13단계와 같은 꼴).

create table if not exists public.v3_블로그 (
    id text primary key,
    내용 jsonb not null,
    삭제됨 boolean not null default false,
    수정시각 timestamptz not null default clock_timestamp(),
    수정자 uuid default auth.uid());

drop trigger if exists 손댐 on public.v3_블로그;
create trigger 손댐 before update on public.v3_블로그
    for each row execute function public.v3_손댐();

create index if not exists v3_블로그_시각 on public.v3_블로그 (수정시각);

do $$
begin
  alter publication supabase_realtime add table public.v3_블로그;
exception when duplicate_object then null;
end $$;

alter table public.v3_블로그 enable row level security;
revoke all on public.v3_블로그 from anon;
drop policy if exists "로그인한사람만" on public.v3_블로그;
create policy "로그인한사람만" on public.v3_블로그
    for all to authenticated using (true) with check (true);
