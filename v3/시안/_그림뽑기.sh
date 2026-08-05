#!/bin/zsh
# 시안 HTML을 PNG로 뽑는다.  쓰는 법:  ./_그림뽑기.sh 01-입고.html 3800
# 두 번째 값은 세로 길이(px). 안 주면 4200.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
H=${2:-4200}
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,$H \
  --virtual-time-budget=4000 \
  --screenshot="${1%.html}.png" "file://$PWD/$1" 2>/dev/null
echo "${1%.html}.png  ($(sips -g pixelWidth -g pixelHeight "${1%.html}.png" 2>/dev/null | tail -2 | tr -d ' \n'))"
