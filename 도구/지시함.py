#!/usr/bin/env python3
"""폰·웹에서 쌓아 두신 지시를 맥이 꺼내 Claude 에게 시키고, 같은 줄에 답장을 적는다 (16단계).

    python3 통합관리/도구/지시함.py          # 한 건 집어 처리한다 (일꾼.py 가 60초마다 부른다)
    python3 통합관리/도구/지시함.py 보기      # 지금 쌓인 것만 찍는다 (아무것도 안 한다)

주고받는 자리는 Supabase `v3_지시` 표다. 줄 하나가 「지시 + 그 답장」이다 (16단계-지시함.sql).
🔴 열쇠·REST 호출은 제작요청.py 것을 그대로 쓴다 — 규칙이 갈리면 표가 둘로 갈린다.

🔴 위험한 일을 거르는 로직이 여기 없다. **연장으로 막는다**(`도구들`·`막을것`) —
   글로 거르면 우회당한다. Bash 는 열되 없애기·push·sudo·설치는 콕 집어 막는다.
   🔴 완벽하지 않다(`python3` 안에서는 뚫린다). 진짜 안전망은 `[야간]` 커밋 + `야간되돌리기.sh` 다.

🔴 바깥을 부르는 자리엔 **반드시 `timeout` 을 준다.** 없으면 서버가 대답을 안 할 때
   영영 매달린다 — `원고받기` 가 실제로 15시간 멈춰 서서 원고 탭이 통째로 비어 있었다
   (2026-09-14 · launchd 는 이전 인스턴스가 살아 있으면 새로 안 띄운다).

🔴 커밋·push 는 Claude 가 아니라 **이 스크립트가** 한다. 무엇이 올라가는지 여기서 다 보인다.
   그리고 **Claude 가 만진 파일만** 올린다 — 돌리기 전후의 `git status` 를 견줘서 고른다.
   `git add -A` 를 쓰지 않는다. 다른 창 작업이 딸려 나간 적이 있다.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키, 부르기, 표                     # noqa: E402

뿌리 = Path(__file__).resolve().parents[2]              # 제로가드닝/ — ops 저장소이자 Claude 가 일할 창
주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/'

# 🔴 2026-09-14 고쳤다 — 처음엔 Bash 를 통째로 안 줬다. 그랬더니 「구근 사진 넣어라」처럼
#    `사진넣기.py` 를 돌려야 하는 일이 **애초에 불가능**해져 30분을 헤매다 끊겼다.
#    이제 Bash 를 열고 **되돌릴 수 없는 것만 콕 집어 막는다**(막을것).
#    🔴 완벽하지 않다 — `python3` 를 열면 그 안에서 파일을 없앨 길은 남는다.
#       진짜 안전망은 `[야간]` 커밋 + `야간되돌리기.sh` 다.
도구들 = 'Read,Write,Edit,Glob,Grep,Bash,WebSearch,WebFetch,TodoWrite'
막을것 = ','.join([
    'Bash(rm:*)', 'Bash(rmdir:*)', 'Bash(dd:*)', 'Bash(sudo:*)',                # 없애기
    'Bash(git push:*)', 'Bash(git reset:*)', 'Bash(git clean:*)',               # 되돌릴 수 없는 git
    'Bash(git checkout:*)', 'Bash(git rebase:*)',
    'Bash(curl:*)', 'Bash(wget:*)', 'Bash(ssh:*)', 'Bash(scp:*)',               # 바깥으로 나가기
    'Bash(chmod:*)', 'Bash(chown:*)', 'Bash(launchctl:*)', 'Bash(crontab:*)',   # 이 맥 설정
    'Bash(pip:*)', 'Bash(pip3:*)', 'Bash(npm:*)', 'Bash(brew:*)',               # 설치
])
상한초 = 30 * 60          # 자유 지시 한 건에 30분. 넘으면 끊고 '실패' 로 적는다
갈래상한 = {'상세페이지': 3 * 60 * 60, '카페24올리기': 60 * 60}
#    🔴 카페24올리기는 브라우저 자동화가 **둘**이다(대표이미지·쿠팡보내기) — 로그인부터 다시 한다.
#       30분을 걸면 쿠팡 전송 도중에 끊긴다 (2026-09-14 ⑤~⑦ 을 붙이며 1시간으로 올렸다).
#    🔴 상세페이지 한 장은 리서치→원고→SEO→대표이미지→조립→검수→등록까지 평소 2~3시간이다.
#    30분을 걸면 늘 중간에 끊긴다. 갈래마다 제 상한을 쓴다.
필수사진 = {'1', '2', '3', '4', '5', '10', '11'}   # 사진받기.py 의 `필수` 와 같아야 한다
경계 = int(time.mktime((2026, 9, 1, 0, 0, 0, 0, 0, -1)) * 1000)
#    🔴 06g-사진수집.js·원고받기.py 와 같은 날이어야 한다. 옛 품목은 소급하지 않는다
버림초 = 45 * 60          # '하는중' 인데 이만큼 지났으면 맥이 꺼졌던 것이다 — 다시 집는다
쉴유휴초 = 20             # 우람님이 한창 치고 계시면 잠깐 양보한다
못참는초 = 5 * 60
#    🔴 그래도 이만큼 기다렸으면 **유휴를 안 보고 그냥 시작한다.**
#    우람님이 고르신 것은 「무조건 돌되 내가 입력하면 잠시 멈춘다」(B안)다.
#    처음엔 유휴 60초를 요구했는데, 그러면 맥 앞에 계시는 동안 **영영 시작을 안 한다** —
#    15:38 에 쌓인 개맥문동이 28분째 「대기」로 서 있었다 (2026-09-14).
#    「잠시 양보」와 「아예 안 함」은 다르다.
답장상한 = 1500           # 폰 채팅에 뜨는 글이다. 길면 못 읽는다
기록방 = Path('/tmp/zg-지시기록')
#    🔴 2026-09-14 — 끊겼을 때 그때까지 무엇을 했는지가 여기 남는다.
#    처음엔 화면에 찍힌 것을 받아 뒀다가 시간이 넘으면 통째로 버렸다. 그래서
#    30분을 헤매고도 「일이 너무 컸거나 막혔습니다」라는 쓸모없는 답장만 남았다.
#    이제 `--output-format stream-json` 을 이 폴더의 파일로 흘린다 — 끊겨도 파일은 남는다.


# ══════════════════════════════════════════════ 우람님이 쓰고 계신가

def 유휴초():
    """마지막 키보드·마우스 입력 뒤 몇 초 지났나. 못 재면 999 — 못 쟀다고 멈추지는 않는다"""
    try:
        r = subprocess.run(['ioreg', '-c', 'IOHIDSystem'], capture_output=True, text=True, timeout=10)
        m = re.search(r'"HIDIdleTime"\s*=\s*(\d+)', r.stdout)
        return int(m.group(1)) / 1e9 if m else 999
    except Exception:
        return 999


# ══════════════════════════════════════════════ 표 주고받기

def 올리기(행들):
    if not 행들:
        return
    k = 키()
    req = urllib.request.Request(
        주소 + urllib.parse.quote('v3_지시'), method='POST',
        data=json.dumps(행들, ensure_ascii=False).encode(),
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    urllib.request.urlopen(req, timeout=30).read()


def 줄들():
    """{id: 내용} — 안 지운 것만. id 가 곧 시간순이다.
    🔴 표가 아직 없으면(404) None 을 준다 — 조용히 넘어가야 한다.
       우람님이 `16단계-지시함.sql` 을 돌리시기 전까지 1분마다 빨간 줄이 쌓이면 로그를 못 읽는다."""
    try:
        답 = 부르기(표('v3_지시') + '?select=id,내용,삭제됨') or []
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    return {r['id']: (r.get('내용') or {}) for r in 답 if not r.get('삭제됨')}


def 적기(줄id, 내용, **고칠것):
    새 = dict(내용)
    새.update(고칠것)
    올리기([{'id': 줄id, '내용': 새, '삭제됨': False}])
    return 새


def 집을것(모두):
    """제일 오래된 '대기' 하나. 버려진 '하는중' 이 있으면 그게 먼저다"""
    이제 = time.time() * 1000
    버려진 = [(i, c) for i, c in 모두.items()
              if c.get('상태') == '하는중' and 이제 - (c.get('집은때') or 0) > 버림초 * 1000]
    if 버려진:
        return sorted(버려진)[0]
    # 🔴 살아 있는 '하는중' 이 있으면 아무것도 안 집는다 — 한 번에 한 건이다
    if any(c.get('상태') == '하는중' for c in 모두.values()):
        return None
    대기 = [(i, c) for i, c in 모두.items() if (c.get('상태') or '대기') == '대기']
    return sorted(대기)[0] if 대기 else None


# ══════════════════════════════════════════════ 스스로 일감 쌓기 (⑥)

def 착수할것():
    """사진 7장이 다 찼는데 아직 조립본(제작.html)이 없는 품목. [(품목코드, 폴더명)]
    🔴 경계(9/1) 뒤 신규만. 옛 품목은 소급하지 않는다 — 06g-사진수집.js 와 같은 날이다."""
    from 제작요청 import 폴더명, 원본사진방, 품목방
    것들 = []
    for r in 부르기(표('v3_품목') + '?select=id,내용') or []:
        c = r.get('내용') or {}
        유통명 = c.get('유통명') or ''
        if not 유통명 or (c.get('등록일시') or 0) < 경계:
            continue
        폴더 = 폴더명(유통명)
        사진방 = 원본사진방 / 폴더
        if not 사진방.is_dir():
            continue
        있는것 = {p.stem for p in 사진방.glob('*.jpg')}
        if not 필수사진.issubset(있는것):
            continue                       # 아직 덜 올리셨다
        if (품목방 / 폴더 / '발행이미지' / '제작.html').exists():
            continue                       # 이미 만들어진 것이다
        것들.append((r['id'], 폴더))
    return 것들


def 착수쌓기():
    """사진이 다 찬 품목을 지시함에 한 줄로 쌓는다. 같은 품목은 한 번만.
    🔴 여기서 일을 시키지 않는다. **줄만 쌓는다** — 처리는 지시함이 제 예약으로 한다.
       그래야 세 시간짜리 상세페이지가 도는 동안에도 사진받기가 계속 돈다."""
    것들 = 착수할것()
    if not 것들:
        return
    모두 = 줄들()
    if 모두 is None:
        return
    이미 = {(c.get('품목코드'), c.get('갈래')) for c in 모두.values()}
    이제 = int(time.time() * 1000)
    새줄, 쌓은것 = [], []
    for 코드, 폴더 in 것들:
        if (코드, '상세페이지') in 이미:
            continue
        새줄.append({'id': '%d-%s' % (이제, 코드[:8]), '삭제됨': False, '내용': {
            '누가': '시스템', '보낸때': 이제, '상태': '대기',
            '갈래': '상세페이지', '품목코드': 코드, '폴더': 폴더,
            '글': '%s — 사진 7장이 다 찼습니다. 상세페이지를 만듭니다.' % 폴더}})
        쌓은것.append(폴더)
        이제 += 1                           # id 가 겹치지 않게
    올리기(새줄)
    for 이름 in 쌓은것:
        print('  ✅ 지시함에 쌓음 — %s (사진 7/7)' % 이름)


# ══════════════════════════════════════════════ Claude 부르기

머리말 = """아래는 우람님이 폰이나 웹에서 남기신 지시다. 그대로 수행해라.

