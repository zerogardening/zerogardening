#!/usr/bin/env python3
"""통합관리 재고 탭에서 넘어온 일감을 받고, 채운 것을 되돌려 준다 (13단계).

    python3 통합관리/도구/제작요청.py          # 받기 — 대기 중인 요청을 파일로 꺼낸다
    python3 통합관리/도구/제작요청.py 올리기    # 식물정보 채운 것을 통합관리로 되돌린다

받기가 하는 일
  상세페이지 → 상품/품목/{품목}/입력.md 를 만들고 상품/제작대기.md 에 한 줄. 상품팀 착수점이다
  식물정보   → 통합관리/식물정보/대기.json 에 빈 칸 7개. 채운 뒤 「올리기」를 부른다

🔴 이미 있는 입력.md 는 덮지 않는다. 올리기도 이미 값이 있는 칸은 건드리지 않는다.
🔴 service_role 키가 있어야 한다 — 자동백업.sh 와 같은 파일을 쓴다:
     echo '키내용' > ~/.zg_supabase_key && chmod 600 ~/.zg_supabase_key
"""
import json, sys, urllib.request, urllib.parse
from datetime import datetime
from pathlib import Path

주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/'
뿌리 = Path(__file__).resolve().parents[2]          # 제로가드닝/
품목방 = 뿌리 / '상품' / '품목'
제작대기 = 뿌리 / '상품' / '제작대기.md'
식물정보방 = 뿌리 / '통합관리' / '식물정보'
대기파일 = 식물정보방 / '대기.json'
특성칸 = ['최대높이', '최대너비', '내한성', '물주기', '햇빛', '개화기', '관리특이사항']
고를수있는값 = {
    '최대높이': '숫자만 (cm). 예 60',
    '최대너비': '숫자만 (cm). 예 45',
    '내한성': ['Zone2', 'Zone3', 'Zone4', 'Zone5', 'Zone6', 'Zone7', 'Zone8', 'Zone9', 'Zone10'],
    '물주기': ['자주', '보통', '적게', '건조', '다습'],
    '햇빛': ['양지', '양지-반음지', '반음지', '반음지-음지', '음지'],
    '개화기': '예 6~9월. 꽃이 볼거리가 아니면 비워 둔다',
    '관리특이사항': '재배·관리 유의점 1~2가지. 동봉카드에 그대로 인쇄된다 (100자 안쪽)'
}


def 키():
    f = Path.home() / '.zg_supabase_key'
    if not f.exists():
        sys.exit('❌ 키가 없다: ~/.zg_supabase_key — Supabase 대시보드 → Settings → API 의 '
                 'service_role 키를 넣는다:\n   echo \'키내용\' > ~/.zg_supabase_key && chmod 600 ~/.zg_supabase_key')
    return f.read_text().strip()


