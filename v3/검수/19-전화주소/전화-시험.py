# -*- coding: utf-8 -*-
# 19단계 ① 전화 정리 — python3 v3/검수/19-전화주소/전화-시험.py
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막아 서버에 아무것도 안 간다. localStorage 에만 쓴다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8797', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
바탕 = 'http://localhost:8797/'
주소 = 바탕 + '%EC%A3%BC%EB%AC%B8.html'

심기자료 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들();
  const 새 = (이름, i) => 자.새로저장({ 받는분: 이름, 전화: '', 품목: [자.담을줄(ps[i])], 배송비: 3000 }, false).id;
  const A = 새('시험옛번', 8), B = 새('시험올림판', 9);
  저.바꾸기(저.키.문자주문, A, { 전화: '821012345678' });   // 옛 값 — 손으로 심는다
  return { A: A, B: B };
}"""
하나 = "(id) => ZG.문자주문자료.하나(id)"
def 판(폰): return '.문카드 .속' if 폰 else '.속판'

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        # ── 단위 시험 페이지
        쪽 = 브.new_page()
        쪽.goto(바탕 + '검수/19-전화주소/' + '%EC%A0%84%ED%99%94%EC%A0%95%EB%A6%AC-%EC%8B%9C%ED%97%98.html'); 쪽.wait_for_timeout(300)
        글 = 쪽.inner_text('body')
        본다('전화정리 단위 시험 전부 통과', 'PASS' in 글 and 'FAIL' not in 글, 글.strip().split('\n')[-1])
        if 'FAIL' in 글: print(글)
        쪽.close()

        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n' + 이름)
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                             device_scale_factor=2 if 폰 else 1)
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
            쪽.route('**supabase.co**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_timeout(2000)
            쪽.evaluate("() => { ZG.시드.심기(); }")
            쪽.click('text=문자주문 >> nth=0'); 쪽.wait_for_timeout(400)

            # ── 20b 새 문자 — 치는 중엔 그대로, 벗어날 때 바뀜
            tel = '.문자주문 input[type=tel]'
            쪽.click(tel); 쪽.keyboard.type('+82 10-1234-5678')
            본다('치는 중엔 안 바뀜', 쪽.input_value(tel) == '+82 10-1234-5678', 쪽.input_value(tel))
            쪽.evaluate("(s) => document.querySelector(s).blur()", tel); 쪽.wait_for_timeout(100)
            본다('벗어날 때 010- 으로', 쪽.input_value(tel) == '010-1234-5678', 쪽.input_value(tel))
            본다('상태에도 반영', 쪽.evaluate("() => ZG.문자주문새문자.상태.전화") == '010-1234-5678')
            # 붙여넣기 — 다음 틱에 바뀜
            쪽.evaluate("""(s) => { const e = document.querySelector(s); e.focus(); e.value = '+82 (0)10 9999 8888';
              e.dispatchEvent(new ClipboardEvent('paste', { bubbles: true })); e.dispatchEvent(new Event('input', { bubbles: true })); }""", tel)
            쪽.wait_for_timeout(100)
            본다('붙여넣기 → 바로 010-', 쪽.input_value(tel) == '010-9999-8888', 쪽.input_value(tel))
            # 저장 때 — 벗어나지 않은 채 저장 단추
            쪽.evaluate("() => { const 자 = ZG.문자주문자료; ZG.문자주문새문자.상태.담은것.push(자.담을줄(ZG.저장소.품목들()[7])); }")
            쪽.fill(tel, '+821055556666')
            쪽.click('.문자주문 .보냄줄 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate("() => ZG.문자주문자료.전부().filter(r => r.품목[0] && r.품목[0].품목코드 === ZG.저장소.품목들()[7].품목코드)[0]")
            본다('저장 때 숫자만 010…', r and r['전화'] == '01055556666', r and r['전화'])

            # ── 20c 펼침 — 옛 8210… 줄이 010- 로 보이고, +82 로 고쳐 저장
            m = 쪽.evaluate(심기자료)
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)
            if 폰: 쪽.click('.문카드:has-text("시험옛번") .r1')
            else: 쪽.click('tr:has-text("시험옛번") td.fx')
            쪽.wait_for_timeout(300)
            pt = 판(폰) + ' input[type=tel]'
            본다('펼침 — 옛 8210… 이 010- 로', 쪽.input_value(pt) == '010-1234-5678', 쪽.input_value(pt))
            쪽.fill(pt, '+82 10 2222 3333'); 쪽.evaluate("(s) => document.querySelector(s).blur()", pt); 쪽.wait_for_timeout(100)
            본다('펼침 — 벗어날 때 010-', 쪽.input_value(pt) == '010-2222-3333', 쪽.input_value(pt))
            쪽.click(판(폰) + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            본다('펼침 저장 01022223333', 쪽.evaluate(하나, m['A'])['전화'] == '01022223333')

            # ── 20d 올림 판
            b = 쪽.query_selector(('.문카드:has-text("시험올림판") .act button:has-text("주문올리기")') if 폰 else ('tr:has-text("시험올림판") td.상태칸 button:has-text("주문올리기")'))
            b.click(); 쪽.wait_for_timeout(300)
            ot = ('.문카드 .속.올림' if 폰 else '.올림판') + ' input[type=tel]'
            쪽.fill(('.문카드 .속.올림' if 폰 else '.올림판') + ' input[placeholder="받는 분"]', '시험올림판')
            쪽.fill(ot, '+82-10-7777-8888'); 쪽.evaluate("(s) => document.querySelector(s).blur()", ot); 쪽.wait_for_timeout(100)
            본다('올림 판 — 벗어날 때 010-', 쪽.input_value(ot) == '010-7777-8888', 쪽.input_value(ot))
            쪽.click(('.문카드 .속.올림' if 폰 else '.올림판') + ' button:has-text("주문올리기")'); 쪽.wait_for_timeout(300)
            rb = 쪽.evaluate(하나, m['B'])
            줄 = 쪽.evaluate("(id) => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === id)[0]", m['B'])
            본다('올림 — 문자주문 01077778888 · 주문줄 010-7777-8888', rb['상태'] == '올림' and rb['전화'] == '01077778888' and 줄 and 줄['수령인전화'] == '010-7777-8888', [rb['전화'], 줄 and 줄['수령인전화']])

            if not 폰:
                # ── 08h 로젠 줄 — 옛 +82 값도 010- 로
                o = 쪽.evaluate("() => ZG.주문올리기.세운27({ 수령인: '가', 수령인주소: '서울', 수령인전화: '+82 10-1234-5678' })")
                본다('로젠 세운27 — +82 → 010- (두 칸)', o[16] == '010-1234-5678' and o[18] == '010-1234-5678', [o[16], o[18]])
                o = 쪽.evaluate("() => ZG.주문올리기.세운27({ 수령인: '가', 수령인주소: '서울', 수령인전화: '821012345678' })")
                본다('로젠 세운27 — 옛 8210… → 010-', o[16] == '010-1234-5678')

                # ── 08c 주문수정 — 손 안 댄 업로드 번호는 그대로, 「수정됨」 안 붙음
                id = 쪽.evaluate("""() => { const 저 = ZG.저장소, p = 저.품목들()[6], 자리 = p.품목코드.lastIndexOf('-');
                  const st = { 접두: p.품목코드.slice(0, 자리), cm: Number(p.품목코드.slice(자리 + 1)), 유통명: p.유통명, 학명: p.학명, 수량: 1, 단가: 1000, 원코드: p.품목코드 };
                  const 줄 = ZG.주문입력.줄만들기(st, { 이름: '시험업로드', 전화: '01012345678', 주소: '서울 마포구 성미산로 21' }, ZG.ui.오늘문자(), '스마트스토어',
                    { 주문번호: 'T19', 판매처: '스마트스토어', 출처: '업로드', 묶음id: '' });
                  return 저.덧붙이기(저.키.주문, 줄).id; }""")
                def 줄보기(): return 쪽.evaluate("(id) => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.id === id)[0]", id)
                def 수정창열기():
                    쪽.evaluate("(id) => { const g = ZG.주문자료.건으로묶기(ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.id === id))[0]; ZG.주문입력.PC수정창(g); }", id)
                    쪽.wait_for_timeout(300)
                수정창열기()
                쪽.click('button.main:has-text("저장")'); 쪽.wait_for_timeout(300)
                r = 줄보기()
                본다('주문수정 — 손 안 댄 전화 그대로 · 수정됨 없음', r['수령인전화'] == '01012345678' and not r.get('수정됨'), [r['수령인전화'], r.get('수정됨')])
                수정창열기()
                쪽.fill('.pcsheet input[type=tel], input[type=tel] >> nth=-1', '+82 10 3333 4444')
                쪽.click('button.main:has-text("저장")'); 쪽.wait_for_timeout(300)
                r = 줄보기()
                본다('주문수정 — 고친 전화 010- · 수정됨', r['수령인전화'] == '010-3333-4444' and r.get('수정됨'), [r['수령인전화'], r.get('수정됨')])

            # ── 08c 수동주문 저장
            쪽.evaluate("() => ZG.주문.열기('수동')"); 쪽.wait_for_timeout(400)
            칸들 = 쪽.query_selector_all('.itemstack input.inp')
            칸들[0].fill('시험수동')
            쪽.fill('.itemstack input[type=tel]', '+82 10-4444-5555')
            칸들[3].fill('서울 마포구 성미산로 21')
            본 = 쪽.evaluate("""() => { const 저 = ZG.저장소, p = 저.품목들()[5]; return p.유통명; }""")
            이름칸 = 쪽.query_selector_all('input[placeholder*="유통명"], .card input.inp:not([type=tel])')
            ok = False
            try:
                n = 쪽.query_selector('input[placeholder*="품목"], input[placeholder*="유통명"]')
                n.click(); 쪽.keyboard.type(본[:2]); 쪽.wait_for_timeout(500)
                쪽.click('.ac .it >> nth=0'); 쪽.wait_for_timeout(200)
                쪽.click('button.ph-save:has-text("주문등록")'); 쪽.wait_for_timeout(500)
                if 쪽.query_selector('.askbox'): 쪽.click('.askbox button:has-text("넣기")'); 쪽.wait_for_timeout(300)
                r = 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.수령인 === '시험수동')[0]")
                if not r: print('    토스트:', 쪽.evaluate("() => document.getElementById('토스트칸') && document.getElementById('토스트칸').innerText"), 쪽.input_value('.itemstack input[type=tel]'), len(칸들))
                ok = r and r['수령인전화'] == '010-4444-5555'
                본다('수동주문 — +82 → 010-4444-5555 로 저장', ok, r and r['수령인전화'])
            except Exception as e:
                본다('수동주문 저장', False, e)
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
