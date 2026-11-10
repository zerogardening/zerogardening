# -*- coding: utf-8 -*-
# 문자주문 「🚚 발송문자」 갈래 검수 (2026-11-09 우람님 「배송완료 문자 안 보낸 거 쭉 모아서 다 보내게」)
#   python3 v3/검수/발송문자모음-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 날짜 상관없이 「올림 + 출고됨 + 발송문자 안 보냄」만 모이고, 보내면 목록에서 빠지는가.
import json, pathlib, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

원본 = pathlib.Path(__file__).resolve().parent.parent
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});"
        "Object.defineProperty(navigator,'serviceWorker',{get:()=>undefined});")
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

def 문(id, 날짜, 상태, 번호='', 보냄=None):
    r = {'id': id, '날짜': 날짜, '상태': 상태, '받는분': id, '전화': '01012345678', '등록일시': 1,
         '품목': [{'품목코드': 'A-0', '유통명': '작약', '규격': '', '수량': 1, '단가': 10000}], '올린주문번호': 번호}
    if 보냄: r['발송문자보냄일시'] = 보냄
    return r
문자들 = [문('가', '2026-10-31', '올림', '261031-01'), 문('나', '2026-11-09', '올림', '261109-01'),
         문('다', '2026-11-08', '올림', '261108-01', 보냄=5), 문('라', '2026-11-09', '올림', '261109-02'),
         문('마', '2026-11-09', '보냄'), dict(문('당근7', '2026-10-30', '올림', '261030-01'), 전화='')]
주문들 = [{'id': 'o' + x, '주문번호': n, '판매처': '문자', '문자주문id': x, '품목코드': 'A-0', '유통명': '작약'}
         for x, n in [('당근7', '261030-01'), ('가', '261031-01'), ('나', '261109-01'), ('다', '261108-01'), ('라', '261109-02')]]
출고들 = [{'id': 's' + x, '출처': '주문', '주문id': 'o' + x, '수량': 1, '운송장번호': '1234' + x, '등록일시': 1}
         for x in ['당근7', '가', '나', '다']]   # 라 = 올렸지만 아직 안 나감
데이터 = ("localStorage.setItem('zg.v3.문자주문',%s);localStorage.setItem('zg.v3.주문',%s);localStorage.setItem('zg.v3.출고',%s);"
          % tuple(json.dumps(json.dumps(x, ensure_ascii=False)) for x in (문자들, 주문들, 출고들)))

터 = pathlib.Path(tempfile.mkdtemp(prefix='zg-bs-')); 사본 = 터 / 'v3'
shutil.copytree(원본, 사본, ignore=shutil.ignore_patterns('검수', '시안', '설계', '.git'))
서버 = subprocess.Popen([sys.executable, str(pathlib.Path(__file__).resolve().parent / '_시험서버.py'), '8823', str(사본)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폭, 이름 in [(1400, 'PC'), (390, '폰')]:
            print('\n[%s]' % 이름)
            쪽 = 브.new_page(viewport={'width': 폭, 'height': 900}, is_mobile=(폭 < 500), has_touch=(폭 < 500))
            터진것 = []; 쪽.on('pageerror', lambda e: 터진것.append(str(e)))
            쪽.add_init_script(심기 + 데이터 + "window.__열린=[];")
            쪽.goto('http://127.0.0.1:8823/주문.html')
            쪽.wait_for_function('!!window.ZG && !!ZG.문자주문 && !!ZG.문자주문자료', timeout=20000)
            목 = 쪽.evaluate('() => ZG.문자주문자료.발송문자안보냄().map(r => r.id)')
            본다('안 보낸 발송완료만, 오래된 것부터 (당근 뺌)', 목 == ['가', '나'], 목)
            쪽.evaluate("() => { ZG.문자주문자료.문자열기 = (t, g) => window.__열린.push([t, g]); }")
            쪽.locator('[role=tab]', has_text='문자').first.click()
            쪽.evaluate('() => ZG.문자주문.목록으로()')
            칩 = 쪽.locator('.fchip', has_text='발송문자 안 보냄')
            본다('「🚚 발송문자」 칩에 2', 칩.count() >= 1 and '2' in 칩.first.inner_text(), 칩.first.inner_text() if 칩.count() else '')
            칩.first.click(); 쪽.wait_for_timeout(300)
            보내기 = 쪽.get_by_text('🚚 발송완료 문자')
            본다('목록에 발송 단추 2개', 보내기.count() == 2, 보내기.count())
            쪽.screenshot(path=str(원본 / '검수' / ('발송문자모음-%s.png' % 이름)))
            보내기.first.click(); 쪽.wait_for_timeout(300)
            본다('보낸 줄은 목록에서 빠진다', 쪽.get_by_text('🚚 발송완료 문자').count() == 1)
            본다('문자앱에 송장 담긴 글', 쪽.evaluate('() => window.__열린.length') == 1 and '1234가' in 쪽.evaluate('() => window.__열린[0][1]'))
            쪽.get_by_text('🚚 발송완료 문자').first.click(); 쪽.wait_for_timeout(300)
            본다('다 보내면 빈 목록 안내', 쪽.get_by_text('발송문자 다 보냈습니다').count() == 1)
            본다('콘솔 에러 없다', not 터진것, 터진것)
            쪽.close()
        브.close()
finally:
    서버.terminate(); shutil.rmtree(터, ignore_errors=True)
print('\n%d/%d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
