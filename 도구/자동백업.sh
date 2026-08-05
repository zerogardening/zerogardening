#!/bin/bash
# Supabase app_meta(key='state') 한 줄을 통째로 내려받아 날짜별로 쌓는다.
# 원본은 저장할 때마다 덮어써져 이력이 없다 — 이 스크립트가 그 이력을 만든다.
#
# 쓰기 전에 한 번:
#   1) Supabase 대시보드 → Project Settings → API → service_role 키 복사
#   2) echo '키내용' > ~/.zg_supabase_key && chmod 600 ~/.zg_supabase_key
#   3) bash 도구/자동백업.sh        ← 손으로 한 번 돌려서 되는지 본다
#   4) 매일 자동 (crontab -e 에 한 줄):
#      0 22 * * * /bin/bash ~/claude-projects/제로가드닝-개발/통합관리/도구/자동백업.sh >> /tmp/zg-backup.log 2>&1

set -euo pipefail

URL="https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/app_meta?key=eq.state&select=value"
KEYFILE="$HOME/.zg_supabase_key"
OUT="$(cd "$(dirname "$0")/.." && pwd)/백업/자동"
KEEP=60   # ponytail: 날짜 파일 60개만 남긴다. 늘리려면 이 숫자만 고친다

[ -f "$KEYFILE" ] || { echo "❌ 키가 없다: $KEYFILE — 위 사용법 2)를 먼저 한다"; exit 1; }
KEY=$(tr -d '[:space:]' < "$KEYFILE")

mkdir -p "$OUT"
TODAY=$(date +%Y-%m-%d)
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

CODE=$(curl -sS -m 60 -o "$TMP" -w '%{http_code}' "$URL" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY")

[ "$CODE" = "200" ] || { echo "❌ HTTP $CODE — $(head -c 300 "$TMP")"; exit 1; }

# service_role 이 아니면 RLS 로 빈 배열이 온다. 빈 파일을 백업이라 부르지 않는다.
SIZE=$(wc -c < "$TMP" | tr -d ' ')
if [ "$SIZE" -lt 1000 ]; then
  echo "❌ 받은 게 ${SIZE}바이트뿐이다 — service_role 키가 맞는지 확인한다. 내용: $(head -c 200 "$TMP")"
  exit 1
fi

mv "$TMP" "$OUT/state-$TODAY.json"
trap - EXIT
echo "✅ $(date '+%Y-%m-%d %H:%M') — $OUT/state-$TODAY.json ($SIZE 바이트)"

# 오래된 것 정리
ls -1t "$OUT"/state-*.json 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
