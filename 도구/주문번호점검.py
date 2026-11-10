"""문자주문 주문번호 겹침 점검 — 같은 번호에 다른 문자주문·다른 사람이 붙은 것을 찾는다(11/10 조춘성=현진희 건).
쓰는 법: python3 도구/주문번호점검.py   → 겹친 번호가 없으면 「겹침 0」 한 줄"""
import json, pathlib, urllib.parse, urllib.request, collections
BASE = "https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/"
키 = (pathlib.Path.home() / ".zg_supabase_key").read_text().strip()
def 받기(p):
    r = urllib.request.Request(BASE + urllib.parse.quote(p, safe="/?=&,.*()%"), headers={"apikey": 키, "Authorization": "Bearer " + 키})
    return json.load(urllib.request.urlopen(r, timeout=120))
줄들, 끝 = [], 0
while True:
    b = 받기("v3_주문?select=id,내용,삭제됨&내용->>판매처=eq.문자&order=id&limit=1000&offset=%d" % 끝); 줄들 += b; 끝 += 1000
    if len(b) < 1000: break
모 = collections.defaultdict(set)
for r in 줄들:
    if r["삭제됨"]: continue
    c = r["내용"]; n = c.get("주문번호")
    if n: 모[n].add((c.get("문자주문id") or "-", c.get("수령인") or "", (c.get("수령인전화") or "")[-4:]))
겹 = {n: v for n, v in 모.items() if len({x[0] for x in v}) > 1 or len({(x[1], x[2]) for x in v}) > 1}
print("겹침 %d (문자 주문 줄 %d개 점검)" % (len(겹), len(줄들)))
for n, v in sorted(겹.items()): print(" ", n, " / ".join("%s(%s)" % (x[1], x[2]) for x in sorted(v)))
