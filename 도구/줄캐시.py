#!/usr/bin/env python3
"""v3 표를 통째로 받지 않고 「바뀐 줄만」 받아 이 맥의 캐시에 합친다 (2026-10-23).

    from 줄캐시 import 줄들
    줄들('v3_품목')    # → [{'id', '내용', '삭제됨', '수정시각'}, …] — 예전 통째 받기와 같은 꼴(id 순)

🔴 왜 — 10/23 Supabase 무료 전송량(5GB/월)을 넘어 앱이 멈췄다. 1분마다 도는 일꾼·지시일꾼·원고받기가
   v3_원고·v3_품목·v3_지시를 매번 통째로(200~400KB) 받아 아이맥 혼자 하루 1.5GB를 썼다.
- 캐시 ~/Library/Caches/zerogardening/<표>.json — 매분 따로 뜨는 세 일꾼이 같이 쓴다(바꿔치기로 써서 안 깨진다)
- 평소엔 `수정시각 > 마지막 본 값 - 10초` 줄만 받는다(늦게 커밋된 줄을 놓치지 않게 10초 겹침).
  수정시각은 서버 트리거(v3_손댐)가 찍는다 — 지움(삭제됨=true)도 수정시각이 바뀌어 같이 온다
- 🔴 진짜 DELETE(푸시.py 구독지우기)는 수정시각으로 안 잡힌다 → 6시간마다 통째로 다시 받는다 · 그 자리는 빼기()
- gzip 으로 받는다(약 1/4) · 1000줄씩 나눠 받는다(서버가 한 번에 1000줄까지만 준다 — v3_원고 929줄)
"""
import gzip
import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/'
방 = Path.home() / 'Library' / 'Caches' / 'zerogardening'
통째초 = 6 * 3600
겹침초 = 10
칸 = 'select=id,내용,삭제됨,수정시각'


def _키():
    f = Path.home() / '.zg_supabase_key'
    if not f.exists():
        sys.exit('❌ 키가 없다: ~/.zg_supabase_key')
    return f.read_text().strip()


def _받기(표, 질의):
    """1000줄씩 끝까지. 🔴 urllib 은 HTTPError 를 그대로 올린다 — 지시함.줄들()이 404(표 없음)를 가린다"""
    k, 다, n = _키(), [], 0
    while True:
        길 = (주소 + urllib.parse.quote(표) + '?'
              + urllib.parse.quote('%s&limit=1000&offset=%d' % (질의, n), safe='=&,.*():'))
        req = urllib.request.Request(길, headers={'apikey': k, 'Authorization': 'Bearer ' + k,
                                                 'Accept-Encoding': 'gzip'})
        with urllib.request.urlopen(req, timeout=30) as r:
            살 = r.read()
            if r.headers.get('Content-Encoding') == 'gzip':
                살 = gzip.decompress(살)
        줄 = json.loads(살) if 살 else []
        다 += 줄
        if len(줄) < 1000:
            return 다
        n += 1000


def _때(s):
    """PostgREST 시각 → datetime. 파이썬 3.9 fromisoformat 은 소수 자릿수가 6이 아니면 못 읽는다"""
    s = s.replace('Z', '+00:00').replace(' ', 'T')
    몸, 끝 = s[:-6], s[-6:]
    if '.' in 몸:
        앞, 소 = 몸.split('.')
        몸 = 앞 + '.' + (소 + '000000')[:6]
    return datetime.fromisoformat(몸 + 끝)


def _파일(표):
    return 방 / (표 + '.json')


def _쓰기(표, 캐):
    방.mkdir(parents=True, exist_ok=True)
    fd, 임시 = tempfile.mkstemp(dir=str(방), suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(캐, f, ensure_ascii=False)
    os.replace(임시, str(_파일(표)))


def _읽기(표):
    try:
        return json.loads(_파일(표).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def 줄들(표, 통째=False):
    캐 = _읽기(표)
    이제 = time.time()
    if 통째 or not 캐 or not 캐.get('마지막') or 이제 - (캐.get('통째때') or 0) > 통째초:
        받은 = _받기(표, 칸 + '&order=id')
        캐 = {'통째때': 이제, '마지막': '', '줄': {}}
    else:
        뒤 = (_때(캐['마지막']) - timedelta(seconds=겹침초)).isoformat()
        받은 = _받기(표, 칸 + '&수정시각=gt.' + 뒤 + '&order=수정시각,id')
    for r in 받은:
        캐['줄'][r['id']] = r
    시각들 = [r['수정시각'] for r in 받은 if r.get('수정시각')] + ([캐['마지막']] if 캐['마지막'] else [])
    if 시각들:
        캐['마지막'] = max(시각들, key=_때)
    _쓰기(표, 캐)
    return [캐['줄'][i] for i in sorted(캐['줄'])]


def 빼기(표, 줄id):
    """서버에서 진짜 DELETE 한 줄을 캐시에서도 뺀다(수정시각으로는 안 잡힌다)"""
    캐 = _읽기(표)
    if 캐 and 캐.get('줄', {}).pop(줄id, None) is not None:
        _쓰기(표, 캐)


if __name__ == '__main__':
    # python3 통합관리/도구/줄캐시.py v3_품목 [통째]  — 줄 수와 마지막 시각만 찍는다
    t = sys.argv[1] if len(sys.argv) > 1 else 'v3_품목'
    다 = 줄들(t, 통째='통째' in sys.argv[2:])
    print(t, len(다), '줄 · 마지막', (_읽기(t) or {}).get('마지막'))
