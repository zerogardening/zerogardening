#!/usr/bin/env python3
"""모음 저장금지(280) 옵션 → v3_지시 「허브로」 일감 줄 (11/05 찰스화이트 · 실서버 안 닿음)
    python3 통합관리/v3/검수/42-모음손품절/모음손품절-시험.py
① 맥 `상품/_도구/모음옵션품절.py` — 가짜 카페24·가짜 서버  ② Edge `edge-마켓품절/index.ts` — 모음 부분만 떼어 osascript 로"""
import copy, importlib.util, io, json, os, re, subprocess, sys, tempfile
from contextlib import redirect_stdout
from pathlib import Path

뿌리 = Path(__file__).resolve().parents[4]
결과 = []
def 본다(이름, 참):
    결과.append(bool(참)); print(('✅ ' if 참 else '❌ ') + 이름)

상품들 = [
    {'product_no': 277, 'product_name': '작약 찰스화이트', 'custom_product_code': 'PAC02-0', 'selling': 'T', 'variants': [{'variant_code': 'A', 'options': []}]},
    {'product_no': 61, 'product_name': '수선화 텔라테테', 'custom_product_code': 'NAR01-0', 'selling': 'T', 'variants': [{'variant_code': 'B', 'options': []}]},
    {'product_no': 280, 'product_name': '작약 5종 모음', 'selling': 'T', 'variants': [
        {'variant_code': 'P00000KU000E', 'use_inventory': 'T', 'quantity': 49, 'options': [{'value': '4. 작약 찰스화이트 (1개)'}]},
        {'variant_code': 'P00000KU000A', 'use_inventory': 'T', 'quantity': 49, 'options': [{'value': '1. 작약 레드참 (1개)'}]}]},
    {'product_no': 271, 'product_name': '수선화 모음', 'selling': 'T', 'variants': [
        {'variant_code': 'P0000271A', 'use_inventory': 'T', 'quantity': 9, 'options': [{'value': '1. 수선화 텔라테테 (5개)'}]},
        {'variant_code': 'P0000271B', 'use_inventory': 'T', 'quantity': 9, 'options': [{'value': '2. 수선화 아이스폴리스 (5개)'}]}]},
]

# ── ① 맥 파이썬 ──
sys.path.insert(0, str(뿌리 / '통합관리/도구'))
import 제작요청, 지시함                                   # noqa: E402
서버 = []
def 가짜부르기(길, 방법='GET', 몸=None):
    if 방법 == 'POST':
        서버.extend(copy.deepcopy(몸)); return None
    q = dict(re.findall(r'내용->>(\w+)=eq\.([^&]+)', 길))
    return [{'내용': r['내용']} for r in 서버 if not r['삭제됨'] and all(r['내용'].get(k) == v for k, v in q.items())]
제작요청.부르기 = 가짜부르기
sp = importlib.util.spec_from_file_location('모음옵션품절', 뿌리 / '상품/_도구/모음옵션품절.py')
모 = importlib.util.module_from_spec(sp); sp.loader.exec_module(모)
모.time.sleep = lambda s: None

class 가짜카페24:
    def __init__(s): s.PUT = []
    def call(s, 방법, 길, 몸=None): s.PUT.append(길)

c = 가짜카페24()
with redirect_stdout(io.StringIO()): 모.하나(c, 상품들, 'PAC02-0', False)
본다('파이 보기만이면 일감 줄 안 만듦', len(서버) == 0)
with redirect_stdout(io.StringIO()) as 찍힘: 모.하나(c, 상품들, 'PAC02-0', True)
본다('파이 280 은 카페24 저장 안 함', c.PUT == [])
본다('파이 --진짜 한 번 → 일감 줄 1개', len(서버) == 1)
본다('파이 화면엔 「손으로」 글자도 남음', '손으로(허브)' in 찍힘.getvalue() and '허브 일감 1줄' in 찍힘.getvalue())
줄 = 서버[0]['내용'] if 서버 else {}
본다('파이 줄 꼴 — 허브로·모음손품절·PAC02-0·280·작약 찰스화이트', (줄.get('상태'), 줄.get('갈래'), 줄.get('품목코드'), 줄.get('모음'), 줄.get('품종'))
     == ('허브로', '모음손품절', 'PAC02-0', 280, '작약 찰스화이트'))
본다('파이 글에 WING·빠른수정·기록 경로', all(w in 줄.get('글', '') for w in ('WING 옵션 판매중지', '빠른수정', '2026-11-05_작약모음-찰스화이트_280.md')))
본다('파이 id 꼴 = 13자리-코드', bool(re.fullmatch(r'\d{13}-PAC02-0', 서버[0]['id'] if 서버 else '')))
with redirect_stdout(io.StringIO()): 모.하나(c, 상품들, 'PAC02-0', True)
본다('파이 두 번 돌려도 1개', len(서버) == 1)
with redirect_stdout(io.StringIO()): 모.하나(c, 상품들, 'NAR01-0', True)
본다('파이 271(저장금지 아님) → 그 옵션만 카페24 재고 0 · 일감 없음', c.PUT == ['products/271/variants/P0000271A'] and len(서버) == 1)

