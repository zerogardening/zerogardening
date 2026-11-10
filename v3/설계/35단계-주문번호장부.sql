-- 35단계 — 문자주문·예약 주문번호 장부. 🔴 우람님 승인 뒤 허브가 Supabase SQL Editor 에서 한 번만 돌린다.
-- 🔴 이걸 돌리고 → 도구/주문번호장부채우기.py 로 옛 번호를 채운 뒤에 push 한다 (돌리기 전에 push 하면 문자주문 올리기가 「인터넷 연결 후 다시」로 막힌다).
--
-- 줄 하나 = 쓴 번호 하나. id 가 번호(YYMMDD-NN)라 같은 번호 insert 는 서버가 거절한다 → 앱이 다음 번호로 다시.
-- 문자주문id 도 unique — 같은 문자주문을 두 기기가 동시에 올려도 번호는 하나다 (null 은 여럿 가능 = 주문탭에서 손으로 넣은 옛 번호).
-- 지우지 않는다 — 올린 주문을 지워도 번호는 다시 안 준다(17단계④ 재사용 사고). 그래서 삭제됨 칸·트리거·Realtime 이 없다.
-- RLS 는 v3_문자주문(16단계 SQL)과 같다.

create table if not exists public.v3_주문번호 (
    id text primary key,
    문자주문id text unique,
    내용 jsonb not null default '{}'::jsonb,
    수정시각 timestamptz not null default now(),
    수정자 uuid default auth.uid());

alter table public.v3_주문번호 enable row level security;
revoke all on public.v3_주문번호 from anon;
drop policy if exists "로그인한사람만" on public.v3_주문번호;
create policy "로그인한사람만" on public.v3_주문번호
    for all to authenticated using (true) with check (true);

-- 확인 — 아래가 0 을 돌려주면 된다
-- select count(*) from public.v3_주문번호;
