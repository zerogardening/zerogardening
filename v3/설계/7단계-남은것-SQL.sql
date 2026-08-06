-- 🔴-7 고침 — 우람님이 Supabase 대시보드 SQL Editor 에서 돌리셔야 한다.
--
-- 증상 — 두 기기가 같은 줄을 연달아 고치면 12회 중 2회, 두 화면은 같은데 서버만 다른 값이
--        남는다. 새로고침하면 방금 저장해 보이던 값이 소리 없이 사라진다.
--
-- 원인 — 표를 만들 때 넣은 now() 는 「트랜잭션 시작 시각」이다. 두 기기가 부딪히면 뒤에 온
--        쪽이 행 잠금을 기다렸다 나중에 커밋하는데, 시각은 기다리기 전 것이라 더 작다.
--        그래서 나중에 쓴 값이 「더 옛 값」으로 판정돼 밀린다.
--        (JS 쪽 마이크로초 비교는 정상 동작한다 — 고칠 것 없다. 검수서 「최종확인 ②」 참고)
--
-- clock_timestamp() 는 그 줄을 실제로 쓰는 순간 값이라 순서가 뒤집히지 않는다.
--
-- 🔴 표도 데이터도 지우지 않는다. 시각을 찍는 방식만 바꾼다.
-- 돌린 뒤 — 연타 12회 재시험에서 12/12 가 나와야 통과다.

create or replace function public.v3_손댐() returns trigger language plpgsql as $t$
begin new.수정시각 := clock_timestamp(); new.수정자 := auth.uid(); return new; end $t$;

do $$
declare t text;
begin
  foreach t in array array['품목','입고','출고','재고조정','업체','주문','주문묶음',
                           '명세서','명세서줄','견적요청','즐겨찾기','분류폴더','공유설정']
  loop
    execute format('alter table public.%I alter column 수정시각 set default clock_timestamp()', 'v3_'||t);
  end loop;
end $$;
