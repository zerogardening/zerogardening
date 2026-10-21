-- 31단계 아이맥 감시: 5분마다 Edge imac-watch 를 부른다. 같은 이름이면 덮어쓴다(두 번 돌려도 하나).
select cron.schedule(
  'imac-watch',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://vjqfhwrgrocapcyndgtx.supabase.co/functions/v1/imac-watch',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb) $$
);
