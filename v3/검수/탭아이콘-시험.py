# -*- coding: utf-8 -*-
# 탭·옆메뉴 아이콘 정비 시험 (2026-08-26 우람님 지시 3건)
#   python3 v3/검수/탭아이콘-시험.py     ← 그대로 돌리면 된다 (playwright 필요)
# 샷은 이 파일 옆 「샷-탭아이콘/」에 떨어진다.
import pathlib, sys
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
샷 = pathlib.Path(__file__).resolve().parent / '샷-탭아이콘'
샷.mkdir(exist_ok=True)
# 🔴 토큰이 없으면 01b-서버가 로그인으로 튕긴다 · 바깥 통신은 통째로 막아 로컬 전용으로 떨군다
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token', '{\"시험용\":true}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});")

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(참)
    print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

def 새쪽(브, 폭, 높이):
    쪽 = 브.new_page(viewport={'width': 폭, 'height': 높이}, device_scale_factor=2)
    쪽._에러 = []
    쪽.on('console', lambda m: 쪽._에러.append(m.text) if m.type == 'error' else None)
    쪽.on('pageerror', lambda e: 쪽._에러.append('pageerror: %s' % e))
    쪽.route('http://**', lambda r: r.abort())
    쪽.route('https://**', lambda r: r.abort())
    쪽.add_init_script(심기)
    return 쪽

with sync_playwright() as p:
    브 = p.chromium.launch()

    print('\n① 다섯 화면 · 폰/PC 에 선 아이콘이 떴는가 (이모지 0개)')
    for f in ['index.html', '주문.html', '업체.html', '소싱.html', '메모.html']:
        for 폭, 높이, 딱지 in [(390, 844, '폰'), (1440, 900, 'PC')]:
            쪽 = 새쪽(브, 폭, 높이)
            쪽.goto((뿌리 / f).as_uri()); 쪽.wait_for_timeout(1400)
            svg = 쪽.eval_on_selector_all('.ph-nav svg.ico, .pc-side svg.ico', 'e=>e.length')
            민칸 = 쪽.eval_on_selector_all('.ph-nav .ic, .pc-side .ic',
                                          'e=>e.filter(x=>!x.querySelector("svg")).length')
            본다('%s %s — svg %d개 · svg없는 칸 %d개 · 에러 %d건'
                 % (f, 딱지, svg, 민칸, len(쪽._에러)),
                 svg >= 5 and 민칸 == 0 and not 쪽._에러, 쪽._에러[:2])
            쪽.close()

    print('\n② 누름 표시 — 칸 전체가 아니라 아이콘만 줄었다 펴진다')
    쪽 = 새쪽(브, 390, 844)
    쪽.goto((뿌리 / 'index.html').as_uri()); 쪽.wait_for_timeout(1400)
    본다('탭 하이라이트(칸 전체 회색)가 꺼져 있다',
         쪽.eval_on_selector('.ph-nav button', 'e=>getComputedStyle(e).webkitTapHighlightColor')
         == 'rgba(0, 0, 0, 0)')
    바 = 쪽.query_selector('.ph-nav')
    바.screenshot(path=str(샷 / '평소.png'))
    단추 = 쪽.query_selector_all('.ph-nav button')[1]
    상자 = 단추.bounding_box()
    쪽.mouse.move(상자['x'] + 상자['width'] / 2, 상자['y'] + 상자['height'] / 2)
    쪽.mouse.down(); 쪽.wait_for_timeout(200)
    바.screenshot(path=str(샷 / '누름중.png'))
    누름 = 쪽.eval_on_selector('.ph-nav button:nth-child(2) .ic',
                              'e=>[getComputedStyle(e).transform, getComputedStyle(e).opacity]')
    본다('누르는 동안 아이콘이 작아지고 옅어진다 — %s' % 누름,
         'matrix(0.86' in 누름[0] and float(누름[1]) < 0.9)
    쪽.mouse.up(); 쪽.wait_for_timeout(400)   # 🔴 누르면 탭이 바뀌며 바가 통째로 다시 그려진다 — 손잡이를 다시 잡는다
    본다('놓으면 되돌아온다',
         쪽.eval_on_selector('.ph-nav button:nth-child(2) .ic', 'e=>getComputedStyle(e).transform') == 'none')

    print('\n③ 햅틱 — vibrate 가 없는 기기(아이폰)에서 switch 딱지를 심는다')
    쪽.evaluate("()=>{try{Object.defineProperty(navigator,'vibrate',{value:undefined,configurable:true})}catch(e){}}")
    쪽.query_selector_all('.ph-nav button')[1].click(); 쪽.wait_for_timeout(400)
    본다('안 보이는 switch 딱지가 하나 심겼다',
         쪽.evaluate("document.querySelectorAll('label[aria-hidden] input[switch]').length") == 1)
    쪽.close()

    print('\n④ 더보기 시트도 같은 아이콘을 쓴다')
    쪽 = 새쪽(브, 390, 844)
    쪽.goto((뿌리 / 'index.html').as_uri()); 쪽.wait_for_timeout(1400)
    쪽.query_selector_all('.ph-nav button')[-1].click(); 쪽.wait_for_timeout(500)
    시트 = 쪽.query_selector('.askbox')
    if 시트: 시트.screenshot(path=str(샷 / '더보기시트.png'))
    본다('시트 항목 셋에 svg 아이콘이 붙었다',
         쪽.eval_on_selector_all('.askbox svg.ico', 'e=>e.length') == 3)
    쪽.close()

    print('\n⑤ 재고 탭 — 들어가도 검색칸에 키보드가 안 뜬다 (손대야열림)')
    쪽 = 새쪽(브, 390, 844)
    쪽.goto((뿌리 / 'index.html').as_uri()); 쪽.wait_for_timeout(1400)
    쪽.query_selector_all('.ph-nav button')[1].click(); 쪽.wait_for_timeout(900)
    칸 = 쪽.query_selector('.ph-shell input[type=search]')
    본다('재고 검색칸이 있다', bool(칸))
    본다('손 닿기 전엔 읽기전용이다 — 커서가 붙어도 키보드가 안 뜬다',
         bool(칸) and 쪽.evaluate('e=>e.readOnly', 칸))
    본다('탭 누른 뒤 커서가 입력칸에 가 있지 않다',
         쪽.evaluate("document.activeElement.tagName") != 'INPUT',
         쪽.evaluate("document.activeElement.tagName"))
    if 칸:
        쪽.dispatch_event('.ph-shell input[type=search]', 'touchstart')
        본다('손이 닿으면 바로 풀린다', not 쪽.evaluate('e=>e.readOnly', 칸))
        칸.click(); 칸.type('장미')
        본다('풀린 뒤 글씨가 쳐진다 — %s' % 쪽.evaluate('e=>e.value', 칸),
             쪽.evaluate('e=>e.value', 칸) == '장미')
    쪽.close()

    print('\n⑥ PC 는 읽기전용을 걸지 않는다 (소프트 키보드가 없다)')
    쪽 = 새쪽(브, 1440, 900)
    쪽.goto((뿌리 / 'index.html').as_uri() + '#재고'); 쪽.wait_for_timeout(1400)
    칸 = 쪽.query_selector('input[type=search]')
    본다('PC 검색칸은 그냥 쓸 수 있다', bool(칸) and not 쪽.evaluate('e=>e.readOnly', 칸))
    쪽.close()
    브.close()

print('\n%d/%d 통과 · 샷 → %s' % (sum(결과), len(결과), 샷))
sys.exit(0 if all(결과) else 1)