🔴 이 창은 사람이 보고 있지 않다. **되물을 수 없다.**
🔴 **못 하는 일이면 붙들고 있지 마라.** 「이건 못 합니다 — (까닭)」 한 줄로 곧바로 끝내라.
   30분이 지나면 통째로 끊긴다. 헤매다 끊기면 우람님은 아무것도 못 받으신다.
   무엇을 어디서 찾아야 할지 모르겠으면 **그 말을 그대로 적고 끝내라.** 그게 훨씬 낫다.
🔴 쓸 수 있는 연장 — 파일 읽기·쓰기·고치기 · 찾기 · 셸 명령(`python3` 포함) · 웹 검색
   **막혀 있는 것** — 파일 없애기 · `git push` · `sudo` · 설치(pip/npm/brew) · 바깥 접속(curl/ssh)
   그 막힌 것이 꼭 필요한 일이면 **하지 말고 그렇게 답해라.**
🔴 `git` 커밋은 네가 하지 않는다. 끝난 뒤 스크립트가 알아서 한다.
🔴 다 끝나면 **무엇을 했고 어디를 보시면 되는지** 한두 문장으로 적어라. 폰 채팅에 그대로 뜬다.

── 지시 ──
%s
"""

# 🔴 시스템이 스스로 쌓은 줄은 **표의 `글` 을 프롬프트로 쓰지 않는다.**
#    `갈래` 가 아는 값일 때만 여기 박아 둔 글을 쓴다 — 표가 오염돼도 정해진 일만 한다.
갈래프롬프트 = {
    '카페24올리기': """「%(품목)s」를 카페24에 올려라. 우람님이 상세페이지를 확인하시고 누르신 것이다.

