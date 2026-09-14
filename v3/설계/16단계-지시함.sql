-- 16단계 — 지시함 표 하나. 🔴 우람님이 Supabase 대시보드 SQL Editor 에서 한 번만 돌리신다.
--
-- 폰·웹에서 일감을 쌓아 두면 맥이 켜질 때 꺼내 처리하고, 같은 줄에 답장을 적는다.
-- 줄 하나가 「지시 한 건 + 그 답장」이다. 채팅처럼 시간순으로 쌓인다.
--
--   id      {보낸때}-{꼬리4}   ← 문자열 정렬이 곧 시간 정렬이다
--   내용    {누가, 보낸때, 글, 상태, 답장, 답한때, 걸린초}
--
--     누가    '우람님'  손으로 치신 것
--             '시스템'  사진이 다 차면 자동으로 쌓인 것 (⑥에서 붙는다)
--     상태    '대기'    아직 아무도 안 집었다
--             '하는중'  맥이 집었다 (맥이 꺼지면 여기서 멈춰 있다 — 다시 켜면 이어 간다)
--             '됨'      끝났다. 답장이 들어 있다
--             '실패'    해 봤는데 안 됐다. 까닭이 답장에 있다
--             '거부'    지우기·push·돈 나가는 일이라 안 했다. 까닭이 답장에 있다
--
-- 🔴 한 줄에 한 지시다. 여러 지시를 한 줄에 담지 않는다 —
--    우람님이 셋을 던져 두시면 맥은 위에서부터 하나씩 집는다. 하나가 실패해도 나머지는 돈다.
-- 🔴 칸·트리거·RLS 는 15단계B 표와 글자 하나 안 다르다. 표 이름만 다르다.

create table if not exists public.v3_지시 (
    id text primary key,
    내용 jsonb not null,
    삭제됨 boolean not null default false,
    수정시각 timestamptz not null default clock_timestamp(),
    수정자 uuid default auth.uid());

drop trigger if exists 손댐 on public.v3_지시;
create trigger 손댐 before update on public.v3_지시
    for each row execute function public.v3_손댐();

create index if not exists v3_지시_시각 on public.v3_지시 (수정시각);

-- 화면이 답장을 기다린다 — 맥이 답을 적는 순간 폰에 뜨게 한다
do $$
begin
  alter publication supabase_realtime add table public.v3_지시;
exception when duplicate_object then null;
end $$;

alter table public.v3_지시 enable row level security;
revoke all on public.v3_지시 from anon;
drop policy if exists "로그인한사람만" on public.v3_지시;
create policy "로그인한사람만" on public.v3_지시
    for all to authenticated using (true) with check (true);
