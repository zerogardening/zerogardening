# -*- coding: utf-8 -*-
# 17단계 ③ 재고 업체 고르기 — python3 v3/검수/17-개선/재고-시험.py  (로컬 전용)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '17-개선'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8793', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8793/index.html'

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n' + 이름)
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 900},
                             device_scale_factor=2 if 폰 else 1)
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_timeout(2000)
            쪽.evaluate("() => { ZG.시드.심기(); }")
            쪽.click('.속탭 button:has-text("재고")' if 폰 else '.pc-tabs >> text=재고'); 쪽.wait_for_timeout(700)
            본다('datalist 없음', 쪽.query_selector('#zg-입고업체목록') is None and 쪽.query_selector('.업체지움') is None)
            본다('상자 「업체 전체 ▼」', '전체' in 쪽.inner_text('.고름상자') and '▼' in 쪽.inner_text('.고름상자'), 쪽.inner_text('.고름상자'))
            if not 폰:
                한줄 = 쪽.evaluate("() => { const a = document.querySelector('.고름상자').getBoundingClientRect(), b = document.querySelector('.fchip').getBoundingClientRect(), c = document.querySelector('.editwrap input[type=search], .card input[type=search]').getBoundingClientRect(); return [Math.round(a.width), Math.round(c.width), Math.abs(a.top - b.top) < 12 && Math.abs(c.top - b.top) < 12]; }")
                본다('칩·검색 250·업체 230 한 줄', 한줄[0] == 230 and 한줄[1] == 250 and 한줄[2], 한줄)
            else:
                순서 = 쪽.evaluate("() => { const b = document.querySelector('.ph-body'); const s = b.querySelector('input[type=search]'), g = b.querySelector('.업체고름'), f = b.querySelector('.fchips'); return [s.getBoundingClientRect().top, g.getBoundingClientRect().top, f.getBoundingClientRect().top]; }")
                본다('폰 순서 검색 → 업체 → 칩', 순서[0] < 순서[1] < 순서[2], 순서)
            쪽.click('.고름상자'); 쪽.wait_for_timeout(300)
            줄들 = 쪽.eval_on_selector_all('.펼침 .it', 'es => es.map(e => e.innerText.replace(/\\n/g, " "))')
            본다('펼침 첫 줄 전체·고른 줄 ✓', 줄들 and 줄들[0].startswith('✓') and '전체' in 줄들[0], 줄들[:3])
            본다('aria-expanded true', 쪽.get_attribute('.고름상자', 'aria-expanded') == 'true')
            쪽.screenshot(path=str(여기 / ('재고-1-펼침-' + 이름 + '.png')))
            쪽.mouse.click(300 if 폰 else 700, 30); 쪽.wait_for_timeout(300)
            본다('바깥 누르면 닫힘', 쪽.query_selector('.펼침') is None)
            쪽.click('.고름상자'); 쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(200)
            본다('Escape 로 닫힘', 쪽.query_selector('.펼침') is None)
            쪽.focus('.고름상자'); 쪽.keyboard.press('ArrowDown'); 쪽.keyboard.press('ArrowDown'); 쪽.keyboard.press('Enter'); 쪽.wait_for_timeout(500)
            고른 = 쪽.evaluate("() => ZG.재고목록 ? 1 : 0")
            상자글 = 쪽.inner_text('.고름상자')
            본다('↓↓ Enter 로 첫 업체가 걸린다', 'Escape' not in 상자글 and '건' in 상자글 and 쪽.query_selector('.고름상자.걸림') is not None, 상자글.replace('\n', ' '))
            본다('펼침 닫힘 · 리스너 정리', 쪽.query_selector('.펼침') is None)
            쪽.screenshot(path=str(여기 / ('재고-2-걸림-' + 이름 + '.png')))
            쪽.click('.고름상자 .지움'); 쪽.wait_for_timeout(500)
            본다('✕ 누르면 펼치지 않고 해제', 쪽.query_selector('.고름상자.걸림') is None and 쪽.query_selector('.펼침') is None)
            쪽.click('.고름상자'); 쪽.click('.펼침 .it >> nth=1'); 쪽.wait_for_timeout(400)
            쪽.click('.고름상자'); 쪽.click('.펼침 .it >> nth=0'); 쪽.wait_for_timeout(400)
            본다('펼침 「전체」로 해제', 쪽.query_selector('.고름상자.걸림') is None)
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