절차는 `상품/카페24-등록-메모.md` 에 다 적혀 있다 — **그 문서의 대응표대로** 한다.
  ① `POST products` 로 새 상품을 등록한다(SEO.md 가 9칸의 유일한 원본이다)
  ② 돌려받은 `product_no` 로 `python3 "상품/_도구/상세설명-올리기.py" {번호} "%(폴더)s"`
     — 발행 6장을 카페24 창고에 올리고 상세설명까지 채운다
  ③ 분류(`add_category_no`)·SEO(`products/{no}/seo`)·검색어(`products/{no}/tags`) 를 넣는다

  ④ **대표이미지를 올린다** —
     `python3 "상품/_도구/대표이미지-카페24.py" {번호} "%(폴더)s"`
     🔴 **API 로 시도하지 마라.** `detail_image` 는 `web/product/` 창고만 받는데 그 통로가
        막혀 있다(403 · FTP 무응답). 그 도구는 **관리자 화면을 브라우저로 몰아** 올린다 —
        우람님이 손으로 하시던 그 클릭이라 막히지 않는다 (2026-09-14 209번에서 확인).
     🔴 `~/이미지/%(폴더)s/main1.jpg` 가 있어야 한다. 없으면 건너뛰고 답장에 적어라.
     🔴 이 걸음이 실패해도 **앞의 등록은 이미 끝난 것이다.** 실패로 만들지 말고 답장에 적어라.

  ⑤ 롯데온 여덟 칸을 채운다 — `python3 "상품/_도구/롯데온칸.py" 채우기 {번호}`
     이용안내 4칸 + 스위치 4칸이다. 비어 있으면 롯데온이 반려한다(2026-08-23 실제로 반려됐다).

  ⑥ **진열·판매를 켠다** — `PUT products/{번호}` 로 `display:'T'` · `selling:'T'`
     🔴 **④ 대표이미지가 올라간 것을 확인했을 때만 켠다**(2026-09-14 우람님).
        도구가 실패했거나 `main1.jpg` 가 없었으면 **켜지 마라** — 사진 없는 상품이 손님에게
        판매중으로 보인다. 미진열로 두고 답장에 「대표이미지가 없어 진열을 안 켰습니다」라고 적어라.
     🔴 켠 뒤 `products/{번호}` 를 **다시 조회해** `display`·`selling` 이 `T` 인지 확인하고 적어라.

  ⑦ 쿠팡으로 보낸다 — `python3 "상품/_도구/쿠팡보내기.py" 보내기 {번호}`
     옵션·단가는 그 도구가 규칙대로 넣는다(쿠팡가 = (자사몰가 + 배송비 4,500) × 1.1 · 무료배송).
     🔴 **⑥ 에서 진열을 안 켰으면 쿠팡도 보내지 마라.**
     🔴 **한 번만 부른다. 실패해도 다시 부르지 마라** — 이미 쿠팡에 올라간 상품을 또 보내는 것을
        아직 못 막는다(2026-09-14 우람님 「나중에」). 무엇이 걸렸는지 답장에 적고 끝내라.
     🔴 구근(분류 131·134·135)은 우람님이 따로 하신다 — 도구가 스스로 멈춘다. 그 멈춤은 실패가 아니다.