# 허브 목록에 뜨는가 — 지시함.허브목록 을 가짜 서버로
지시함.줄들 = lambda: {r['id']: r['내용'] for r in 서버}
지시함.급함찍기 = lambda: None
지시함.적기 = lambda i, 내용, **고칠것: {**내용, **고칠것}
with redirect_stdout(io.StringIO()) as 찍힘: 지시함.허브목록()
본다('지시함.py 허브 「받을 일 1건」에 모음손품절·작약 찰스화이트', '받을 일 1건' in 찍힘.getvalue() and '모음손품절 · PAC02-0' in 찍힘.getvalue()
     and '작약 찰스화이트 옵션 손으로 품절' in 찍힘.getvalue())
본다('맥 지시함이 직접 집지 않음(허브 일)', 지시함.집을것({r['id']: r['내용'] for r in 서버}) is None)
서버[0]['내용']['상태'] = '됨'
with redirect_stdout(io.StringIO()): 모.하나(c, 상품들, 'PAC02-0', True)
본다('파이 앞 줄이 끝(됨)났으면 새로 1줄', len(서버) == 2)

# ── ② Edge — 모음 부분(const 저장금지 ~ 들어오는 문)만 떼어 타입·async 를 벗기고 가짜 카페24·db 로 ──
ts = (뿌리 / '통합관리/도구/edge-마켓품절/index.ts').read_text()
조각 = ts[ts.index('const 저장금지'):ts.index('/* ══ 들어오는 문')]
조각 = re.sub(r'^type .*$', '', 조각, flags=re.M)
조각 = re.sub(r':\s*(string|number|any|손)(\[\])?', '', 조각)
조각 = 조각.replace('async ', '').replace('await ', '')
js = r'''
const 글 = (v) => v == null ? "" : String(v);
const 다듬기 = (v) => 글(v).trim();
const 상품들 = %s;
const PUT = [], 줄 = [];
function 카페24(방법, 길, token, 몸) {
  if (방법 === "PUT") { PUT.push(길); return {}; }
  const 앞 = Number(/offset=(\d+)/.exec(길)[1]); return { products: 상품들.slice(앞, 앞 + 100) };
}
const db = { from() { const f = []; const b = {
  select() { return b; }, eq(k, v) { f.push([k.replace("내용->>", ""), v]); return b; },
  get data() { return 줄.filter(r => f.every(([k, v]) => k === "삭제됨" ? r.삭제됨 === v : r.내용[k] === v)).map(r => ({ 내용: r.내용 })); },
  error: null, insert(rows) { 줄.push(...JSON.parse(JSON.stringify(rows))); return { error: null }; } }; return b; } };
%s
const 답 = [];
let 모 = 모음옵션품절(277, "작약 찰스화이트", "t", true);
답.push(["보기 모드 PUT 없음 · 손으로 1(280)", PUT.length === 0 && 모.손으로.length === 1 && 모.손으로[0].번호 === 280]);
모 = 모음옵션품절(277, "작약 찰스화이트", "t");
let n = 허브일감("PAC02-0", "작약 찰스화이트", 모.손으로);
답.push(["280 카페24 저장 안 함", PUT.length === 0]);
답.push(["일감 줄 1개 생김", n === 1 && 줄.length === 1]);
const c = 줄[0] ? 줄[0].내용 : {};
답.push(["줄 꼴 — 허브로·모음손품절·PAC02-0·280·작약 찰스화이트", c.상태 === "허브로" && c.갈래 === "모음손품절" && c.품목코드 === "PAC02-0" && c.모음 === 280 && c.품종 === "작약 찰스화이트"]);
답.push(["글 = 파이 글", c.글 === %s]);
답.push(["id 꼴 = 13자리-코드", /^\d{13}-PAC02-0$/.test(줄[0] ? 줄[0].id : "")]);
답.push(["화면 글자 이름표", 이름표(모.손으로[0]) === "280 「작약 찰스화이트」"]);
모 = 모음옵션품절(277, "작약 찰스화이트", "t"); n = 허브일감("PAC02-0", "작약 찰스화이트", 모.손으로);
답.push(["두 번 돌려도 1개", n === 0 && 줄.length === 1]);
모 = 모음옵션품절(61, "수선화 텔라테테", "t");
답.push(["271 은 지금처럼 카페24 재고 0 · 손으로 없음", PUT.length === 1 && PUT[0] === "products/271/variants/P0000271A" && 모.손으로.length === 0 && 모.바꿈[0] === "271 「수선화 텔라테테」"]);
JSON.stringify(답);
''' % (json.dumps(상품들, ensure_ascii=False), 조각, json.dumps(모.일감글('작약 5종 모음', 280, '작약 찰스화이트'), ensure_ascii=False))
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
    f.write(js)
r = subprocess.run(['osascript', '-l', 'JavaScript', f.name], capture_output=True, text=True)
os.unlink(f.name)
if r.returncode:
    본다('Edge 조각 실행 — ' + r.stderr.strip()[:300], False)
else:
    for 이름, 참 in json.loads(r.stdout):
        본다('Edge ' + 이름, 참)

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
