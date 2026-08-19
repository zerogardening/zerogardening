# -*- coding: utf-8 -*-
# 00-새판.js 검수 — 옛 HTML 을 든 앱이 스스로 새로고침하는가
#   python3 v3/검수/새판확인-시험.py     ← 그대로 돌리면 된다 (playwright 필요)
# 🔴 file:// 로는 못 돈다 — fetch 가 막힌다. 그래서 잠깐 http 서버(8777)를 띄운다.
# 판 번호는 메모.html 에서 읽는다 — ?v= 를 올려도 이 시험은 손댈 것이 없다.
import io, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = '/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3'
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8777', '-d', 뿌리],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8777/%EB%A9%94%EB%AA%A8.html'   # 메모.html
지금판 = re.search(r'\.js\?v=(\d+)', io.open(os.path.join(뿌리, '메모.html'), encoding='utf-8').read()).group(1)
옛으로 = lambda 글: re.sub(r'(\.(?:js|css))\?v=\d+', r'\1?v=1', 글)   # 옛 HTML 인 척
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});")
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(참); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        # ── ① 판이 같을 때: 새로고침이 없어야 한다 ──
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844})
        간 = []
        쪽.on('framenavigated', lambda f: 간.append(f.url) if f == 쪽.main_frame else None)
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(2500)
        본다('판이 같으면 새로고침 안 한다', len(간) == 1, '%d번 이동' % len(간))
        본다('메모 화면은 정상으로 뜬다', 쪽.locator('.ph-shell, .shell').count() >= 1)
        본다('에러 없음', len(오류) == 0, 오류[:2])
        쪽.close()

        # ── ② 앱이 옛 HTML 을 들고 있을 때: 스스로 새로고침해야 한다 ──
        # 브라우저가 든 HTML 은 ?v=53(옛것), 서버가 주는 것은 ?v=54(새것)인 상황을 그대로 만든다
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844})
        간 = []
        쪽.on('framenavigated', lambda f: 간.append(f.url) if f == 쪽.main_frame else None)
        def 낚기(길):
            요청 = 길.request
            if 요청.resource_type == 'document':
                답 = 길.fetch()
                길.fulfill(response=답, body=옛으로(답.text()))
            else:
                길.continue_()
        쪽.route('**/%EB%A9%94%EB%AA%A8.html', 낚기)
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(4000)
        본다('옛 HTML 이면 스스로 새로고침한다', len(간) >= 2, '%d번 이동' % len(간))
        본다('🔴 무한 새로고침이 아니다(두 번에서 멈춘다)', len(간) <= 3, '%d번 이동' % len(간))
        본다('되돌이 방패가 걸렸다', 쪽.evaluate("sessionStorage.getItem('zg.새판시도')") == '2',
             쪽.evaluate("sessionStorage.getItem('zg.새판시도')"))
        쪽.close()

        # ── ③ 진짜 상황: 옛 HTML 은 처음 한 번뿐, 새로고침하면 새것이 온다 ──
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844})
        간 = []
        쪽.on('framenavigated', lambda f: 간.append(f.url) if f == 쪽.main_frame else None)
        첫판 = {'썼나': False}
        def 한번만(길):
            요청 = 길.request
            if 요청.resource_type == 'document' and not 첫판['썼나']:
                첫판['썼나'] = True
                답 = 길.fetch()
                길.fulfill(response=답, body=옛으로(답.text()))
            else:
                길.continue_()
        쪽.route('**/%EB%A9%94%EB%AA%A8.html', 한번만)
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(4000)
        본다('한 번 새로고침하고 멈춘다', len(간) == 2, '%d번 이동' % len(간))
        쓰는판 = 쪽.evaluate("[...document.scripts].map(s=>s.src).find(s=>s.includes('17b'))")
        본다('새로고침 뒤에는 새 판을 쓴다', ('?v=' + 지금판) in (쓰는판 or ''), 쓰는판)
        본다('메모 화면 정상', 쪽.locator('.mcard, .ph-shell, .shell').count() >= 1)
        쪽.close()

        # ── ④ 인터넷이 끊겼을 때: 그냥 있는 것으로 떠야 한다 ──
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.add_init_script(심기)
        쪽.goto(주소)
        쪽.route('**/%EB%A9%94%EB%AA%A8.html', lambda 길: 길.abort() if 길.request.resource_type == 'fetch' else 길.continue_())
        쪽.reload(); 쪽.wait_for_timeout(2500)
        본다('받아오기 실패해도 화면은 뜬다', 쪽.locator('.ph-shell, .shell').count() >= 1)
        본다('받아오기 실패해도 에러 없음', len(오류) == 0, 오류[:2])
        쪽.close()
        브.close()
finally:
    서버.terminate()

print('\n═══ %d/%d 통과 ═══' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
