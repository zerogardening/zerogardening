#!/usr/bin/env python3
"""품절인데 마켓에 남은 품목을 앱과 같은 길로 다시 품절한다 (2026-10-17 우람님 「다 전체 품절시켜」).

    python3 통합관리/도구/품절일괄.py SRB01-15 SOF01-15 ...

품목마다 ① Edge `market-soldout` 로 카페24 재고 0 → ② `v3_지시` 에 마켓품절 한 줄.
끝에 ③ 모음 상품(271·272·273 …)의 같은 품종 옵션 재고 0 (`상품/_도구/모음옵션품절.py` · 10/27 우람님 「모음 옵션도 전부 품절」).
   Edge 가 이미 했으면(배포 뒤) 「이미 품절」로 넘긴다 · 280 은 카페24 저장 금지라 「손으로」만 찍는다.
맥(지시일꾼)이 1분마다 집어 심폴·오픈마켓을 처리하고, 결과는 v3 품절 탭에 뜬다 (06k 와 같은 순서).
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키      # noqa: E402

집 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/'


def 카페24이름(코드, 머리):
    r = urllib.request.Request(집 + 'rest/v1/' + urllib.parse.quote('v3_품목') + '?id=eq.' + urllib.parse.quote(코드)
                               + '&select=' + urllib.parse.quote('내용'), headers=머리)
    줄 = json.loads(urllib.request.urlopen(r, timeout=30).read())
    return ((줄[0].get('내용') or {}).get('유통명') if 줄 else None) or 코드


def 하나(코드, 머리):
    이름 = 카페24이름(코드, 머리)
    try:
        r = urllib.request.Request(집 + 'functions/v1/market-soldout', method='POST', headers=머리,
                                   data=json.dumps({'품목코드': 코드, '품절': True}).encode())
        카 = json.loads(urllib.request.urlopen(r, timeout=30).read()).get('카페24') or {}
    except Exception as e:
        카 = {'됨': False, '사유': '자사몰 응답 없음 — %s' % e}
    이제 = int(time.time() * 1000)
    줄 = {'누가': '시스템', '보낸때': 이제, '상태': '대기', '갈래': '마켓품절', '품목코드': 코드, '폴더': 이름,
         '글': 이름 + ' — 오픈마켓을 품절 처리합니다.',
         '마켓': {'카페24': {'상태': '완료' if 카.get('됨') else '실패',
                            '사유': '' if 카.get('됨') else (카.get('사유') or ''), '때': 이제}}}
    몸 = json.dumps([{'id': '%d-%s' % (이제, 코드[:8]), '삭제됨': False, '내용': 줄}], ensure_ascii=False).encode()
    r = urllib.request.Request(집 + 'rest/v1/' + urllib.parse.quote('v3_지시') + '?on_conflict=id', data=몸, method='POST',
                               headers=dict(머리, Prefer='resolution=merge-duplicates'))
    urllib.request.urlopen(r, timeout=30).read()
    print('%-10s %s  카페24 %s' % (코드, 이름, '✅' if 카.get('됨') else '❌ ' + (카.get('사유') or '')[:60]))


if __name__ == '__main__':
    코드들 = sys.argv[1:]
    if not 코드들:
        sys.exit(__doc__)
    k = 키()
    머리 = {'Authorization': 'Bearer ' + k, 'apikey': k, 'Content-Type': 'application/json'}
    for c in 코드들:
        하나(c.strip(), 머리)
        time.sleep(1)
    print('\n— 모음 옵션 —')
    try:
        import importlib.util
        sp = importlib.util.spec_from_file_location('모음옵션품절', Path(__file__).resolve().parents[2] / '상품/_도구/모음옵션품절.py')
        모 = importlib.util.module_from_spec(sp); sp.loader.exec_module(모)
        c = 모.카페24(); 상품들 = 모.전부(c)        # 🔴 Edge 가 다 바꾼 뒤에 읽는다 — 먼저 읽으면 같은 옵션을 두 번 저장한다
        for 코드 in 코드들:
            모.하나(c, 상품들, 코드.strip(), True)
    except Exception as e:
        print('🔴 모음 옵션 못 함 — %s · 손으로: python3 상품/_도구/모음옵션품절.py <코드> --진짜' % e)
    print('\n%d개 쌓았다 — 맥이 하나씩 처리한다(품목당 2~3분). v3 상품 › 품절 탭에서 본다.' % len(코드들))
