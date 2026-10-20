#!/bin/zsh
# 심폴 새 비밀번호를 Edge 함수 비밀값 SIMPOL_PW 에 넣는다 (10/20 우람님 심폴 비밀번호 변경 뒤).
#   zsh 통합관리/도구/심폴비번넣기.sh        ← 우람님이 아이맥 터미널에서. 비밀번호는 화면·기록에 안 남는다
# 🔴 비밀값을 바꾸면 함수를 다시 올려야 새 값으로 깨어난다(현재상태.md) — 수집·발송 둘 다 다시 올리고
#    수집을 시험:true(저장 없음)로 한 번 불러 로그인되는지 본다. 캡차 때문이면 여기서도 「로그인 실패」가 남는다.
set -u
T=$(cat ~/.zg-supabase-token)
P=https://api.supabase.com/v1/projects/vjqfhwrgrocapcyndgtx
도구=/Users/woorambaik/claude-projects/제로가드닝/통합관리/도구

read -rs "PW?심폴 새 비밀번호 (쳐도 안 보입니다): "; echo
[ -z "$PW" ] && { echo "❌ 비어 있습니다 — 다시 돌려 주세요"; exit 1; }
PW="$PW" python3 -c 'import json,os;print(json.dumps([{"name":"SIMPOL_PW","value":os.environ["PW"]}]))' |
  curl -s -o /dev/null -w "비밀값 넣기 %{http_code}\n" -X POST "$P/secrets" -H "Authorization: Bearer $T" \
       -H "Content-Type: application/json" --data-binary @-
unset PW

for 이름 in simpol-collect:edge-심폴수집 simpol-ship:edge-심폴발송; do
  슬=${이름%%:*}; 폴=${이름##*:}
  curl -s -o /dev/null -w "$슬 다시 올리기 %{http_code}\n" -X POST "$P/functions/deploy?slug=$슬" -H "Authorization: Bearer $T" \
       -F "metadata={\"entrypoint_path\":\"index.ts\",\"name\":\"$슬\",\"verify_jwt\":true};type=application/json" \
       -F "file=@$도구/$폴/index.ts;type=application/typescript"
done

sleep 5
curl -s -X POST https://vjqfhwrgrocapcyndgtx.supabase.co/functions/v1/simpol-collect \
     -H "Authorization: Bearer $(cat ~/.zg_supabase_key)" -H "Content-Type: application/json" \
     -d '{"시험":true,"일수":7}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print("✅ 심폴 로그인 됨 — 새 주문", d.get("새것"), "건 (저장 안 함)" if d.get("ok") else "🔴 " + str(d.get("오류")))'
