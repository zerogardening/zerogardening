# -*- coding: utf-8 -*-
# 서비스워커 검수 (2026-09-03 우람님 지시 「앱 탭이 많이 버벅거린다 — 특히 주문」)
#   python3 v3/검수/서비스워커-시험.py     ← 그대로 다시 돈다 (playwright 필요)
#
# 🔴 원인은 탭마다 파일 39개를 서버에 다시 묻는 왕복이었다. sw.js 가 그걸 없앤다.
#    ① 두 번째로 열 때 js·css 를 한 번도 안 물어보는가
#    ② 🔴 **새 판을 올리면 폰이 새것을 받는가** (2026-08-19 사고 재발 방지 — 여기가 핵심이다)
#    ③ Supabase 는 가로채지 않는가 (데이터는 늘 서버에서 온다)
#    ④ 인터넷이 끊겨도 화면이 뜨는가
#    ⑤ 옛 ?v= 캐시가 쌓이지 않는가
#
# 🔴 진짜 배포를 흉내내려고 v3 를 임시 폴더로 복사해 띄우고, 시험 도중에 그 사본의 ?v= 를 올린다.
import pathlib, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

원본 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

터 = pathlib.Path(tempfile.mkdtemp(prefix='zg-sw-'))
사본 = 터 / 'v3'
shutil.copytree(원본, 사본, ignore=shutil.ignore_patterns('검수', '시안', '설계', '.git'))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8820', '-d', str(사본)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8820/%EC%A3%BC%EB%AC%B8.html'   # 가장 무거운 화면(파일 39개)

def 판올리기():
    """진짜 배포 흉내 — ?v= 를 올리고 **js 내용도 실제로 바꾼다**.
       🔴 8/19 사고는 「새 주소를 부르는데 옛 코드가 돈다」가 아니라 「새 코드가 아예 안 온다」였다.
          그래서 주소만 보지 말고 새 코드가 진짜 도는지를 봐야 한다."""
    p = 사본 / '주문.html'
    글 = p.read_text(encoding='utf-8')
    지금 = int(re.search(r'\.js\?v=(\d+)', 글).group(1))
    새 = 지금 + 1
    p.write_text(글.replace('?v=%d' % 지금, '?v=%d' % 새), encoding='utf-8')
    표시 = 사본 / 'js' / '00-확대금지.js'
    표시.write_text(표시.read_text(encoding='utf-8') +
                    "\nwindow.__새판표시 = 'v%d';\n" % 새, encoding='utf-8')
    return 지금, 새

def 요청수(쪽, 무엇):
    return 쪽.evaluate("""(무엇) => performance.getEntriesByType('resource')
         .filter(x => x.name.includes(무엇) && x.transferSize !== 0).length""", 무엇)

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        ctx = 브.new_context(viewport={'width': 390, 'height': 844})
        쪽 = ctx.new_page()
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        쪽.add_init_script("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');")

        print('\n① 처음 열기 — 워커가 자리를 잡는가')
        쪽.goto(주소, wait_until='load')
        쪽.wait_for_function("() => navigator.serviceWorker.controller !== null", timeout=15000)
        본다('워커가 화면을 맡았다', 쪽.evaluate("() => !!navigator.serviceWorker.controller"))
        쪽.wait_for_timeout(1500)          # 캐시에 담길 틈을 준다

        print('\n② 두 번째로 열기 — 안 물어보는가')
        쪽.goto(주소, wait_until='load'); 쪽.wait_for_timeout(1200)
        js수 = 요청수(쪽, '/js/')
        본다('js 를 한 번도 안 받아온다 (캐시에서 바로)', js수 == 0, '%d개 받음' % js수)
        본다('화면은 멀쩡히 떴다', 쪽.eval_on_selector_all('.ph-nav', 'e => e.length') == 1)

        print('\n③ 🔴 새 판을 올렸을 때 — 8/19 사고 재발 방지')
        옛판, 새판 = 판올리기()
        쪽.goto(주소, wait_until='load'); 쪽.wait_for_timeout(1500)
        붙은판 = 쪽.evaluate("""() => {
          const s = [...document.scripts].map(x => x.src).find(x => x.includes('08b-'));
          return s ? (s.match(/\\?v=(\\d+)/) || [])[1] : null;
        }""")
        본다('새 HTML 을 받아 왔다', 붙은판 == str(새판), '화면이 든 판 v=%s (올린 판 v=%d)' % (붙은판, 새판))
        # 🔴 여기가 8/19 사고의 핵심 — 새 주소를 부르는 것만으로는 부족하다. **새 코드가 돌아야** 한다
        돌고있는판 = 쪽.evaluate("() => window.__새판표시 || '(옛 코드가 돌고 있다)'")
        본다('새로 올린 코드가 실제로 돌고 있다', 돌고있는판 == 'v%d' % 새판, 돌고있는판)
        담긴새판 = 쪽.evaluate("""async (v) => {
          const c = await caches.open('zg-v3');
          const ks = await c.keys();
          return ks.filter(r => r.url.includes('/js/') && r.url.includes('?v=' + v)).length;
        }""", 새판)
        본다('새 판 js 가 캐시에 새로 담겼다', 담긴새판 > 0, '%d개' % 담긴새판)
        본다('그 화면도 멀쩡히 떴다', 쪽.eval_on_selector_all('.ph-nav', 'e => e.length') == 1)

        print('\n④ 옛 판 캐시가 쌓이지 않는가')
        쪽.wait_for_timeout(1200)
        남은 = 쪽.evaluate("""async (옛) => {
          const c = await caches.open('zg-v3');
          const ks = await c.keys();
          return ks.filter(r => r.url.includes('/js/') && r.url.includes('?v=' + 옛)).length;
        }""", 옛판)
        본다('옛 ?v= 는 지워졌다', 남은 == 0, '%d개 남음' % 남은)

        print('\n⑤ 데이터는 가로채지 않는가')
        담김 = 쪽.evaluate("""async () => {
          const c = await caches.open('zg-v3');
          const ks = await c.keys();
          return ks.filter(r => !r.url.startsWith(location.origin)).map(r => r.url);
        }""")
        본다('캐시에 남의 출처가 하나도 없다 (Supabase·CDN)', len(담김) == 0, 담김[:3])

        print('\n⑥ 인터넷이 끊겨도')
        ctx.set_offline(True)
        쪽.goto(주소, wait_until='load'); 쪽.wait_for_timeout(1500)
        본다('끊긴 채로도 화면이 뜬다', 쪽.eval_on_selector_all('.ph-nav', 'e => e.length') == 1)
        ctx.set_offline(False)

        본다('콘솔 오류 0', not 오류, 오류[:2])
        브.close()
finally:
    서버.terminate()
    shutil.rmtree(터, ignore_errors=True)

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
