"""주문번호 장부(v3_주문번호 · 35단계) 1회 채우기 — 이미 쓴 문자주문·예약 번호를 장부에 넣어 앱이 다시 안 주게 한다.
쓰는 법: python3 도구/주문번호장부채우기.py          → 넣을 것만 센다(안 씀)
        python3 도구/주문번호장부채우기.py --진짜   → 넣는다(두 번 돌려도 이미 있는 건 건너뜀)
읽는 곳: v3_문자주문(올린주문번호 · 예약 원본줄들 번호) · v3_주문(판매처 문자 · YYMMDD-NN)"""
import json, pathlib, re, sys, time, urllib.error, urllib.parse, urllib.request
BASE = "https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/"
키 = (pathlib.Path.home() / ".zg_supabase_key").read_text().strip()
머리 = {"apikey": 키, "Authorization": "Bearer " + 키}
모양 = re.compile(r"^\d{6}-\d+$")

def 부르기(p, 몸=None):
    r = urllib.request.Request(BASE + urllib.parse.quote(p, safe="/?=&,.*()%"), headers=dict(머리, **({"Content-Type": "application/json", "Prefer": "resolution=ignore-duplicates,return=minimal"} if 몸 else {})),
                               data=json.dumps(몸).encode() if 몸 else None, method="POST" if 몸 else "GET")
    with urllib.request.urlopen(r, timeout=120) as 답:
        t = 답.read()
    return json.loads(t) if t else None

def 전부(p):
    줄들, 끝 = [], 0
    while True:
        b = 부르기(p + "&order=id&limit=1000&offset=%d" % 끝); 줄들 += b; 끝 += 1000
        if len(b) < 1000: return 줄들

try: 있는 = 전부("v3_주문번호?select=id,문자주문id")
except urllib.error.HTTPError as e:
    if "--진짜" in sys.argv: raise SystemExit("장부 표가 없습니다 — v3/설계/35단계-주문번호장부.sql 먼저 (%s)" % e.code)
    print("(장부 표 아직 없음 — SQL 전이라 0으로 셈)"); 있는 = []
쓴번호 = {r["id"] for r in 있는}; 쓴id = {r["문자주문id"] for r in 있는 if r["문자주문id"]}
넣을 = {}   # 번호 → 문자주문id(또는 None)
def 담기(번호, sid, 어디):
    번호 = str(번호 or "").strip()
    if not 모양.match(번호) or 번호 in 쓴번호: return
    if sid in 쓴id: sid = None   # 한 문자주문에 번호 둘(옛 겹침) — 앞 번호만 그 주문에, 뒤 번호는 주인 없이 막아만 둔다
    if 번호 in 넣을:
        if sid and not 넣을[번호]: 넣을[번호] = sid; 쓴id.add(sid)
        elif sid and 넣을[번호] != sid: print("  같은 번호에 다른 문자주문:", 번호, 넣을[번호], sid, "(", 어디, ")")
        return
    넣을[번호] = sid
    if sid: 쓴id.add(sid)

문자 = [r for r in 전부("v3_문자주문?select=id,내용,삭제됨") if not r["삭제됨"]]
for r in 문자: 담기(r["내용"].get("올린주문번호"), r["id"], "문자주문")
for r in 문자:
    for o in r["내용"].get("원본줄들") or []: 담기(o.get("주문번호"), r["id"], "예약원본")
주문 = [r for r in 전부("v3_주문?select=id,내용,삭제됨&내용->>판매처=eq.문자") if not r["삭제됨"]]
for r in 주문: 담기(r["내용"].get("주문번호"), r["내용"].get("문자주문id"), "주문")

print("장부에 이미 %d · 넣을 번호 %d (문자주문 %d줄 · 문자 주문 줄 %d개 읽음)" % (len(있는), len(넣을), len(문자), len(주문)))
if "--진짜" not in sys.argv:
    print("안 씀 — 넣으려면 --진짜"); sys.exit(0)
지금 = int(time.time() * 1000)
줄 = [{"id": n, "문자주문id": s, "내용": {"때": 지금, "기기": "채우기"}} for n, s in sorted(넣을.items())]
for i in range(0, len(줄), 500): 부르기("v3_주문번호?on_conflict=id", 줄[i:i + 500])
뒤 = 전부("v3_주문번호?select=id")
print("넣음 → 장부 %d줄 (다시 읽음)" % len(뒤))
