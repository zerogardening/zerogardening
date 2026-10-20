# -*- coding: utf-8 -*-
# 19단계 ② 주소 확인 — python3 v3/검수/19-전화주소/주소확인-시험.py
# 🔴 로컬 전용 — supabase·카카오 스크립트를 막는다. 카카오 우편번호는 가짜로 심고 oncomplete 를 손으로 부른다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '19-전화주소'
심기 = """localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{"a":1}');
window.daum = { Postcode: function (o) { this.embed = function (el, op) { window.__우편 = { o: o, op: op, 몇: (window.__우편 ? window.__우편.몇 : 0) + 1 }; }; } };"""
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8798', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
바탕 = 'http://localhost:8798/'
주소 = 바탕 + '%EC%A3%BC%EB%AC%B8.html'

def 카(번호, 질의='북한강로'):
    return {'zonecode': '12503', 'userSelectedType': 'R', 'query': 질의,
            'roadAddress': '경기 양평군 서종면 북한강로 ' + 번호, 'roadname': '북한강로',
            'jibunAddress': '경기 양평군 서종면 문호리 ' + ('683-2' if 번호 == '112' else '702-1'),
            'sido': '경기', 'sigungu': '양평군', 'apartment': 'N', 'buildingName': ''}
골랐다 = "(d) => { window.__우편.o.oncomplete(d); }"
하나 = "(id) => ZG.문자주문자료.하나(id)"

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        쪽 = 브.new_page()
        쪽.goto(바탕 + '검수/19-전화주소/' + '%EC%A3%BC%EC%86%8C%EB%B9%84%EA%B5%90-%EC%8B%9C%ED%97%98.html'); 쪽.wait_for_timeout(300)
        글 = 쪽.inner_text('body')
        본다('주소비교 단위 시험 전부 통과', 'PASS' in 글 and 'FAIL' not in 글, 글.strip().split('\n')[-1])
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
            쪽.route('**daumcdn.net**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_timeout(2000)
            쪽.evaluate("() => { ZG.시드.심기(); }")
            쪽.click('text=문자주문 >> nth=0'); 쪽.wait_for_timeout(400)
            쪽.evaluate("() => { ZG.문자주문새문자.상태.담은것.push(ZG.문자주문자료.담을줄(ZG.저장소.품목들()[1])); ZG.주문.다시그리기(); }")
            쪽.wait_for_timeout(300)
            칸 = '.문자주문 input[placeholder="주소"]'
            상세 = '.문자주문 input[placeholder="상세주소"]'
            찾기 = '.문자주문 button:has-text("주소 찾기")'
            def 원문치기(글):
                쪽.fill(칸, 글); 쪽.wait_for_timeout(200)
                쪽.click(찾기); 쪽.wait_for_timeout(200)
            def 상태(): return 쪽.evaluate("() => { const s = ZG.문자주문새문자.상태; return { 원문: s.원문주소, 확인: s.주소확인, 주소: s.주소, 상세: s.상세주소 }; }")

            # ── 일치
            원문치기('경기 양평군 서종면 북한강로 112, 2층')
            본다('찾기 — embed 가 원문으로 열림', 쪽.evaluate("() => window.__우편.op.q") == '경기 양평군 서종면 북한강로 112, 2층')
            쪽.evaluate(골랐다, 카('112')); 쪽.wait_for_timeout(300)
            줄글 = 쪽.inner_text('.문자주문 .확인줄.맞음') if 쪽.query_selector('.문자주문 .확인줄.맞음') else ''
            본다('일치 줄 — ✓ 원문과 일치 / 도로명 / 지번', '원문과 일치' in 줄글 and '북한강로 112' in 줄글 and '서종면 문호리 683-2' in 줄글, 줄글.replace('\n', ' / '))
            s = 상태()
            본다('일치 — 주소 채움 · 꼬리 2층은 상세주소로', 쪽.input_value(칸).strip() == '경기 양평군 서종면 북한강로 112' and 쪽.input_value(상세) == '2층' and s['상세'] == '2층', [쪽.input_value(칸), 쪽.input_value(상세), s])
            본다('일치 — 주소확인 일치 · 원문 저장', s['확인'] == '일치' and s['원문'] == '경기 양평군 서종면 북한강로 112, 2층')
            쪽.screenshot(path=str(여기 / ('1-일치-' + 이름 + '.png')), full_page=True, animations='disabled')

            # ── 두 번째 찾기 — 카카오 주소가 원문을 덮지 않는다
            쪽.click(찾기); 쪽.wait_for_timeout(200)
            본다('두 번째 찾기 — 원문 그대로', 상태()['원문'] == '경기 양평군 서종면 북한강로 112, 2층')
            쪽.evaluate("() => { document.querySelectorAll('.pcscrim').forEach(e => e.click()); }"); 쪽.wait_for_timeout(100)

            # ── 다름 → 확인창
            쪽.fill(상세, ''); 원문치기('경기 양평군 서종면 북한강로 112 2층')
            본다('손댄 뒤 찾기 — 새 원문', 상태()['원문'] == '경기 양평군 서종면 북한강로 112 2층')
            쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            창 = 쪽.query_selector('.askbox.주소창')
            단추들 = 쪽.evaluate("() => [...document.querySelectorAll('.askbox.주소창 .btnrow button')].map(b => b.textContent + (b.classList.contains('주의') ? '*' : ''))")
            본다('다름 — 확인창 · 단추 셋 · 다시 찾기만 주의색', 창 is not None and 단추들 == ['다시 찾기*', '원문 그대로 두기', '이 주소로 사용'], 단추들)
            본다('처음 포커스 = 다시 찾기', 쪽.evaluate("() => document.activeElement && document.activeElement.textContent") == '다시 찾기')
            강조 = 쪽.evaluate("() => [...document.querySelectorAll('.askbox.주소창 .다름')].map(e => e.textContent)")
            본다('빨간 강조 — 북한강로 112 / 북한강로 121', 강조 == ['북한강로 112', '북한강로 121'], 강조)
            본다('아직 안 채움', 쪽.input_value(칸) == '경기 양평군 서종면 북한강로 112 2층')
            쪽.screenshot(path=str(여기 / ('2-다름-확인창-' + 이름 + '.png')), full_page=False, animations='disabled')
            # 다시 찾기
            쪽.click('.askbox.주소창 button:has-text("다시 찾기")'); 쪽.wait_for_timeout(300)
            본다('다시 찾기 — embed 를 d.query 로 다시 염 · 원문 그대로', 쪽.evaluate("() => window.__우편.op.q") == '북한강로' and 상태()['원문'] == '경기 양평군 서종면 북한강로 112 2층')
            쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            # 원문 그대로 두기
            쪽.click('.askbox.주소창 button:has-text("원문 그대로 두기")'); 쪽.wait_for_timeout(300)
            s = 상태()
            칩 = 쪽.query_selector('.문자주문 label .미확인')
            본다('원문 그대로 — 주소 안 바뀜 · 미확인 칩', 쪽.input_value(칸) == '경기 양평군 서종면 북한강로 112 2층' and 칩 and 칩.is_visible() and s['확인'] == '미확인', s)
            쪽.screenshot(path=str(여기 / ('4-미확인-' + 이름 + '.png')), full_page=True, animations='disabled')
            # Esc 도 원문 그대로
            쪽.click(찾기); 쪽.wait_for_timeout(200); 쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(200)
            본다('Esc — 창 닫힘 · 그대로 미확인', 쪽.query_selector('.askbox') is None and 상태()['확인'] == '미확인' and 쪽.input_value(칸) == '경기 양평군 서종면 북한강로 112 2층')
            # 이 주소로 사용
            쪽.click(찾기); 쪽.wait_for_timeout(200); 쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            쪽.click('.askbox.주소창 button:has-text("이 주소로 사용")'); 쪽.wait_for_timeout(300)
            s = 상태()
            본다('이 주소로 사용 — 121 채움 · 꼬리 안 옮김 · 칩 지움 · 고름', 쪽.input_value(칸).strip() == '경기 양평군 서종면 북한강로 121' and 쪽.input_value(상세) == '' and not 칩.is_visible() and s['확인'] == '고름', s)

            # ── 비교 안 됨
            원문치기('양평 서종 문호리 강가 하얀집')
            쪽.evaluate(골랐다, 카('112')); 쪽.wait_for_timeout(300)
            줄글 = 쪽.inner_text('.문자주문 .확인줄.비교안됨') if 쪽.query_selector('.문자주문 .확인줄.비교안됨') else ''
            본다('비교 안 됨 — 노란 줄 · 채움(막지 않음)', '원문 비교 안 됨' in 줄글 and '양평 서종 문호리 강가 하얀집' in 줄글 and 쪽.input_value(칸).strip() == '경기 양평군 서종면 북한강로 112' and 상태()['확인'] == '비교안됨', 줄글.replace('\n', ' / '))
            본다('맞음 줄은 사라짐', 쪽.query_selector('.문자주문 .확인줄.맞음') is None)
            쪽.screenshot(path=str(여기 / ('3-비교안됨-' + 이름 + '.png')), full_page=True, animations='disabled')

            # ── 미확인으로 저장 → 다시 그려도 칩 → 메모만 고쳐 저장해도 원문 보존 → 주문올리기 안 막힘
            원문치기('경기 양평군 서종면 북한강로 112 2층')
            쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            쪽.click('.askbox.주소창 button:has-text("원문 그대로 두기")'); 쪽.wait_for_timeout(200)
            쪽.fill('.문자주문 input[placeholder="받는 분"]', '시험주소'); 쪽.wait_for_timeout(200)
            쪽.click('.문자주문 .보냄줄 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            id = 쪽.evaluate("() => ZG.문자주문자료.전부().filter(r => r.받는분 === '시험주소')[0].id")
            r = 쪽.evaluate(하나, id)
            본다('저장 — 원문주소 · 주소확인 미확인', r.get('원문주소') == '경기 양평군 서종면 북한강로 112 2층' and r.get('주소확인') == '미확인', [r.get('원문주소'), r.get('주소확인')])
            본다('저장 뒤 새 문자 비움 — 칩·원문 없음', 상태()['원문'] == '' and not 쪽.query_selector('.문자주문 label .미확인:not([hidden])'))
            옛 = 쪽.evaluate("() => ZG.문자주문자료.새로저장({ 받는분: '시험옛줄', 전화: '01000000001', 주소: '서울 마포구 성미산로 21', 품목: [ZG.문자주문자료.담을줄(ZG.저장소.품목들()[2])] }, false).id")
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)
            펼 = (lambda 누구: 쪽.click('.문카드:has-text("%s") .r1' % 누구) if 폰 else 쪽.click('tr:has-text("%s") td.fx' % 누구))
            판 = '.문카드 .속' if 폰 else '.속판'
            펼('시험주소'); 쪽.wait_for_timeout(300)
            칩 = 쪽.query_selector(판 + ' label .미확인')
            본다('펼침 — 저장값에서 미확인 칩 되살림', 칩 and 칩.is_visible())
            쪽.fill(판 + ' input[placeholder="메모"]', '메모만 고침'); 쪽.wait_for_timeout(200)
            쪽.click(판 + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate(하나, id)
            본다('메모만 고쳐 저장 — 원문주소 남음', r.get('메모') == '메모만 고침' and r.get('원문주소') == '경기 양평군 서종면 북한강로 112 2층' and r.get('주소확인') == '미확인', [r.get('메모'), r.get('원문주소'), r.get('주소확인')])
            펼('시험옛줄'); 쪽.wait_for_timeout(300)
            쪽.fill(판 + ' input[placeholder="메모"]', '옛줄 메모'); 쪽.wait_for_timeout(200)
            쪽.click(판 + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate(하나, 옛)
            본다('옛 줄(칸 없음) 저장 — 원문 칸이 새로 안 붙음', r.get('메모') == '옛줄 메모' and '원문주소' not in r and '주소확인' not in r, list(r.keys()))
            b = 쪽.query_selector(('.문카드:has-text("시험주소") .act button:has-text("주문올리기")') if 폰 else ('tr:has-text("시험주소") td.상태칸 button:has-text("주문올리기")'))
            본다('미확인 줄 — 주문올리기 안 잠김', b and not b.is_disabled())
            b.click(); 쪽.wait_for_timeout(300)
            올판 = '.문카드 .속.올림' if 폰 else '.올림판'
            칩 = 쪽.query_selector(올판 + ' label .미확인')
            본다('올림 판에도 미확인 칩', 칩 and 칩.is_visible())
            # 올림 판에서 일치 → 꼬리가 상세주소로 → 주문줄 주소에 이어짐
            쪽.click(올판 + ' button:has-text("주소 찾기")'); 쪽.wait_for_timeout(200)
            본다('올림 판 찾기 — 원문은 저장된 것', 쪽.evaluate("() => window.__우편.op.q") is not None)
            쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            쪽.click('.askbox.주소창 button:has-text("이 주소로 사용")'); 쪽.wait_for_timeout(300)
            본다('올림 판 — 칩 지움 · 확인창 닫힘', not 칩.is_visible() and 쪽.query_selector('.askbox') is None)
            쪽.click(올판 + ' button.main:has-text("주문올리기")'); 쪽.wait_for_timeout(400)
            r = 쪽.evaluate(하나, id)
            줄 = 쪽.evaluate("(id) => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === id)[0]", id)
            본다('주문올리기 됨 — 주소확인 고름 · 원문 보존 · 주문줄 121', r['상태'] == '올림' and r.get('주소확인') == '고름' and r.get('원문주소') == '경기 양평군 서종면 북한강로 112 2층' and 줄 and '북한강로 121' in 줄['수령인주소'], [r['상태'], r.get('주소확인'), 줄 and 줄['수령인주소']])
            본다('주문줄에는 원문 칸 없음', 줄 and '원문주소' not in 줄 and '주소확인' not in 줄)

            # ── 08c 수동주문 — 확인창은 뜨고 칩·저장은 없음
            쪽.evaluate("() => ZG.주문.열기('수동')"); 쪽.wait_for_timeout(400)
            칸들 = 쪽.query_selector_all('.itemstack input.inp')
            칸들[3].fill('경기 양평군 서종면 북한강로 112 2층')
            쪽.click('.itemstack button:has-text("주소 찾기")'); 쪽.wait_for_timeout(200)
            쪽.evaluate(골랐다, 카('121')); 쪽.wait_for_timeout(300)
            본다('수동주문 — 다름 확인창', 쪽.query_selector('.askbox.주소창') is not None)
            쪽.click('.askbox.주소창 button:has-text("원문 그대로 두기")'); 쪽.wait_for_timeout(200)
            본다('수동주문 — 원문 그대로 · 칩 없음', 칸들[3].input_value() == '경기 양평군 서종면 북한강로 112 2층' and 쪽.query_selector('.itemstack .미확인:not([hidden])') is None)
            쪽.click('.itemstack button:has-text("주소 찾기")'); 쪽.wait_for_timeout(200)
            쪽.evaluate(골랐다, 카('112')); 쪽.wait_for_timeout(300)
            본다('수동주문 — 일치면 꼬리를 주소 끝에', 칸들[3].input_value() == '경기 양평군 서종면 북한강로 112 2층' and 쪽.query_selector('.itemstack .확인줄.맞음') is not None, 칸들[3].input_value())
            쪽.screenshot(path=str(여기 / ('5-수동주문-일치-' + 이름 + '.png')), full_page=True, animations='disabled')
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
