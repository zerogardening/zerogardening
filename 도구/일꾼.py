#!/usr/bin/env python3
"""맥이 켜져 있는 동안, 폰·웹에서 쌓아 두신 일감을 알아서 꺼내 처리한다 (2026-09-14).

    python3 통합관리/도구/일꾼.py          # 예약(LaunchAgent)이 1분마다 이렇게 부른다
    python3 통합관리/도구/일꾼.py 한번      # 손으로 한 번만 돌려 본다 (같은 일을 한다)

하는 일 — 위에서부터 차례로
  ① 제작요청 받기  통합관리에서 「상세페이지」 누르신 것 → 입력.md + 제작대기.md 한 줄
  ② 사진 받기     폰에서 올리신 사진 → ~/이미지/{식물}/

🔴 한 갈래가 넘어져도 다음 갈래는 돈다. 하나가 실패했다고 그날이 통째로 멈추면 안 된다.
🔴 `원고받기.py` 는 여기 안 넣는다 — 이미 제 예약으로 돌며 검증됐다. 도는 것을 건드리지 않는다.
🔴 조용하다. 할 일이 없으면 아무것도 찍지 않는다 — 1분마다 도는 로그가 쌓이면 못 읽는다.
"""
import io
import sys
import time
import traceback
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# 🔴 순서가 곧 급한 정도다. 지시함이 맨 뒤인 까닭 —
#    한 건에 최대 30분이 걸릴 수 있고, 그동안 launchd 는 다음 바퀴를 안 띄운다(같은 Label).
#    앞의 둘은 몇 초짜리라 먼저 털고 간다.
갈래들 = [
    ('제작요청', '제작요청', '받기', ()),
    ('사진받기', '사진받기', '받기', (False,)),
    ('지시함', '지시함', '한건', ()),
]


def 한갈래(이름, 모듈명, 함수명, 인자):
    """찍은 것을 받아 둔다. 할 말이 있을 때만 돌려준다 — 없으면 None"""
    try:
        모듈 = __import__(모듈명)
        통 = io.StringIO()
        with redirect_stdout(통):
            getattr(모듈, 함수명)(*인자)
        줄들 = [t for t in 통.getvalue().split('\n') if t.strip()]
    except SystemExit as e:
        # 🔴 열쇠가 없으면 두 스크립트 다 sys.exit() 로 죽는다. 일꾼까지 따라 죽으면 안 된다
        return ['❌ %s — %s' % (이름, e)]
    except Exception:
        return ['❌ %s — %s' % (이름, traceback.format_exc().strip().split('\n')[-1])]
    # ✅ 나 ⚠️ 로 시작하는 줄만 「무슨 일이 있었다」는 뜻이다. 나머지 마무리 줄은 늘 찍힌다
    한것 = [t for t in 줄들 if t.strip()[:1] in ('✅', '⚠️', '🛠', '❌')]
    return ['── %s' % 이름] + 한것 if 한것 else None


def 한바퀴():
    말 = []
    for 이름, 모듈명, 함수명, 인자 in 갈래들:
        답 = 한갈래(이름, 모듈명, 함수명, 인자)
        if 답:
            말 += 답
    if 말:
        print(time.strftime('[%m/%d %H:%M]'))
        print('\n'.join(말))
        sys.stdout.flush()
    return 말


if __name__ == '__main__':
    한바퀴()
