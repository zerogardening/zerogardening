# -*- coding: utf-8 -*-
# 11/10 메인 = 문자주문 목록 · ✉️ 로 새 문자 · ✕/저장/문자 로 돌아옴 — python3 v3/검수/49-새문자흐름/새문자흐름-시험.py
# 🔴 로컬 전용 · 가짜 자료 · 문자앱은 sms: 링크 누름을 가로채 흉내, 앱을 나갔다 오는 건 visibilitychange 로
import re, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
        "window.__링크 = []; const 옛클릭 = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('sms:')) { __링크.push(this.href); return; } return 옛클릭.call(this); };"
        "Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.resolve(''), writeText: () => Promise.resolve() } });")
심기 += (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), '8856', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (True, False):
            틀 = '폰' if 폰 else 'PC'
            print('\n[' + 틀 + ']')
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1400}, device_scale_factor=2 if 폰 else 1, service_workers='block')
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**', '**daumcdn.net**'): 쪽.route(길, lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto('http://localhost:8856/%EC%A3%BC%EB%AC%B8.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.문자주문새문자)', timeout=20000)
            쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }")
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(400)
            뷰 = lambda: 쪽.evaluate("() => ZG.문자주문.상태.뷰")
            본다('문자 탭 = 메인 목록(단계 탭)', 뷰() == '목록' and 쪽.locator('.단계줄').is_visible())
            if 폰: 본다('폰 머리줄 날짜 = 오늘(첫 화면)', 쪽.evaluate("() => { const t = ZG.ui.오늘문자(); return Number(t.slice(5, 7)) + '월 ' + Number(t.slice(8, 10)) + '일'; }") in 쪽.inner_text('body'))
            본다('옛 오가는 단추 없음(「‹ 새 문자」「📋 문자주문 목록」)', 쪽.locator('button:has-text("‹ 새 문자")').count() == 0)
            가 = 쪽.evaluate("() => { const a = document.querySelector('.새문자칩').getBoundingClientRect(), d = document.querySelector('.날짜칸').getBoundingClientRect(), b = document.querySelector('.발송칩:not(.새문자칩)').getBoundingClientRect(), c = document.querySelector('.날짜머리').getBoundingClientRect(); return [Math.round((a.left + b.right) / 2 - (c.left + c.width / 2)), a.right <= d.left, d.right <= b.left, Math.round(a.width), Math.round(a.height)]; }")
            본다('「✉️ ‹ 날짜 › 🚚」 묶음 가운데(±2px) · ✉️ 왼쪽 · 🚚 오른쪽 · 손가락 크기', abs(가[0]) <= 2 and 가[1] and 가[2] and 가[3] >= 44 and 가[4] >= 44, 가)
            쪽.screenshot(path=str(여기 / ('1-메인-' + 틀 + '.png')), animations='disabled')
            # ✉️ → 새 문자 · ✕ 빈 화면 바로 닫힘
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            본다('✉️ → 새 문자 · 「📋 문자주문 목록」 단추 없음 · ✕ 닫기 있음', 뷰() == '새문자' and 쪽.locator('button:has-text("문자주문 목록")').count() == 0 and 쪽.locator('.닫기x').count() == 1)
            쪽.screenshot(path=str(여기 / ('2-새문자-' + 틀 + '.png')), animations='disabled')
            쪽.click('.닫기x'); 쪽.wait_for_timeout(300)
            본다('빈 새 문자 ✕ → 확인창 없이 바로 목록', 뷰() == '목록' and 쪽.locator('.askbox').count() == 0)
            # 내용 있으면 확인창 — 계속 쓰기 / 버리기
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            쪽.fill('.문자주문 input[placeholder="받는 분"]', '흐름손님'); 쪽.wait_for_timeout(250)
            쪽.click('.닫기x'); 쪽.wait_for_timeout(300)
            창 = 쪽.inner_text('.askbox') if 쪽.query_selector('.askbox') else ''
            본다('내용 있으면 「작성 중인 내용을 버릴까요?」 버리기/계속 쓰기', '작성 중인 내용을 버릴까요?' in 창 and '버리기' in 창 and '계속 쓰기' in 창, 창.replace('\n', ' / '))
            쪽.screenshot(path=str(여기 / ('3-버릴까요-' + 틀 + '.png')), animations='disabled')
            쪽.click('.askbox button:has-text("계속 쓰기")'); 쪽.wait_for_timeout(300)
            본다('계속 쓰기 → 그대로 새 문자 · 쓰던 이름 남음', 뷰() == '새문자' and 쪽.input_value('.문자주문 input[placeholder="받는 분"]') == '흐름손님')
            쪽.click('.닫기x'); 쪽.wait_for_timeout(300); 쪽.click('.askbox button:has-text("버리기")'); 쪽.wait_for_timeout(300)
            본다('버리기 → 목록 · 다시 열면 빈 새 문자', 뷰() == '목록' and 쪽.evaluate("() => ZG.문자주문새문자.상태.받는분") == '')
            # 문자 단추 안 누르고 앱을 나갔다 옴(붙여넣기 하러 문자앱) → 그대로
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            쪽.fill('.문자주문 input[placeholder="받는 분"]', '붙임손님'); 쪽.wait_for_timeout(250)
            쪽.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }")
            쪽.wait_for_timeout(200)
            쪽.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }")
            쪽.wait_for_timeout(400)
            본다('문자 안 누르고 나갔다 옴 → 새 문자 그대로 · 쓰던 내용 남음', 뷰() == '새문자' and 쪽.input_value('.문자주문 input[placeholder="받는 분"]') == '붙임손님')
            # 저장 → 메인
            쪽.evaluate("() => { const s = ZG.문자주문새문자.상태; s.담은것 = [ZG.문자주문자료.담을줄(ZG.저장소.품목들()[1])]; ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(250)
            쪽.click('.문자주문 .보냄줄 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            본다('저장 → 메인 목록 · 저장됨', 뷰() == '목록' and 쪽.evaluate("() => ZG.문자주문자료.전부().some(r => r.받는분 === '붙임손님')"))
            # 문자 → 문자앱 열림 → 돌아오면 메인
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            쪽.evaluate("() => { const s = ZG.문자주문새문자.상태; s.담은것 = [ZG.문자주문자료.담을줄(ZG.저장소.품목들()[1])]; s.전화 = '01000000000'; ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(250)
            쪽.fill('.문자주문 input[placeholder="받는 분"]', '문자손님'); 쪽.wait_for_timeout(250)
            쪽.click('.문자주문 .보냄줄 button:has-text("문자")'); 쪽.wait_for_timeout(300)
            쪽.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }")
            쪽.wait_for_timeout(300)
            본다('문자 → 문자앱 열림(sms:) · 돌아오면 메인 목록', 뷰() == '목록' and len(쪽.evaluate("() => window.__링크")) == 1 and 쪽.locator('.단계줄').is_visible())
            본다('페이지 에러 0', not 오류, 오류[:3])
            쪽.close()
        브.close()
finally:
    서버.kill()
print('\n%d/%d' % (sum(결과), len(결과)))
