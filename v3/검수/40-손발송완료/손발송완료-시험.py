# -*- coding: utf-8 -*-
# 문자주문 카드 「발송완료」(밀면 삭제 옆 · PC 상태칸) — 로젠 파일 없이 따로 보낸 건 (11/03 우람님)
# python3 v3/검수/40-손발송완료/손발송완료-시험.py · 🔴 로컬 전용(supabase·CDN 막음)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '40-손발송완료'
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});"
        "Object.defineProperty(navigator,'serviceWorker',{get:()=>undefined});")
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

포트 = '8840'
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', 포트, '-d', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://127.0.0.1:%s/%%EC%%A3%%BC%%EB%%AC%%B8.html' % 포트

심기자료 = """() => {
  const 저 = ZG.저장소, k = 저.키, p = 저.품목들()[0], 오늘 = ZG.ui.오늘문자(), 지금 = Date.now();
  const 품 = {품목코드: p.품목코드, 유통명: p.유통명, 학명: '', 규격: p.규격 || '', 수량: 2, 단가: 1000};
  저.덧붙이기(k.문자주문, {id: 'sm_손', 날짜: 오늘, 받는분: '손발송', 전화: '01012345678', 메모: '', 주소: '서울시 시험로 1',
    품목: [품], 배송비: 4500, 상태: '올림', 올린주문번호: '261103-77', 올린일시: 지금, 등록일시: 지금, 수정일시: 지금});
  저.덧붙이기(k.주문, {id: 'o_손1', 주문번호: '261103-77', 주문일: 오늘, 판매처: '문자', 출처: '수동', 문자주문id: 'sm_손',
    품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 주문수량: 2, 옵션입수: 1, 단가: 1000, 수령인: '손발송', 등록일시: 지금});
  return p.품목코드;
}"""
출고 = "() => ZG.저장소.읽기(ZG.저장소.키.출고).filter(s => s.주문id === 'o_손1').map(s => s.수량)"

with sync_playwright() as pw:
    브 = pw.chromium.launch()
    for 폰 in (True, False):
        tag = '폰' if 폰 else 'PC'
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort()); 쪽.route('**supabase.co**', lambda r: r.abort())
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(2500)
        print(쪽.url, 오류[:2]); 쪽.wait_for_function("() => window.ZG && ZG.문자주문 && ZG.수동배송완료 && ZG.주문", timeout=10000)
        쪽.evaluate("() => ZG.시드.심기()"); 쪽.evaluate(심기자료); 쪽.evaluate('ZG.주문.다시그리기()')
        쪽.locator('[role=tab]', has_text='문자').first.click(); 쪽.wait_for_timeout(400)
        쪽.evaluate("() => { ZG.문자주문.목록으로(); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(400)
        if 폰:
            카드 = 쪽.locator('.쓸줄', has_text='손발송')
            본다(tag + ' 밀면 발송완료·삭제 두 단추', 카드.locator('.쓸단추 button .lb').all_text_contents() == ['발송완료', '삭제'], 카드.locator('.쓸단추 button .lb').all_text_contents())
            # 밀기
            b = 카드.locator('.ph-card').bounding_box()
            쪽.mouse.move(b['x'] + b['width'] - 20, b['y'] + 20); 쪽.mouse.down()
            쪽.mouse.move(b['x'] + b['width'] - 220, b['y'] + 22, steps=8); 쪽.mouse.up(); 쪽.wait_for_timeout(300)
            쪽.screenshot(path=str(여기 / '폰-1-밀기.png'))
            카드.locator('.쓸단추 button.ship').click()
        else:
            줄 = 쪽.locator('.문자주문 tbody tr', has_text='손발송')
            본다(tag + ' 상태칸에 발송완료 단추', 줄.locator('button', has_text='발송완료').count() == 1)
            줄.locator('button', has_text='발송완료').click()
        쪽.wait_for_timeout(300)
        본다(tag + ' 확인창 뜸(재고 줄어듦 안내)', 쪽.get_by_text('배송완료로 넘길까요').count() >= 1)
        쪽.screenshot(path=str(여기 / ('%s-2-확인창.png' % tag)))
        쪽.locator('button', has_text='배송완료로 넘기기').last.click(); 쪽.wait_for_timeout(500)
        본다(tag + ' 출고 기록 생김(수량 2)', 쪽.evaluate(출고) == [2], 쪽.evaluate(출고))
        다음 = 쪽.locator('.쓸줄', has_text='손발송') if 폰 else 쪽.locator('.문자주문 tbody tr', has_text='손발송')
        본다(tag + ' 카드가 발송완료로 바뀜(🚚 발송완료 문자 단추)', 다음.locator('.st.ship').count() == 1 and 다음.locator('button', has_text='발송완료 문자').count() == 1)
        if 폰: 본다(tag + ' 발송완료 뒤엔 밀어도 삭제만', 다음.locator('.쓸단추 button .lb').all_text_contents() == ['삭제'])
        else: 본다(tag + ' 발송완료 뒤엔 발송완료 단추 없음', 다음.locator('button', has_text='발송완료').filter(has_not_text='문자').count() == 0)
        쪽.screenshot(path=str(여기 / ('%s-3-뒤.png' % tag)))
        본다(tag + ' 콘솔 오류 0', not 오류, 오류)
        쪽.close()
    브.close()
서버.terminate()
print('%d/%d' % (sum(결과), len(결과)))
