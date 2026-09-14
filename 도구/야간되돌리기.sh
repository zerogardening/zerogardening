#!/bin/bash
# 맥이 밤새 혼자 한 일을 되돌린다 (16단계 지시함).
#
#   ./야간되돌리기.sh           무엇을 했는지 목록만 본다 (아무것도 안 바꾼다)
#   ./야간되돌리기.sh 오늘       오늘 한 것을 전부 되돌린다
#   ./야간되돌리기.sh 3          최근 3건을 되돌린다
#
# 🔴 이력을 지우지 않는다. 「되돌리는 커밋」을 새로 쌓는다 — 그래서 이미 push 한 것도 안전하다.
#    되돌린 것을 또 되돌리면 원래대로 돌아온다.
# 🔴 bash 는 한글 변수명을 못 쓴다. 그래서 여기만 영문이다 (파이썬 도구들은 한글 그대로).
set -e
ROOT=/Users/zerogardening/claude-projects/제로가드닝
cd "$ROOT"

if [ -z "$1" ]; then
  echo "── 맥이 혼자 한 일 (최근 20건) ──"
  git log --grep='^\[야간\]' -20 --format='  %h  %ad  %s' --date=format:'%m/%d %H:%M' || true
  if [ -z "$(git log --grep='^\[야간\]' -1 --format=%H 2>/dev/null)" ]; then
    echo "  (아직 없습니다)"
  fi
  echo
  echo "되돌리시려면:  ./야간되돌리기.sh 오늘     또는     ./야간되돌리기.sh 3"
  exit 0
fi

if [ "$1" = "오늘" ]; then
  TARGETS=$(git log --grep='^\[야간\]' --since=midnight --format='%H')
else
  TARGETS=$(git log --grep='^\[야간\]' -"$1" --format='%H')
fi

if [ -z "$TARGETS" ]; then echo "되돌릴 것이 없습니다"; exit 0; fi

echo "── 되돌릴 것 ──"
for c in $TARGETS; do git log -1 --format='  %h  %s' "$c"; done
echo
read -p "되돌립니다. 맞습니까? (y/n) " ANS
[ "$ANS" = "y" ] || { echo "그만둡니다"; exit 0; }

# 최신 것부터 되돌려야 충돌이 안 난다 (git log 가 이미 최신순이다)
for c in $TARGETS; do
  git revert --no-edit --no-commit "$c" || {
    echo "🔴 $c 에서 부딪혔습니다. 되돌리다 말았습니다."
    echo "   원래대로 두려면:  git revert --abort"
    exit 1; }
done
git commit -q -m "[되돌림] 맥이 혼자 한 일을 물린다 ($1)"
echo "✅ 되돌렸습니다. 올리시려면:  cd $ROOT && git push"
