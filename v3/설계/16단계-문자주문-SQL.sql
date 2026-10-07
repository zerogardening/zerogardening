-- 16단계 — 문자주문 표 하나. 🔴 우람님이 Supabase 대시보드 SQL Editor 에서 한 번만 돌리신다.
-- 🔴 이걸 돌리기 전에는 push 하지 않는다 (설계서 §1-3).
--
-- 줄 하나 = 문자주문 한 건(받는 분 한 사람에게 보내는 문자 한 통 분량). 품목 줄은 내용.품목 배열에 든다.
--   id    sm_{시각36진}_{꼬리5}
--   내용  {id, 날짜, 받는분, 전화, 메모, 주소, 품목[], 배송비, 상태, 등록일시, 수정일시,
--          보낸일시, 올린주문번호, 올린일시}         ← 설계서 §2
-- 칸·트리거·RLS 는 v3_메모 와 글자 하나 안 다르다. 표 이름만 다르다 (7단계 설계 §1·§2 규격).
-- v3_손댐() 은 이미 있다 (7단계 ①).

create table if not exists public.v3_문자주문 (
    id text primary key,
    내용 jsonb not null,
    삭제됨 boolean not null default false,
    수정시각 timestamptz not null default now(),
    수정자 uuid default auth.uid());

drop trigger if exists 손댐 on public.v3_문자주문;
create trigger 손댐 before update on public.v3_문자주문
    for each row execute function public.v3_손댐();

create index if not exists v3_문자주문_시각 on public.v3_문자주문 (수정시각);

alter table public.v3_문자주문 enable row level security;
revoke all on public.v3_문자주문 from anon;
drop policy if exists "로그인한사람만" on public.v3_문자주문;
create policy "로그인한사람만" on public.v3_문자주문
    for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.v3_문자주문;
exception when duplicate_object then null; end $$;

-- 확인 — 아래가 0 을 돌려주면 된다
-- select count(*) from public.v3_문자주문;
