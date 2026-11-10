# -*- coding: utf-8 -*-
# 44 문자주문 「다시 보내기」 — 보낸 뒤 다시 보내기·품목 고쳐 다시 보내기 때 문자 내용이 매번 넘어가는가(11/08 우람님)
#   python3 v3/검수/44-문자다시/문자다시-시험.py
#   폰·PC 둘 다 sms: 링크 body = 복사해 둔 글 = 지금 품목 그대로 · 🔴 아이폰은 그 대화창이 열려 있으면 body 를 버린다 → 폰도 복사
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막는다. 실서버 안 씀
import json, pathlib, re, subprocess, sys, time
from urllib.parse import unquote
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
        "window.__복사 = []; window.__링크 = [];"
        "Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => ({ writeText: (t) => { __복사.push(t); return Promise.resolve(); } }) });"
        "const 옛클릭 = HTMLAnchorElement.prototype.click;"
        "HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('sms:')) { __링크.push(this.href); return; } return 옛클릭.call(this); };")
심기 += (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, str(pathlib.Path(__file__).resolve().parents[1] / '_시험서버.py'), '8843', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (True, False):
            틀 = '폰' if 폰 else 'PC'
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000}, service_workers='block')
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort()); 쪽.route('**supabase.co**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto('http://localhost:8843/%EC%A3%BC%EB%AC%B8.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문)', timeout=20000)
            쪽.evaluate("""() => { ZG.시드.심기(); const 저 = ZG.저장소, 지금 = Date.now();
              저.덧붙이기(저.키.문자주문, { id: 'sm_다시', 날짜: ZG.ui.오늘문자(), 받는분: '김다시', 전화: '01077771111', 메모: '', 주소: '',
                품목: [{ 품목코드: 'CAR01-10', 유통명: '청사초', 학명: '', 규격: '10cm', 수량: 1, 단가: 3800 }], 배송비: 4500,
                상태: '저장', 등록일시: 지금, 수정일시: 지금 }); ZG.주문.다시그리기(); }""")
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(400)
            쪽.evaluate('() => ZG.문자주문.목록보기()'); 쪽.wait_for_timeout(400)   # 11/10 — 메인이 목록(옛 「문자주문 목록」 단추 걷음)
            def 펼치기():
                if 쪽.locator('.속').count() == 0:
                    (쪽.locator('.문카드', has_text='김다시').locator('.r1') if 폰 else 쪽.locator('tr', has_text='김다시').first).click()
                    쪽.wait_for_timeout(300)
            # ① 처음 보내기 → ② 그대로 다시 보내기 → ③ 수량 고쳐 다시 보내기
            펼치기(); 쪽.locator('button:visible', has_text='💬 문자').first.click(); 쪽.wait_for_timeout(300)
            펼치기(); 쪽.locator('button:visible', has_text='다시 보내기').first.click(); 쪽.wait_for_timeout(300)
            펼치기(); 쪽.locator('button[aria-label="하나 늘리기"]:visible').first.click(); 쪽.wait_for_timeout(100)
            쪽.locator('button:visible', has_text='다시 보내기').first.click(); 쪽.wait_for_timeout(300)
            링크, 복사 = 쪽.evaluate('__링크'), 쪽.evaluate('__복사')
            몸 = [unquote(l.split('?body=', 1)[1]) if '?body=' in l else '' for l in 링크]
            본다(f'{틀} 세 번 모두 문자앱 링크', len(링크) == 3, len(링크))
            본다(f'{틀} 세 번 모두 링크에 문자 내용', all('청사초' in b for b in 몸))
            본다(f'{틀} 세 번 모두 같은 글을 복사해 둠(폰 포함)', 복사 == 몸, f'복사 {len(복사)}번')
            본다(f'{틀} 고친 뒤 글 = 고친 수량(2개)', len(몸) == 3 and '2개X3,800원' in 몸[2] and '1개X3,800원' in 몸[1])
            본다(f'{틀} 토스트 「복사했습니다」', '복사했습니다' in 쪽.locator('#토스트칸').inner_text())
            쪽.screenshot(path=str(여기 / f'{틀}-다시보낸뒤.png'))
            본다(f'{틀} 콘솔 빨간 에러 0', not 오류, 오류[:2])
            쪽.close()
        브.close()
finally:
    서버.terminate(); 서버.wait()
print(f'{sum(결과)}/{len(결과)}')
sys.exit(0 if all(결과) else 1)
