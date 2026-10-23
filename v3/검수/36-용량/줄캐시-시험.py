#!/usr/bin/env python3
"""36 용량 — 줄캐시(바뀐 줄만 받기) 시험. 🔴 실서버 **읽기만**(GET). 캐시는 임시 폴더에.

    python3 통합관리/v3/검수/36-용량/줄캐시-시험.py

① 통째 받기 = 서버 통째 GET 과 같은 줄·같은 값 (v3_원고·품목·지시·제작요청)
② 바로 다시 부르면 바뀐 줄만 — 받은 바이트가 통째의 몇 % 인가
③ 캐시에서 줄 하나를 빼고 마지막 시각을 그 줄 앞으로 돌리면 다음 부름에 되살아난다(=서버에서 바뀐 줄은 꼭 온다)
④ 캐시 내용을 일부러 틀리게 해도 6시간 지나면 통째로 다시 받아 바로잡힌다
⑤ 빼기() = 진짜 DELETE 대비
⑥ 고친 함수 반환값 = 예전 통째 받기로 계산한 값 (원고받기·지시함·사진받기·제작요청·푸시)
"""
import json, sys, tempfile, time, urllib.request, gzip
from pathlib import Path

도구 = Path(__file__).resolve().parents[3] / '도구'
sys.path.insert(0, str(도구))
import 줄캐시                                   # noqa: E402
from 제작요청 import 부르기, 표                   # noqa: E402

줄캐시.방 = Path(tempfile.mkdtemp(prefix='줄캐시-시험-'))
통과 = 실패 = 0
def 본다(이름, 참):
    global 통과, 실패
    통과 += bool(참); 실패 += (not 참)
    print(('  ✅ ' if 참 else '  ❌ ') + 이름)

# 받은 바이트 세기 — 줄캐시._받기 안의 urlopen 을 감싼다
바이트 = [0]
진짜열기 = urllib.request.urlopen
class 셈:
    def __init__(s, r): s.r = r; s.headers = r.headers
    def read(s):
        b = s.r.read(); 바이트[0] += len(b); return b
    def __enter__(s): return s
    def __exit__(s, *a): s.r.close()
줄캐시.urllib.request.urlopen = lambda req, timeout=30: 셈(진짜열기(req, timeout=timeout))

def 옛통째(t):
    return 부르기(표(t) + '?select=id,내용,삭제됨&order=id&limit=5000') or []

def 같나(새, 옛):
    a = {r['id']: (r.get('내용'), r.get('삭제됨')) for r in 새}
    b = {r['id']: (r.get('내용'), r.get('삭제됨')) for r in 옛}
    return a == b

print('① 통째 받기 = 서버')
크기 = {}
for t in ['v3_원고', 'v3_품목', 'v3_지시', 'v3_제작요청']:
    바이트[0] = 0
    새 = 줄캐시.줄들(t)
    크기[t] = 바이트[0]
    본다('%s %d줄 같음 (gzip %dKB)' % (t, len(새), 바이트[0] // 1024), 같나(새, 옛통째(t)))

print('② 다시 부르면 바뀐 줄만')
for t in 크기:
    바이트[0] = 0
    새 = 줄캐시.줄들(t)
    본다('%s 두 번째 %d바이트 (통째의 %.1f%%) · 줄 수 그대로 %d' % (t, 바이트[0], 100.0 * 바이트[0] / 크기[t], len(새)),
         바이트[0] < 크기[t] * 0.2 and 같나(새, 옛통째(t)))

print('③ 빠진 줄은 수정시각으로 되살아난다')
t = 'v3_원고'
캐 = 줄캐시._읽기(t)
최근 = max(캐['줄'].values(), key=lambda r: 줄캐시._때(r['수정시각']))
del 캐['줄'][최근['id']]
from datetime import timedelta
캐['마지막'] = (줄캐시._때(최근['수정시각']) - timedelta(seconds=30)).isoformat()
줄캐시._쓰기(t, 캐)
새 = 줄캐시.줄들(t)
본다('%s 되살아남' % 최근['id'], any(r['id'] == 최근['id'] for r in 새))

print('④ 6시간 지나면 통째로 다시')
캐 = 줄캐시._읽기(t)
아무 = next(iter(캐['줄']))
캐['줄'][아무]['내용'] = {'틀린값': 1}
줄캐시._쓰기(t, 캐)
본다('6시간 안엔 틀린 값 그대로(=통째로 안 받음)', any(r.get('내용') == {'틀린값': 1} for r in 줄캐시.줄들(t)))
캐 = 줄캐시._읽기(t); 캐['통째때'] -= 줄캐시.통째초 + 1; 줄캐시._쓰기(t, 캐)
본다('6시간 넘으면 바로잡힘', 같나(줄캐시.줄들(t), 옛통째(t)))

print('⑤ 빼기')
줄캐시.빼기(t, 아무)
본다('빼기 뒤 캐시에 없음', 아무 not in 줄캐시._읽기(t)['줄'])
줄캐시.줄들(t, 통째=True)

print('⑥ 고친 함수 = 예전 값')
import 원고받기, 지시함, 사진받기, 제작요청, 푸시   # noqa: E402
옛원고 = {r['id']: (r.get('내용') or {}) for r in 옛통째('v3_원고') if not r.get('삭제됨')}
본다('원고받기.원고줄들 %d' % len(옛원고), 원고받기.원고줄들() == 옛원고)
옛품 = 옛통째('v3_품목')
def 옛길로(모듈, 함수, *인자):
    """그 모듈의 캐시줄들을 예전 통째 GET 으로 잠깐 바꿔 끼워 예전 값을 낸다"""
    새길 = 모듈.캐시줄들
    모듈.캐시줄들 = 옛통째
    try:
        return 함수(*인자)
    finally:
        모듈.캐시줄들 = 새길
새표 = 원고받기.품목표()
본다('원고받기.품목표 %d·못찾음 %d = 예전' % (len(새표[0]), len(새표[1])), 새표 == 옛길로(원고받기, 원고받기.품목표))
옛지시 = {r['id']: (r.get('내용') or {}) for r in 옛통째('v3_지시') if not r.get('삭제됨')}
본다('지시함.줄들 %d' % len(옛지시), 지시함.줄들() == 옛지시)
본다('사진받기.품목표 %d' % len(옛품), 사진받기.품목표() == {r['id']: (r.get('내용') or {}) for r in 옛품})
옛요청 = [r for r in 옛통째('v3_제작요청') if not r.get('삭제됨') and (r.get('내용') or {}).get('상태') == '대기']
본다('제작요청.요청들(대기) %d' % len(옛요청), [r['id'] for r in 제작요청.요청들('대기')] == [r['id'] for r in 옛요청])
옛구독 = sorted(r['id'] for r in 옛통째('v3_지시') if not r.get('삭제됨') and (r.get('내용') or {}).get('갈래') == '구독')
본다('푸시.구독들 %d' % len(옛구독), sorted(i for i, _ in 푸시.구독들()) == 옛구독)
새착 = 지시함.착수할것()
본다('지시함.착수할것 %d건 = 예전' % len(새착), 새착 == 옛길로(지시함, 지시함.착수할것))

print('\n줄캐시 시험 %d/%d' % (통과, 통과 + 실패))
sys.exit(1 if 실패 else 0)