🔴 `카페24.py` 를 쓰지 마라. 로컬 토큰이 죽어 있고 refresh 가 돌면 **서버 토큰이 무효가 되어
   주문 자동수집이 멈춘다.** 반드시 `상품/_도구/카페24-서버토큰.py` 를 쓴다.
🔴 다 되면 **답장 첫 줄에 「카페24 NNN번」** 을 적어라. 우람님이 그 번호로 찾아가신다.
   그 아래에 한 줄씩 — **대표이미지 · 롯데온칸 · 진열 · 쿠팡** 이 각각 어떻게 됐는지.
""",
    '상세페이지': """「%(품목)s」 상세페이지를 처음부터 끝까지 만들어라. 사진이 다 차서 자동으로 걸린 일감이다.

상품 창의 지침을 따른다 — `상품/워크플로우.md` 와 `상품/_도구` 의 도구들.
차례는 리서치 → 원고 → SEO → 대표이미지 → 조립 → 검수 → 카페24 등록이다.

원료 사진 7장은 `~/이미지/%(폴더)s/` 에 `1·2·3·4·5·10·11.jpg` 로 이미 다 있다.
번호가 곧 자리다 — 사진을 보고 자리를 고르지 않는다.

🔴 **진열은 켜지 않는다.** 카페24 등록은 미진열·판매안함까지만. 마지막 관문은 우람님이다.
🔴 **대표이미지는 우람님이 관리자에서 직접 올리신다**(API 가 막혀 있다). 만들어만 두면 된다.
🔴 검수(`상품/_도구/검수.py`)에서 **「치명」이 0건이면 카페24 등록까지 간다.**
   「치명」이 있으면 거기서 멈추고 무엇이 걸렸는지 답장에 적어라.

