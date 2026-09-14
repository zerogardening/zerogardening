#!/usr/bin/env python3
"""폰에서 올린 상품 사진을 맥으로 받는다 (15단계 A).

    python3 통합관리/도구/사진받기.py          # 안 받은 것만 받는다
    python3 통합관리/도구/사진받기.py 다시      # 이미 있는 것도 새로 받아 덮는다

Supabase Storage 의 공개 버킷 `product` 에 `{품목코드}/1.jpg … 11.jpg` 로 들어 있다.
품목코드로 v3_품목 에서 유통명을 찾아 `~/이미지/{식물}/` 에 번호 그대로 떨군다 —
그 자리가 상품/_도구 의 제작 도구들이 원료를 찾는 곳이다.

🔴 창고 쪽이 더 새것이면 덮는다 — 폰에서 사진을 갈아 끼우면 맥에도 갈린다.
🔴 멱등이다. 안 바뀐 것은 건너뛰니 두 번 돌려도 늘지도, 다시 받지도 않는다.
🔴 열쇠·REST 호출·폴더명 규칙은 제작요청.py 것을 그대로 쓴다 — 규칙이 갈리면 폴더가 둘로 갈린다.
"""
import os, sys, json, urllib.request, urllib.parse
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키, 부르기, 표, 폴더명, 원본사진방   # noqa: E402

창고 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/storage/v1/'
버킷 = 'product'
번호들 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']   # 6~9 는 추가라 없으면 건너뛴다
# 🔴 품목마다 다르다 — 제작요청.py 의 `필수사진()`. 구근은 넷이다 (2026-09-14)
from 제작요청 import 필수사진   # noqa: E402


def 창고부르기(길, 몸=None):
    k = 키()
    req = urllib.request.Request(
        창고 + 길, method='POST' if 몸 is not None else 'GET',
        data=json.dumps(몸).encode() if 몸 is not None else None,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b'null')


def 목록때(길=''):
    """그 폴더 바로 아래 {이름: 올린때(초)}. Storage 의 list 는 한 겹씩만 준다"""
    답 = 창고부르기('object/list/' + 버킷,
                    {'prefix': 길, 'limit': 1000, 'offset': 0,
                     'sortBy': {'column': 'name', 'order': 'asc'}}) or []
    return {x['name']: 초로(x.get('updated_at') or x.get('created_at')) for x in 답}


def 목록(길=''):
    return list(목록때(길))


def 초로(때):
    """`2026-09-12T04:20:11.123Z` → epoch 초. 못 읽으면 0 — 0 이면 늘 새로 받는다"""
    if not 때:
        return 0
    try:
        return datetime.fromisoformat(때.replace('Z', '+00:00')).timestamp()
    except ValueError:
        return 0


def 내려받기(길):
    k = 키()
    req = urllib.request.Request(창고 + 'object/' + 버킷 + '/' + urllib.parse.quote(길),
                                 headers={'apikey': k, 'Authorization': 'Bearer ' + k})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def 품목표():
    """{품목코드: 내용}. 🔴 유통명만 갖고는 구근인지 모른다 — 규격도 봐야 한다 (2026-09-14)"""
    줄 = 부르기(표('v3_품목') + '?select=id,내용') or []
    return {r['id']: (r.get('내용') or {}) for r in 줄}


def 받기(덮을까):
    이름표 = 품목표()
    코드들 = [n for n in 목록('') if n in 이름표]
    낯선것 = [n for n in 목록('') if n not in 이름표 and not n.startswith('.')]
    if 낯선것:
        print('  ⚠️  통합관리에 없는 품목코드는 건너뛴다 —', ' · '.join(낯선것))

    # 🔴 같은 유통명을 쓰는 품목코드가 둘이면 **규격이 갈린 상품**이다 (2026-09-14).
    #    폴더는 유통명 하나뿐이라, 그냥 받으면 나중 것이 앞엣것을 번호째 덮는다.
    #    실제로 향등골나물 '알바' 가 그랬다 — `EUA01-10` 의 실촬영이 `EUA01-15` 것을 덮어
    #    15cm 상세페이지에 10cm 화분 사진이 「지름 15cm」를 달고 나갔다.
    #    🔴 **일곱 장 전부** 규격 꼬리표를 붙인다 (2026-09-14 우람님).
    #    처음엔 실촬영(10·11)만 갈랐는데, 창고를 보니 1·3·4 도 규격마다 다른 사진이었다
    #    — 우람님이 규격별로 따로 찍어 올리신다. 골라 가르면 또 뒤섞인다.
    같은이름 = {}
    for c in 코드들:
        같은이름.setdefault((이름표[c].get('유통명') or ''), []).append(c)

    받은수, 건너뛴수 = 0, 0
    for 코드 in 코드들:
        내용 = 이름표[코드]
        유통명 = 내용.get('유통명') or ''
        if not 유통명:
            print('  ⚠️  유통명이 비어 건너뛴다 —', 코드)
            continue
        방 = 원본사진방 / 폴더명(유통명)
        규격 = str(내용.get('규격cm') or '').strip()
        가른다 = len(같은이름.get(유통명, [])) > 1 and bool(규격)
        있는것 = 목록때(코드)
        찍을것 = [n for n in 번호들 if n + '.jpg' in 있는것]
        if not 찍을것:
            continue
        방.mkdir(parents=True, exist_ok=True)
        새로받은 = []
        for n in 찍을것:
            나갈곳 = 방 / ((f'{n}-{규격}.jpg') if 가른다 else (n + '.jpg'))
            # 창고 쪽이 더 새것이면 덮는다 — 폰에서 갈아 끼운 사진이 맥에도 와야 한다
            if 나갈곳.exists() and not 덮을까 and 있는것[n + '.jpg'] <= 나갈곳.stat().st_mtime:
                건너뛴수 += 1
                continue
            나갈곳.write_bytes(내려받기(코드 + '/' + n + '.jpg'))
            # 파일 시각을 창고 시각에 맞춘다 — 맥 시계가 서버와 어긋나도 매번 다시 받지 않는다
            if 있는것[n + '.jpg']:
                os.utime(나갈곳, (있는것[n + '.jpg'], 있는것[n + '.jpg']))
            새로받은.append(n)
            받은수 += 1
        if 가른다:
            print(f'  🔴 {방.name} — 같은 이름에 규격이 둘이다({"·".join(같은이름[유통명])}). '
                  f'사진을 통째로 `{{번호}}-{규격}.jpg` 로 받는다')
        print('  ✅' if 새로받은 else '  ·', 방.name,
              '— ' + ' · '.join(새로받은) + '.jpg' if 새로받은 else '— 이미 다 있다',
              '(%d/%d)' % (len([n for n in 찍을것 if n in 필수사진(내용)]), len(필수사진(내용))))
    print('받았다 — 새로', 받은수, '장 · 이미 있어 건너뛴 것', 건너뛴수, '장 ·', 원본사진방)


if __name__ == '__main__':
    받기('다시' in sys.argv)