def 부르기(길, 방법='GET', 몸=None):
    k = 키()
    req = urllib.request.Request(
        주소 + 길, method=방법,
        data=json.dumps(몸, ensure_ascii=False).encode() if 몸 is not None else None,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k,
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    with urllib.request.urlopen(req) as r:
        살 = r.read()
        return json.loads(살) if 살 else None


def 표(이름):
    return urllib.parse.quote(이름)


def 요청들(상태):
    """v3_제작요청 에서 그 상태인 것만. 표가 작아 통째로 받아 파이썬에서 거른다"""
    줄 = 부르기(표('v3_제작요청') + '?select=id,내용,삭제됨') or []
    return [r for r in 줄 if not r.get('삭제됨') and (r.get('내용') or {}).get('상태') == 상태]


def 상태바꾸기(행, 새상태, 덧=None):
    내용 = dict(행['내용'])
    내용['상태'] = 새상태
    if 덧:
        내용.update(덧)
    부르기(표('v3_제작요청') + '?id=eq.' + urllib.parse.quote(행['id']), 'PATCH', {'내용': 내용})


def 폴더명(유통명):
    return '-'.join(str(유통명).split())


# ══════════════════════════════════════════════ 받기

입력틀 = """# 입력 — {유통명}

| 항목 | 값 |
|---|---|
| 식물명(국명) | {유통명} |
| 학명 | *{학명}* |
| 화분 규격 | **{규격}cm화분** |
| 상품명 | `{유통명} {규격}cm화분` |

> 🔴 **학명은 통합관리 입고 등록값이다 — 리서치로 확정할 것.** 매입처 택이 틀린 전례가 있다(아스타 3종).
> 🔴 **「식물명」 칸은 esmplus 사진 폴더명이다** — 여기가 틀리면 `검수.py` 가 사진 6장을 전부 404로 본다.

통합관리 재고 탭에서 {날짜} 요청 · 품목코드 `{품목코드}`
"""


def 상세페이지받기(행, 오늘):
    내 = 행['내용']
    폴더 = 폴더명(내.get('유통명'))
    if not 폴더:
        print('  ⚠️  유통명이 비어 건너뛴다 —', 내.get('품목코드'))
        return None
    방 = 품목방 / 폴더
    파일 = 방 / '입력.md'
    if 파일.exists():
        print('  ·', 폴더, '— 입력.md 가 이미 있어 그대로 뒀다')
    else:
        방.mkdir(parents=True, exist_ok=True)
        파일.write_text(입력틀.format(
            유통명=내.get('유통명', ''), 학명=내.get('학명', '') or '(모름)',
            규격=내.get('규격cm', ''), 날짜=오늘, 품목코드=내.get('품목코드', '')), encoding='utf-8')
        print('  ✅', 파일.relative_to(뿌리))

    사진방 = 방 / '사진'
    있는것 = {p.stem for p in 사진방.glob('*')} if 사진방.is_dir() else set()
    없는것 = [n for n in ('1', '2', '3', '4', '10', '11') if n not in 있는것]
    if 없는것:
        print('     📷 사진 없음:', ' · '.join(없는것), '— researcher 는 돌 수 있지만 assembler 는 못 간다')
    return 폴더


def 대기줄넣기(줄들):
    if not 줄들:
        return
    머리 = ('# 제작 대기\n\n> 통합관리 재고 탭에서 넘어온 상세페이지 일감이다.\n'
            '> 상품 창에서 「제작대기 처리해줘」 — 팀장이 위에서부터 돈다. 끝나면 그 줄을 지운다.\n\n')
    있던것 = 제작대기.read_text(encoding='utf-8') if 제작대기.exists() else 머리
    # 같은 품목이 두 번 실리지 않게 — 아직 안 끝난 줄이 있으면 그대로 둔다
    새줄 = [줄 for 줄 in 줄들 if 줄.split(' — ')[0].replace('- [ ] ', '') not in 있던것]
    if not 새줄:
        print('  ·', 제작대기.relative_to(뿌리), '— 이미 올라 있는 것뿐이라 그대로 뒀다')
        return
    제작대기.write_text(있던것.rstrip('\n') + '\n' + '\n'.join(새줄) + '\n', encoding='utf-8')
    print('  ✅', 제작대기.relative_to(뿌리), '에', len(새줄), '줄')


def 식물정보받기(행들):
    품목 = {r['id']: (r.get('내용') or {}) for r in (부르기(표('v3_품목') + '?select=id,내용') or [])}
    묶음 = {'고를수있는값': 고를수있는값, '품목': []}
    if 대기파일.exists():
        try:
            묶음 = json.loads(대기파일.read_text(encoding='utf-8'))
            묶음['고를수있는값'] = 고를수있는값
        except json.JSONDecodeError:
            sys.exit('❌ ' + str(대기파일) + ' 이 깨졌다 — 손으로 고친 뒤 다시 돌린다')
    있는id = {x.get('요청id') for x in 묶음['품목']}

    for 행 in 행들:
        if 행['id'] in 있는id:
            continue
        내 = 행['내용']
        기존 = (품목.get(내.get('품목코드'), {}).get('특성') or {})
        묶음['품목'].append({
            '요청id': 행['id'], '품목코드': 내.get('품목코드'), '유통명': 내.get('유통명'),
            '학명': 내.get('학명'), '규격cm': 내.get('규격cm'),
            '특성': {n: str(기존.get(n) or '') for n in 특성칸}
        })
    식물정보방.mkdir(parents=True, exist_ok=True)
    대기파일.write_text(json.dumps(묶음, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('  ✅', 대기파일.relative_to(뿌리), '—', len(묶음['품목']), '종 대기')
    print('     빈 칸을 채운 뒤:  python3 통합관리/도구/제작요청.py 올리기')


def 받기():
    행들 = 요청들('대기')
    if not 행들:
        print('대기 중인 요청이 없다.')
        return
    오늘 = datetime.now().strftime('%Y-%m-%d')
    상세 = [r for r in 행들 if r['내용'].get('종류') == '상세페이지']
    정보 = [r for r in 행들 if r['내용'].get('종류') == '식물정보']

    if 상세:
        print('📄 상세페이지', len(상세), '종')
        줄들 = []
        for 행 in 상세:
            폴더 = 상세페이지받기(행, 오늘)
            if 폴더:
                줄들.append('- [ ] {} — {}cm화분 · 요청 {}'.format(폴더, 행['내용'].get('규격cm', ''), 오늘))
        대기줄넣기(줄들)
    if 정보:
        print('🌱 식물정보', len(정보), '종')
        식물정보받기(정보)

    for 행 in 상세 + 정보:
        상태바꾸기(행, '받음', {'받은일시': datetime.now().isoformat(timespec='seconds')})
    print('받았다 —', len(행들), '건을 「받음」으로 표시했다. 통합관리 화면에 「진행중」으로 바뀐다.')


# ══════════════════════════════════════════════ 올리기

def 올리기():
    if not 대기파일.exists():
        sys.exit('❌ ' + str(대기파일) + ' 이 없다 — 먼저 「받기」를 돌린다')
    묶음 = json.loads(대기파일.read_text(encoding='utf-8'))
    품목 = {r['id']: r for r in (부르기(표('v3_품목') + '?select=id,내용') or [])}
    요청 = {r['id']: r for r in 요청들('받음')}

    남은것, 올린수 = [], 0
    for 것 in 묶음.get('품목', []):
        채운것 = {n: str(v).strip() for n, v in (것.get('특성') or {}).items() if str(v).strip()}
        줄 = 품목.get(것.get('품목코드'))
        if not 채운것 or not 줄:
            if not 줄:
                print('  ⚠️  통합관리에 없는 품목이다 —', 것.get('품목코드'))
            else:
                print('  ·', 것.get('유통명'), '— 아직 비어 있어 그대로 둔다')
            남은것.append(것)
            continue

        내용 = dict(줄.get('내용') or {})
        특성 = dict(내용.get('특성') or {})
        더한것 = []
        for n in 특성칸:
            # 🔴 이미 값이 있는 칸은 건드리지 않는다 — 우람님이 적어 두신 것이 이긴다
            if 채운것.get(n) and not str(특성.get(n) or '').strip():
                특성[n] = 채운것[n]
                더한것.append(n)
        if 더한것:
            내용['특성'] = 특성
            내용['수정일시'] = int(datetime.now().timestamp() * 1000)
            부르기(표('v3_품목') + '?id=eq.' + urllib.parse.quote(줄['id']), 'PATCH', {'내용': 내용})
            올린수 += 1
            print('  ✅', 것.get('유통명'), '—', ' · '.join(더한것))
        else:
            print('  ·', 것.get('유통명'), '— 이미 다 차 있어 안 건드렸다')
        if 것.get('요청id') in 요청:
            상태바꾸기(요청[것['요청id']], '끝')

    묶음['품목'] = 남은것
    대기파일.write_text(json.dumps(묶음, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('올렸다 —', 올린수, '종. 남은 것', len(남은것), '종.')


if __name__ == '__main__':
    (올리기 if len(sys.argv) > 1 and sys.argv[1] == '올리기' else 받기)()
