#!/usr/bin/env python3
"""폰에서 올린 상품 사진을 맥으로 받는다 (15단계 A).

    python3 통합관리/도구/사진받기.py          # 안 받은 것만 받는다
    python3 통합관리/도구/사진받기.py 다시      # 이미 있는 것도 새로 받아 덮는다

Supabase Storage 의 공개 버킷 `product` 에 `{품목코드}/1.jpg … 11.jpg` 로 들어 있다.
품목코드로 v3_품목 에서 유통명을 찾아 `~/이미지/{식물}/` 에 번호 그대로 떨군다 —
그 자리가 상품/_도구 의 제작 도구들이 원료를 찾는 곳이다.

🔴 멱등이다. 두 번 돌려도 늘지 않는다. 이미 있는 파일은 건너뛴다(「다시」면 덮는다).
🔴 열쇠·REST 호출·폴더명 규칙은 제작요청.py 것을 그대로 쓴다 — 규칙이 갈리면 폴더가 둘로 갈린다.
"""
import sys, json, urllib.request, urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키, 부르기, 표, 폴더명, 원본사진방   # noqa: E402

창고 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/storage/v1/'
버킷 = 'product'
번호들 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']   # 6~9 는 추가라 없으면 건너뛴다
필수 = {'1', '2', '3', '4', '5', '10', '11'}


def 창고부르기(길, 몸=None):
    k = 키()
    req = urllib.request.Request(
        창고 + 길, method='POST' if 몸 is not None else 'GET',
        data=json.dumps(몸).encode() if 몸 is not None else None,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b'null')


def 목록(길=''):
    """그 폴더 바로 아래 이름들. Storage 의 list 는 한 겹씩만 준다"""
    답 = 창고부르기('object/list/' + 버킷,
                    {'prefix': 길, 'limit': 1000, 'offset': 0,
                     'sortBy': {'column': 'name', 'order': 'asc'}}) or []
    return [x['name'] for x in 답]


def 내려받기(길):
    k = 키()
    req = urllib.request.Request(창고 + 'object/' + 버킷 + '/' + urllib.parse.quote(길),
                                 headers={'apikey': k, 'Authorization': 'Bearer ' + k})
    with urllib.request.urlopen(req) as r:
        return r.read()


def 유통명표():
    줄 = 부르기(표('v3_품목') + '?select=id,내용') or []
    return {r['id']: (r.get('내용') or {}).get('유통명', '') for r in 줄}


def 받기(덮을까):
    이름표 = 유통명표()
    코드들 = [n for n in 목록('') if n in 이름표]
    낯선것 = [n for n in 목록('') if n not in 이름표 and not n.startswith('.')]
    if 낯선것:
        print('  ⚠️  통합관리에 없는 품목코드는 건너뛴다 —', ' · '.join(낯선것))

    받은수, 건너뛴수 = 0, 0
    for 코드 in 코드들:
        유통명 = 이름표[코드]
        if not 유통명:
            print('  ⚠️  유통명이 비어 건너뛴다 —', 코드)
            continue
        방 = 원본사진방 / 폴더명(유통명)
        있는것 = set(목록(코드))
        찍을것 = [n for n in 번호들 if n + '.jpg' in 있는것]
        if not 찍을것:
            continue
        방.mkdir(parents=True, exist_ok=True)
        새로받은 = []
        for n in 찍을것:
            나갈곳 = 방 / (n + '.jpg')
            if 나갈곳.exists() and not 덮을까:
                건너뛴수 += 1
                continue
            나갈곳.write_bytes(내려받기(코드 + '/' + n + '.jpg'))
            새로받은.append(n)
            받은수 += 1
        print('  ✅' if 새로받은 else '  ·', 방.name,
              '— ' + ' · '.join(새로받은) + '.jpg' if 새로받은 else '— 이미 다 있다',
              '(' + str(len([n for n in 찍을것 if n in 필수])) + '/7)')
    print('받았다 — 새로', 받은수, '장 · 이미 있어 건너뛴 것', 건너뛴수, '장 ·', 원본사진방)


if __name__ == '__main__':
    받기('다시' in sys.argv)