🔴 **「사진이 esmplus 에 없다」는 등록을 막지 않는다.** 이것 하나로 멈추지 마라.
   esmplus 는 **원료 사진 보관용(우람님 개인 계정)**이고 상세페이지와 상관이 없다 —
   발행 JPG 안에는 사진이 이미 구워져 있고, 카페24에 올라가는 이미지는
   `상세설명-올리기.py` 가 **카페24 이미지창고**에 직접 올린다(2026-08-19 우람님 확정).
   `검수.py:82` 주석이 그래서 이걸 「치명」에서 「중요(업로드 대기)」로 낮춰 뒀다.
   (2026-09-14 — 개맥문동·버들잎해바라기 두 품목이 이것 하나로 연달아 멈춰 섰다.)
""",
}


def 돌릴환경():
    """🔴 예약(launchd)이 주는 PATH 는 `/usr/bin:/bin:/usr/sbin:/sbin` 뿐이다.
       `claude` 는 `~/.local/bin` 에 있어 그대로 두면 예약으로 돌 때만 못 찾는다 —
       손으로 돌리면 되고 밤에만 조용히 실패하는 종류다 (2026-09-14 실전 시험에서 잡았다).
       claude 가 부르는 하위 프로그램도 이 PATH 를 물려받는다."""
    환경 = dict(os.environ)
    앞에 = [str(Path.home() / '.local' / 'bin'), '/opt/homebrew/bin', '/usr/local/bin']
    환경['PATH'] = ':'.join(앞에 + [환경.get('PATH', '/usr/bin:/bin')])
    return 환경


def 클로드길(환경):
    길 = shutil.which('claude', path=환경['PATH'])
    if not 길:
        raise RuntimeError('claude 를 못 찾았습니다 — PATH: ' + 환경['PATH'])
    return 길


def 시킬글(내용):
    """(Claude 에게 줄 글, 이 건의 상한초).
    🔴 시스템이 쌓은 줄은 표의 `글` 을 쓰지 않는다 — `갈래` 로 박아 둔 프롬프트를 고른다."""
    갈래 = 내용.get('갈래') or ''
    if 내용.get('누가') == '시스템' and 갈래 in 갈래프롬프트:
        본 = 갈래프롬프트[갈래] % {'품목': 내용.get('폴더') or '', '폴더': 내용.get('폴더') or ''}
        return 본, 갈래상한.get(갈래, 상한초)
    return (내용.get('글') or '').strip(), 상한초


def 부르기클로드(글, 줄id, 이번상한=None):
    """(끝났나, 기록파일). 끝났나 = True 성공 · False 실패 · None 시간초과.
    🔴 화면에 찍힌 것을 손에 들고 있지 않는다. **파일로 흘린다** —
       시간이 넘어 끊겨도 그때까지 무엇을 했는지가 파일에 남아 있어야 한다."""
    환경 = 돌릴환경()
    기록방.mkdir(parents=True, exist_ok=True)
    기록 = 기록방 / ('%s.jsonl' % 줄id)
    with open(기록, 'w', encoding='utf-8') as 흐름, open(os.devnull) as 빈:
        try:
            r = subprocess.run(
                [클로드길(환경), '-p', 머리말 % 글,
                 '--allowedTools', 도구들, '--disallowedTools', 막을것,
                 '--output-format', 'stream-json', '--verbose'],
                stdin=빈, stdout=흐름, stderr=subprocess.STDOUT,
                text=True, cwd=str(뿌리), timeout=이번상한 or 상한초, env=환경)
            return r.returncode == 0, 기록
        except subprocess.TimeoutExpired:
            return None, 기록


def 짧게(값, n=70):
    t = str(값 if not isinstance(값, dict) else (값.get('command') or 값.get('file_path')
                                                or 값.get('pattern') or 값))
    return ' '.join(t.split())[:n]


def 기록읽기(기록):
    """(최종답, 자취) — 자취는 무엇을 했는지 한 줄씩. 끊겼을 때 이게 유일한 단서다"""
    답, 자취 = '', []
    try:
        줄들 = 기록.read_text(encoding='utf-8', errors='replace').split('\n')
    except OSError:
        return '', []
    for L in 줄들:
        L = L.strip()
        if not L:
            continue
        try:
            o = json.loads(L)
        except ValueError:
            continue                      # JSON 이 아닌 줄(경고 등)은 흘린다
        갈래 = o.get('type')
        if 갈래 == 'result':
            답 = str(o.get('result') or '')
        elif 갈래 == 'assistant':
            for c in (o.get('message') or {}).get('content') or []:
                if c.get('type') == 'tool_use':
                    자취.append('%s %s' % (c.get('name'), 짧게(c.get('input'))))
                elif c.get('type') == 'text' and (c.get('text') or '').strip():
                    자취.append('말: ' + ' '.join(c['text'].split())[:70])
    return 답, 자취


def 답장뽑기(답, 자취):
    """최종답이 있으면 그것. 없으면 마지막에 하던 것이라도 보여 준다 — 빈손으로 안 돌려보낸다"""
    답 = (답 or '').strip()
    if 답.startswith('답장:'):
        답 = 답[3:].strip()
    if 답:
        return 답[:답장상한]
    if 자취:
        return ('아무 말 없이 끝났습니다. 마지막에 하던 것 —\n'
                + '\n'.join('· ' + t for t in 자취[-5:]))[:답장상한]
    return '아무 말도 없이 끝났습니다'


# ══════════════════════════════════════════════ 커밋 — Claude 가 만진 것만

def 손댄것():
    """지금 손탄 파일의 경로 집합.
    🔴 `-z` 를 반드시 쓴다. 그냥 `--porcelain` 은 한글 파일명을 `"\354\213\234…"` 로
       감싸 escape 해서 준다 — 그대로 `git add` 에 넘기면 「did not match any files」다.
       이 집은 파일 이름이 죄다 한글이라 이것 없이는 커밋이 통째로 안 된다 (2026-09-14 통합시험에서 잡았다).
    🔴 `-uall` 도 반드시 쓴다. 없으면 아직 git 에 없는 폴더를 `?? 그폴더/` 한 줄로 뭉쳐 준다 —
       안의 파일이 아무리 바뀌어도 목록이 그대로라 못 알아챈다 (2026-09-14 구근 작업에서 놓쳤다)."""
    r = subprocess.run(['git', 'status', '--porcelain', '-z', '-uall'], cwd=str(뿌리),
                       capture_output=True, text=True)
    조각 = [x for x in r.stdout.split('\0') if x]
    길들, i = set(), 0
    while i < len(조각):
        길들.add(조각[i][3:])
        i += 2 if 조각[i][:1] in ('R', 'C') else 1   # 이름바꿈·복사는 옛 경로가 뒤따라온다
    return 길들


def 새로만진것(잰때):
    """일을 시작한 뒤에 **실제로 바뀐** 파일만.
    🔴 처음엔 「일 전후 목록의 차집합」으로 골랐는데 그걸로는 못 잡는다 —
       이미 손타 있던 파일을 또 고치면 목록이 그대로라 차집합이 빈다.
       구근 작업에서 미리보기.html·사진넣기.py·제작대기.md 셋을 이렇게 통째로 놓쳤다.
       그래서 「언제 바뀌었나」로 고른다. 2초는 시계 어긋남 여유다."""
    것들 = set()
    for 길 in 손댄것():
        p = 뿌리 / 길
        try:
            if p.is_file() and p.stat().st_mtime >= 잰때 - 2:
                것들.add(길)
        except OSError:
            continue
    return 것들


def 커밋(잰때, 글):
    """Claude 가 새로 만지거나 만든 것만 올린다. ops 저장소는 결과물이라 push 까지 간다"""
    새것 = sorted(새로만진것(잰때))
    if not 새것:
        return ''
    subprocess.run(['git', 'add', '--'] + 새것, cwd=str(뿌리), check=True)
    쪽지 = ('[야간] %s\n\n우람님 지시를 맥이 혼자 처리한 것이다 (16단계 지시함).\n'
            '되돌리기: 도구/야간되돌리기.sh\n' % 글.strip().split('\n')[0][:60])
    subprocess.run(['git', 'commit', '-q', '-m', 쪽지], cwd=str(뿌리), check=True)
    밀림 = subprocess.run(['git', 'push'], cwd=str(뿌리), capture_output=True, text=True)
    r = subprocess.run(['git', 'log', '-1', '--format=%h'], cwd=str(뿌리),
                       capture_output=True, text=True)
    return '%s · 파일 %d개%s' % (r.stdout.strip(), len(새것),
                                '' if 밀림.returncode == 0 else ' · 🔴 push 실패')


# ══════════════════════════════════════════════ 뒤처리

def 뒤처리(내용, 됐나):
    """상세페이지를 만들었으면 **발행 이미지를 창고에 올린다** — 폰 [결과] 탭이 그걸 본다.
    🔴 Claude 에게 맡기지 않는다. 잊어도 되게 스크립트가 한다.
       2026-09-14 — 개맥문동이 다 만들어졌는데 `~/상세페이지/` 에만 있고 창고엔 없어
       [결과] 탭이 통째로 비어 있었다.
    🔴 절대 넘어지지 않는다 — 올리기가 실패해도 다 끝난 일을 실패로 만들면 안 된다."""
    if not 됐나 or 내용.get('갈래') != '상세페이지':
        return
    try:
        from 제작요청 import 품목방
        import 원고받기
        코드, 폴더 = 내용.get('품목코드'), 내용.get('폴더')
        방 = 품목방 / (폴더 or '')
        if not (코드 and 방.is_dir()):
            return
        머리 = (원고받기.원고줄들() or {}).get(코드) or {}
        뽑은것, 말 = 원고받기.만들기처리(코드, 방, 머리)
        print('  📤 창고에 올림 %d장%s' % (len(뽑은것), ' · ' + 말 if 말 else ''))
    except Exception as e:
        print('  ⚠️ 창고 업로드는 못 했습니다 — %s' % e)


# ══════════════════════════════════════════════ 폰으로 알림

def 알림(내용, 됐나, 답):
    """일이 끝나면 폰 홈 화면 앱으로 띄운다. 앱을 안 열어 두셔도 뜬다.
    🔴 절대 넘어지지 않는다 — 알림이 못 갔다고 다 끝난 일까지 실패로 만들면 안 된다.
       답장은 이미 표에 적혀 있으니, 알림이 안 가도 앱을 여시면 그대로 있다."""
    try:
        import 푸시
        이름 = 내용.get('폴더') or (내용.get('글') or '').strip().split('\n')[0][:24]
        제목 = ('✅ ' if 됐나 else '🔴 ') + (이름 or '지시함')
        보냄, _ = 푸시.보내기(제목, ' '.join((답 or '').split())[:140])
        if 보냄:
            print('  📱 알림 %d대' % 보냄)
    except Exception as e:
        print('  ⚠️ 알림은 못 보냈습니다 — %s' % e)


# ══════════════════════════════════════════════ 한 건

def 한건():
    모두 = 줄들()
    if 모두 is None:
        return None     # 표가 아직 없다 — 16단계-지시함.sql 을 돌리시면 곧바로 산다
    것 = 집을것(모두)
    if not 것:
        return None
    # 🔴 우람님이 한창 치고 계시면 잠깐 양보한다 — 다만 오래 기다린 것은 그냥 시작한다(B안)
    기다린초 = (time.time() * 1000 - ((것[1].get('보낸때')) or 0)) / 1000
    if 유휴초() < 쉴유휴초 and 기다린초 < 못참는초:
        return None          # 조용히 다음 바퀴에

    줄id, 내용 = 것
    글, 이번상한 = 시킬글(내용)
    if not 글:
        적기(줄id, 내용, 상태='실패', 답장='지시가 비어 있습니다', 답한때=int(time.time() * 1000))
        print('⚠️ %s — 빈 지시' % 줄id); return '빈지시'

    내용 = 적기(줄id, 내용, 상태='하는중', 집은때=int(time.time() * 1000))
    print('🛠  %s — %s' % (줄id, 글[:60]))
    sys.stdout.flush()

    잰때 = time.time()
    try:
        됐나, 기록 = 부르기클로드(글, 줄id, 이번상한)
    except Exception as e:
        적기(줄id, 내용, 상태='실패', 답한때=int(time.time() * 1000),
             걸린초=int(time.time() - 잰때), 답장='Claude 를 부르지 못했습니다 — %s' % e)
        print('❌ %s — %s' % (줄id, e)); return '실패'

    답원문, 자취 = 기록읽기(기록)
    답 = 답장뽑기(답원문, 자취)
    if 됐나 is None:
        # 🔴 끊겼어도 빈손으로 안 돌려보낸다. 무엇을 하다 막혔는지가 유일한 단서다
        답 = ('%d분이 넘어 끊었습니다. 마지막에 하던 것 —\n%s'
              % ((이번상한 or 상한초) // 60,
                 '\n'.join('· ' + t for t in 자취[-5:]) or '· (아무 자취도 없습니다)'))[:답장상한]
    자국 = ''
    try:
        자국 = 커밋(잰때, 글)
    except Exception as e:
        답 += '\n(커밋은 못 했습니다 — %s)' % e

    적기(줄id, 내용, 상태='됨' if 됐나 else '실패', 답장=답, 답한때=int(time.time() * 1000),
         걸린초=int(time.time() - 잰때), 커밋=자국)
    뒤처리(내용, 됐나)
    알림(내용, 됐나, 답)
    말 = '%s %s — %d초%s' % ('✅' if 됐나 else '❌', 줄id, time.time() - 잰때,
                            ' · ' + 자국 if 자국 else '')
    print(말)
    return 말


def 보기():
    모두 = 줄들()
    if 모두 is None:
        return print('🔴 v3_지시 표가 아직 없습니다 — v3/설계/16단계-지시함.sql 을 Supabase 에서 돌리십시오')
    if not 모두:
        print('지시함이 비어 있습니다')
        return
    for i in sorted(모두):
        c = 모두[i]
        print('  %-6s %-8s %s' % (c.get('상태') or '대기', (c.get('누가') or '?'),
                                  (c.get('글') or '')[:60]))
        if c.get('답장'):
            print('         ↳ %s' % c['답장'][:100].replace('\n', ' '))


def 점검():
    """표 없이 되는 곳만 스스로 확인한다. 고치고 나면 이것부터 돌린다"""
    assert 답장뽑기('답장: 끝냈습니다', []) == '끝냈습니다'
    assert 답장뽑기('끝냈습니다', []) == '끝냈습니다'
    assert 답장뽑기('', []) == '아무 말도 없이 끝났습니다'
    assert len(답장뽑기('ㄱ' * 3000, [])) == 답장상한
    # 🔴 최종답이 없어도 빈손으로 안 돌려보낸다 — 30분 헤매고 아무것도 못 받은 적이 있다
    빈손 = 답장뽑기('', ['Read 상품/x.md', 'Bash python3 사진넣기.py'])
    assert '사진넣기' in 빈손, '끊겼을 때 마지막에 하던 것이 답장에 담겨야 한다'
    답, 자취 = 기록읽기(Path('/그런/파일/없다.jsonl'))
    assert (답, 자취) == ('', []), '기록이 없어도 넘어져선 안 된다'
    # 🔴 「이미 손타 있던 파일을 또 고친 것」을 잡아야 한다 — 구근 작업에서 셋을 통째로 놓쳤다
    import tempfile
    with tempfile.TemporaryDirectory() as 방:
        옛뿌리 = globals()['뿌리']
        try:
            globals()['뿌리'] = Path(방)
            subprocess.run(['git', 'init', '-q'], cwd=방, check=True)
            오래된 = Path(방) / '오래전에.txt'
            오래된.write_text('전', encoding='utf-8')
            os.utime(오래된, (1, 1))                      # 아주 옛날에 바뀐 것으로 둔다
            잰때 = time.time()
            방금 = Path(방) / '방금.txt'
            방금.write_text('후', encoding='utf-8')
            골라진것 = 새로만진것(잰때)
            assert '방금.txt' in 골라진것, '지금 바뀐 것을 골라야 한다'
            assert '오래전에.txt' not in 골라진것, '안 바뀐 것까지 담으면 안 된다'
        finally:
            globals()['뿌리'] = 옛뿌리
    이제 = time.time() * 1000
    모 = {'1-a': {'상태': '됨'}, '3-c': {'상태': '대기'}, '2-b': {'상태': '대기'}}
    assert 집을것(모)[0] == '2-b', '오래된 것부터 집어야 한다'
    모['9-z'] = {'상태': '하는중', '집은때': 이제}
    assert 집을것(모) is None, '살아있는 하는중이 있으면 안 집는다'
    모['9-z']['집은때'] = 이제 - (버림초 + 60) * 1000
    assert 집을것(모)[0] == '9-z', '버려진 하는중은 다시 집는다'
    # 🔴 Bash 는 있어야 한다 — 없으면 `사진넣기.py` 같은 도구를 못 돌려 일이 통째로 막힌다.
    #    대신 되돌릴 수 없는 것이 막을것에 빠지면 안 된다.
    assert 'Bash' in 도구들, 'Bash 가 빠지면 도구를 돌려야 하는 일이 애초에 불가능해진다'
    for 위험 in ('Bash(rm:', 'Bash(sudo:', 'Bash(git push:', 'Bash(git reset:'):
        assert 위험 in 막을것, '🔴 %s…) 가 막을것에서 빠졌다' % 위험
    # 🔴 예약이 주는 최소 PATH 로도 claude 를 찾아야 한다
    민환경 = {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin'}
    민환경['PATH'] = 돌릴환경()['PATH']
    assert 클로드길(민환경), 'claude 를 못 찾는다'
    assert 유휴초() >= 0
    # 🔴 오래 기다린 일감은 우람님이 쓰고 계셔도 시작해야 한다 — 28분 서 있던 적이 있다
    assert 쉴유휴초 < 못참는초, '못참는초가 쉴유휴초보다 커야 「잠깐 양보」가 된다'
    print('✅ 점검 통과 — 답장뽑기 4 · 집을것 3 · 연장목록 1')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '점검':
        점검()
    elif len(sys.argv) > 1 and sys.argv[1] == '보기':
        보기()
    else:
        한건()
