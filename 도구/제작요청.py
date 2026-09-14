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
import json, re, sys, urllib.request, urllib.parse
from datetime import datetime
from pathlib import Path

주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/'
뿌리 = Path(__file__).resolve().parents[2]          # 제로가드닝/
품목방 = 뿌리 / '상품' / '품목'
제작대기 = 뿌리 / '상품' / '제작대기.md'
식물정보방 = 뿌리 / '통합관리' / '식물정보'
원본사진방 = Path.home() / '이미지'        # 🔴 우람님이 원본 사진을 넣으시는 곳 (대표 main1·main2 도 여기)
내보낼방 = Path.home() / '상세페이지'      # 🔴 발행 1~6.jpg 가 나가는 곳
#    두 곳 다 `편집.py` 가 보는 자리다 — 이름 규칙이 갈리면 못 찾는다
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
    # 🔴 칸 이름도 한글이다(내용·삭제됨). 표 이름만 감싸면 질의 쪽이 날것으로 남아
    #    http.client 가 ascii 로 못 바꾸고 넘어진다 — 주소 전체를 한 번 더 감싼다
    길 = urllib.parse.quote(길, safe='/?=&,.*()%')
    req = urllib.request.Request(
        주소 + 길, method=방법,
        data=json.dumps(몸, ensure_ascii=False).encode() if 몸 is not None else None,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k,
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    with urllib.request.urlopen(req, timeout=30) as r:
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
    """`층꽃나무 '썸머 소르벳'` → `층꽃나무-썸머-소르벳`.
    🔴 따옴표를 뗀다 (2026-09-04) — 폴더 이름에 `'` 가 들어가면 셸에서 매번 감싸야 하고,
       손으로 만든 옛 폴더(`층꽃-스털링실버`)엔 애초에 없다."""
    return '-'.join(str(유통명).replace("'", ' ').replace('"', ' ').split())


# ══════════════════════════════════════════════ 상세페이지 폼 갈래 (2026-09-14)

# 🔴 v3/js/02-품목코드.js 의 `구근낱말` 과 **같아야 한다.** 한쪽만 고치면 화면과 일감이 갈린다.
구근낱말 = ['튤립', '수선화', '무스카리', '크로커스', '히아신스', '알리움', '상사화',
          '아네모네', '라넌큘러스', '프리지아', '아마릴리스', '글라디올러스', '설강화',
          '시클라멘', '백합', '나리', '달리아', '아이리스', '칼라']


def 구근인가(내용):
    """구근이면 상세페이지 폼이 통째로 다르다 — 3구역이 잎이 아니라 심는 법이고, 사진도 넷만 쓴다.
    🔴 규격 0(규격 외)에는 구근과 뿌리묘가 섞인다(우람님 9/14 「구분은 상품명으로」).
       그래서 규격만으로 못 가른다 — 이름을 같이 본다."""
    c = 내용 or {}
    이름 = str(c.get('유통명') or '')
    if '구근' in 이름:
        return True
    # 🔴 규격 0 은 falsy 다 — `or` 로 기본값을 주면 0 이 통째로 새어 나간다 (9/14 08k 와 같은 함정)
    규격 = c.get('규격cm')
    if 규격 is None or str(규격).strip() == '':
        return False
    try:
        if int(규격) != 0:
            return False                      # 규격 외가 아니면 화분묘다
    except (TypeError, ValueError):
        return False
    return any(이름.startswith(낱) for 낱 in 구근낱말)


def 필수사진(내용):
    """다 차면 상세페이지 제작이 자동으로 걸리는 사진 번호.
    🔴 구근은 일곱 칸을 못 채운다 — 2·3·5 구역이 도해라 사진이 아예 필요 없다.
       예전엔 일곱이 박혀 있어 구근은 자동 착수가 영영 안 걸렸다."""
    return {'1', '2', '10', '11'} if 구근인가(내용) else {'1', '2', '3', '4', '5', '10', '11'}


# ══════════════════════════════════════════════ 받기

입력틀 = """# 입력 — {유통명}
{폼줄}
| 항목 | 값 |
|---|---|
| 식물명(국명) | {유통명} |
| 학명 | *{학명}* |
| 화분 규격 | **{규격}cm화분** |
| 상품명 | `{유통명} {규격}cm화분` |

> 🔴 **학명은 통합관리 입고 등록값이다 — 리서치로 확정할 것.** 매입처 택이 틀린 전례가 있다(아스타 3종).
> 🔴 **「식물명」 칸은 esmplus 사진 폴더명이다** — 여기가 틀리면 `검수.py` 가 사진 6장을 전부 404로 본다.

## 통합관리 기본정보

{기본정보}

> 🔴 **값이 있는 칸은 그대로 쓴다.** 조사해서 다른 값이 나와도 바꾸지 않는다 — 팀장에게 알린다.
> 🔴 **빈 칸은 researcher 가 채워 통합관리로 되돌린다** — `제작요청.py` 받기 → `식물정보/대기.json` → `올리기`.

통합관리 재고 탭에서 {날짜} 요청 · 품목코드 `{품목코드}`
"""


def 폼줄(내용):
    """구근이면 입력.md 머리에 못 지나치게 적는다. 화분묘면 빈 줄이다.
    🔴 이 파일이 상품팀이 맨 처음 읽는 것이라, 여기 없으면 화분묘 폼으로 만들어 버린다."""
    if not 구근인가(내용):
        return ''
    return ('\n> 🔴 **구근이다 — 상세페이지 폼이 화분묘와 다르다.**\n'
            '> **`상품/_템플릿/구근-개별상품-시안/README.md` 를 먼저 읽는다.**\n'
            '> 6구역 = 표지 · 심기 · **심는 법**(잎 자리) · How to grow · **구근 크기**(식재간격 자리) · 보내드리는 상품.\n'
            '> 사진은 **1·2·10·11 넷이 필수**이고 3·4 는 있으면 쓴다 — 2·3·5 구역이 도해라 사진이 필요 없다.\n'
            '> 🔴 **구근 사진은 6구역에만 넣는다** — 앞 구역에 또 넣으면 한 페이지에 두 번 나온다.\n')


def 기본정보표(특성):
    """입력.md 에 실을 표. 빈 칸도 줄을 남긴다 — 뭐가 비었는지 보여야 채운다"""
    줄 = ['| 항목 | 값 |', '|---|---|']
    for n in 특성칸:
        v = str((특성 or {}).get(n) or '').strip()
        줄.append('| {} | {} |'.format(n, v if v else '**(비어 있다 — 조사해서 채운다)**'))
    return '\n'.join(줄)


def 있는규격들(본문):
    """입력.md 「화분 규격」 칸에 적힌 규격 — `**10cm화분 · 15cm화분**` → ['10', '15']"""
    m = re.search(r'^\|\s*화분 규격\s*\|(.+?)\|\s*$', 본문, re.M)
    return re.findall(r'(\d+)\s*cm화분', m.group(1)) if m else []


def 발행가르기(방, 옛규격, 새규격):
    """발행이미지가 한 벌뿐인데 규격이 둘이 됐다 — 규격 폴더로 갈라 둔다 (2026-09-14).
    🔴 옛 것을 **옮긴다**(복사가 아니다). 뿌리에 남겨 두면 `편집.py 있는품목()` 이
       규격 폴더만 세어 옛 작업본이 편집기 목록에서 통째로 사라진다.
    🔴 사진은 건드리지 않는다 — 제작.html 이 `file://…/사진/10.jpg` 를 물고 있어
       이름을 바꾸면 조판이 깨진다. 검수는 꼬리표 없는 옛 이름도 받는다."""
    발행 = 방 / '발행이미지'
    옮긴것 = []
    if 옛규격 and (발행 / '제작.html').exists():
        (발행 / 옛규격).mkdir(parents=True, exist_ok=True)
        for f in sorted(발행.iterdir()):
            if f.is_file():
                f.replace(발행 / 옛규격 / f.name)
                옮긴것.append(f.name)
    (발행 / 새규격).mkdir(parents=True, exist_ok=True)
    return 옮긴것


def 규격보태기(파일, 방, 폴더, 내, 오늘):
    """같은 식물에 다른 규격이 왔다 — **버리지 않고 보탠다** (2026-09-14).
    🔴 예전엔 「입력.md 가 이미 있어 그대로 뒀다」로 조용히 버렸다. 그래서 향등골나물 '알바'
       `EUA01-10` 이 15cm 상세페이지를 그대로 써서, 10cm 화분 사진에 「지름 15cm」가 찍혀 나갔다.
    돌려주는 값 = 이 규격을 가리키는 이름(`향등골나물-알바/10`). 보탤 것이 없으면 None."""
    본문 = 파일.read_text(encoding='utf-8')
    새규격 = str(내.get('규격cm', '')).strip()
    옛규격들 = 있는규격들(본문)
    if not 새규격 or 새규격 in 옛규격들:
        return None
    유통명, 코드 = 내.get('유통명', ''), 내.get('품목코드', '')
    끼우기 = lambda 칸, 덧: re.sub(r'^(\|\s*' + 칸 + r'\s*\|\s*)(.+?)(\s*\|)$',
                                lambda m: m.group(1) + m.group(2) + 덧 + m.group(3),
                                본문, count=1, flags=re.M)
    본문 = 끼우기('화분 규격', f' · **{새규격}cm화분**')
    본문 = 끼우기('상품명', f' · `{유통명} {새규격}cm화분`')
    옮긴것 = 발행가르기(방, 옛규격들[0] if 옛규격들 else '', 새규격)
    본문 = 본문.rstrip('\n') + (
        f'\n\n통합관리 재고 탭에서 {오늘} 요청 · 품목코드 `{코드}` ({새규격}cm)\n'
        f'\n> 🔴 **규격이 둘이다 — 상세페이지도 두 벌이다.**\n'
        f'> 원고·SEO·리서치·사진 1~5 는 한 벌을 나눠 쓰고, **규격이 박히는 5·6구역만 갈라 뽑는다.**\n'
        f'> 조판은 `발행이미지/{{규격}}/제작.html` · 도구는 `{폴더}/{{규격}}` 으로 부른다 —\n'
        f'> `검수.py {폴더}/{새규격}` · `상세설명-올리기.py {{상품번호}} {폴더}/{새규격}`.\n'
        f'> 실촬영을 규격마다 새로 올리실 때는 `사진/10-{새규격}.jpg`·`11-{새규격}.jpg` 로 넣는다.\n')
    파일.write_text(본문, encoding='utf-8')
    print(f'  🔴 {폴더} — 규격 {새규격}cm 를 보탰다 (이미 {"·".join(옛규격들)}cm 가 있었다)')
    if 옮긴것:
        print(f'     옛 작업본을 발행이미지/{옛규격들[0]}/ 로 옮겼다 — {", ".join(옮긴것)}')
    print(f'     🔴 {새규격}cm 조판은 아직 없다 — 편집기에서 「{폴더}/{새규격}」 을 새로 짠다')
    return f'{폴더}/{새규격}'


def 상세페이지받기(행, 오늘, 특성=None):
    내 = 행['내용']
    폴더 = 폴더명(내.get('유통명'))
    if not 폴더:
        print('  ⚠️  유통명이 비어 건너뛴다 —', 내.get('품목코드'))
        return None
    방 = 품목방 / 폴더
    파일 = 방 / '입력.md'
    이름 = 폴더
    if 파일.exists():
        # 🔴 규격이 다르면 보탠다 (2026-09-14). 예전엔 여기서 통째로 버려 사고가 났다
        보탠이름 = 규격보태기(파일, 방, 폴더, 내, 오늘)
        if 보탠이름:
            이름 = 보탠이름
        else:
            # 덮지는 않되 품목코드 줄만은 없으면 덧붙인다 (2026-08-21 우람님) —
            # 이 줄이 없으면 uploader 가 카페24 자체상품코드를 못 채워 재고와 짝이 안 맞는다
            본문 = 파일.read_text(encoding='utf-8')
            코드 = 내.get('품목코드', '')
            if 코드 and '품목코드' not in 본문:
                파일.write_text(본문.rstrip('\n') + '\n\n품목코드 `{}`  ← 카페24 `custom_product_code`\n'.format(코드),
                                encoding='utf-8')
                print('  ·', 폴더, '— 입력.md 는 그대로 두고 품목코드', 코드, '만 덧붙였다')
            else:
                print('  ·', 폴더, '— 입력.md 가 이미 있어 그대로 뒀다')
    else:
        방.mkdir(parents=True, exist_ok=True)
        파일.write_text(입력틀.format(
            유통명=내.get('유통명', ''), 학명=내.get('학명', '') or '(모름)',
            규격=내.get('규격cm', ''), 날짜=오늘, 품목코드=내.get('품목코드', ''),
            폼줄=폼줄(내), 기본정보=기본정보표(특성)), encoding='utf-8')
        print('  ✅', 파일.relative_to(뿌리))

    # 🔴 사진 폴더 두 곳을 같이 판다 (2026-09-04 우람님) — 「체크하면 폴더까지」.
    #    빈 폴더라도 있어야 우람님이 사진을 어디 넣을지 헤매지 않는다.
    #    이름은 품목 폴더와 똑같이 간다 — `편집.py 식물폴더()` 가 빈칸·붙임표를 떼고 맞추니
    #    옛 폴더(`공작아스타 보라`)와도 그대로 짝이 맞는다.
    for 곳 in (원본사진방, 내보낼방):
        새방 = 곳 / 폴더
        있었나 = 새방.is_dir()
        새방.mkdir(parents=True, exist_ok=True)
        if not 있었나:
            print('  📁', 새방)

    사진방 = 방 / '사진'
    있는것 = {p.stem for p in 사진방.glob('*')} if 사진방.is_dir() else set()
    없는것 = [n for n in ('1', '2', '3', '4', '10', '11') if n not in 있는것]
    if 없는것:
        print('     📷 사진 없음:', ' · '.join(없는것), '— researcher 는 돌 수 있지만 assembler 는 못 간다')
    return 이름


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
        # 기본정보를 입력.md 에 같이 실어 준다 (2026-08-21 우람님) — 표가 작아 통째로 한 번 받는다
        품목 = {r['id']: (r.get('내용') or {}) for r in (부르기(표('v3_품목') + '?select=id,내용') or [])}
        줄들 = []
        for 행 in 상세:
            이름 = 상세페이지받기(행, 오늘, 품목.get(행['내용'].get('품목코드'), {}).get('특성'))
            if 이름:
                줄들.append('- [ ] {} — {}cm화분 · 요청 {}'.format(이름, 행['내용'].get('규격cm', ''), 오늘))
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
