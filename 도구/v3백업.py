# v3 표(v3_로 시작하는 Supabase 표 전부)를 날짜 폴더에 통째로 내려받는다. 자동백업.sh 가 부른다.
# 표 목록은 서버에 물어서 정한다 — 표가 새로 생겨도 여기를 안 고쳐도 된다.
# 삭제됨 줄까지 그대로 받는다(되살릴 때 필요하다). 받은 줄 수가 서버 개수와 다르면 실패로 친다.
#   python3 도구/v3백업.py           ← 손으로 한 번 돌려 볼 때
import json, pathlib, shutil, sys, urllib.parse, urllib.request
from datetime import date

BASE = "https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/"
KEEP = 60   # 날짜 폴더 60개만 남긴다
키 = (pathlib.Path.home() / ".zg_supabase_key").read_text().strip()
밖 = pathlib.Path(__file__).resolve().parent.parent / "백업" / "자동"


def 부르기(길, 머리=None):
    req = urllib.request.Request(BASE + urllib.parse.quote(길, safe="/?=&,.*()%"),
                                 headers=dict({"apikey": 키, "Authorization": "Bearer " + 키}, **(머리 or {})))
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read() or b"null"), r.headers


def 표목록():
    d, _ = 부르기("")
    return sorted(p.strip("/") for p in d.get("paths", {}) if p.startswith("/v3_"))


def 통째(표):
    줄들 = []
    while True:
        b, _ = 부르기("%s?select=*&order=id&limit=1000&offset=%d" % (표, len(줄들)))
        줄들 += b
        if len(b) < 1000:
            return 줄들


def 서버개수(표):
    _, h = 부르기("%s?select=id&limit=1" % 표, {"Prefer": "count=exact"})
    return int(h.get("Content-Range", "*/0").split("/")[-1])


def main():
    표들 = 표목록()
    if not 표들:
        sys.exit("❌ v3 표를 하나도 못 찾았다 — 키가 service_role 인지 본다")
    오늘 = 밖 / ("v3-" + date.today().isoformat())
    임시 = 밖 / (".v3-임시-" + date.today().isoformat())
    shutil.rmtree(임시, ignore_errors=True)
    임시.mkdir(parents=True)
    요약 = []
    for 표 in 표들:
        줄들 = 통째(표)
        n = 서버개수(표)
        if len(줄들) != n:
            shutil.rmtree(임시, ignore_errors=True)
            sys.exit("❌ %s — 받은 %d줄 ≠ 서버 %d줄" % (표, len(줄들), n))
        (임시 / (표 + ".json")).write_text(json.dumps(줄들, ensure_ascii=False), encoding="utf-8")
        요약.append("%s %d" % (표[3:], n))
    shutil.rmtree(오늘, ignore_errors=True)
    임시.rename(오늘)
    for 옛 in sorted(밖.glob("v3-*"))[:-KEEP]:
        shutil.rmtree(옛, ignore_errors=True)
    print("✅ v3 %d개 표 → %s (%s)" % (len(표들), 오늘, " · ".join(요약)))


main()
