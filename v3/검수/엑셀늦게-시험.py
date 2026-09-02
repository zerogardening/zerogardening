# -*- coding: utf-8 -*-
# 엑셀 도구 늦게 오기 검수 (2026-09-02 우람님 지시 「주문 탭만 1~2초 딜레이」)
#   python3 v3/검수/엑셀늦게-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 🔴 xlsx.min.js(952KB)를 async 로 뺐다 — 매달아 두면 뒤의 스크립트 37개가 그 뒤에 줄을 서
#    주문 화면 첫 그림이 2.5초 늦는다. 그 대신 화면이 뜬 직후엔 엑셀이 아직 없을 수 있다.
# ① 없을 때 눌러도 튕기지 않고 ② 받아지면 그 자리에서 이어서 열려야 한다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8795', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8795/%EC%A3%BC%EB%AC%B8.html'

def 토스트글(쪽):
    return 쪽.eval_on_selector_all('#토스트칸 .toast', 'els => els.map(e => e.textContent).join(" / ")')
def 창수(쪽):
    return 쪽.eval_on_selector_all('.pcsheet.dlv', 'e => e.length')

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        쪽 = 브.new_page(viewport={'width': 1440, 'height': 900})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        막기 = lambda r: r.abort()
        쪽.route('**xlsx.min.js', 막기)          # 엑셀이 아직 안 온 상태를 만든다
        쪽.add_init_script("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');")
        쪽.goto(주소, wait_until='domcontentloaded')
        쪽.wait_for_function("() => window.ZG && ZG.주문 && document.querySelector('.pc-side, .ph-nav')", timeout=15000)

        print('\n① 엑셀이 아직 안 왔을 때')
        본다('엑셀 없이도 화면이 먼저 뜬다', 쪽.evaluate("() => !window.XLSX"))

        쪽.evaluate("() => ZG.주문파일.배송완료()"); 쪽.wait_for_timeout(200)
        본다('「불러오는 중」이라고 알린다', '불러오는 중' in 토스트글(쪽), 토스트글(쪽))
        본다('억지로 창을 열지 않는다', 창수(쪽) == 0)
        쪽.wait_for_timeout(1200)
        본다('끝내 못 받으면 그때 알린다', '못 읽었' in 토스트글(쪽), 토스트글(쪽))
        본다('그래도 창은 안 열린다', 창수(쪽) == 0)

        print('\n② 받아지면 그 자리에서 이어진다')
        쪽.unroute('**xlsx.min.js', 막기)        # 이제 받아진다
        쪽.evaluate("() => ZG.주문파일.배송완료()")
        쪽.wait_for_function("() => !!window.XLSX", timeout=15000); 쪽.wait_for_timeout(500)
        본다('기다리던 창이 저절로 열린다', 창수(쪽) == 1)
        # 🔴 태그 하나에 매달리면 이 재시도가 영영 안 된다 — 08d 가 제 스크립트를 새로 붙이는 이유다
        본다('한 번 실패한 뒤에도 다시 받아진다', 쪽.evaluate("() => !!window.XLSX"))

        쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(300)
        쪽.evaluate("() => ZG.주문파일.배송완료()"); 쪽.wait_for_timeout(300)
        본다('그다음부터는 기다림 없이 바로', 창수(쪽) == 1)
        쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(300)
        쪽.evaluate("() => ZG.주문올리기.열기()"); 쪽.wait_for_timeout(300)
        본다('주문 올리기도 열린다', 쪽.eval_on_selector_all('.pcsheet', 'e => e.length') >= 1)

        본다('콘솔 오류 0', not 오류, 오류[:2])
        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
