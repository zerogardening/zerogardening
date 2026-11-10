# -*- coding: utf-8 -*-
# 33단계 문자주문 붙여넣기·주소칸 2줄·무료배송 — python3 v3/검수/45-문자붙여넣기/붙여넣기-시험.py
# PC 캡처는 full_page 를 끈다 — 전체 캡처가 창 크기를 잠깐 바꿔 08b 가 화면을 다시 그린다(✓ 줄은 다시 그리면 사라지는 원래 동작)
# 🔴 로컬 전용 — supabase·카카오를 막는다. 카카오 우편번호는 가짜(oncomplete·닫기를 손으로), 클립보드도 가짜(window.__붙일글)
import re, json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
심기 = """localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{"a":1}'); sessionStorage.setItem('zg.새판시도','2');
window.daum = { Postcode: function (o) { this.embed = function (el, op) { window.__우편 = { o: o, op: op, 몇: (window.__우편 ? window.__우편.몇 : 0) + 1 }; }; } };
Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.resolve(window.__붙일글 || ''), writeText: () => Promise.resolve() } });"""
심기 += (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

# 설계 §시험 예시 — (붙일 글, 원래 전화, 기대 받는 분, 기대 전화, 기대 주소칸, 기대 상세)
예시 = [
    ('김민지\n010-2345-6789\n경기 수원시 영통구 광교중앙로 145 광교아이파크 103동 1202호', '010-2345-6789', '김민지', '010-2345-6789', '경기 수원시 영통구 광교중앙로 145', '광교아이파크 103동 1202호'),
    ('박정우, 서울 강남구 테헤란로 152 강남파이낸스센터 12층, 010 9876 5432', '', '박정우', '010-9876-5432', '서울 강남구 테헤란로 152', '강남파이낸스센터 12층'),
    ('성함: 이수진 / 주소: 충남 천안시 동남구 신부동 454-1 대명빌라 2층 / 연락처 010.5555.1234 감사합니다', '', '이수진', '010-5555-1234', '충남 천안시 동남구 신부동 454-1', '대명빌라 2층'),
    ('최영호 010-3333-4444\n완주 소양 화심리 파란대문집', '010-3333-4444', '최영호', '010-3333-4444', '완주 소양 화심리 파란대문집', ''),
    ('주소 경기도 양평군 서종면 북한강로 112, 2층\n받는분 정하늘 님\n01077778888\n집전화 031-774-1234', '', '정하늘', '010-7777-8888', '경기도 양평군 서종면 북한강로 112', '2층'),
    ('강다은입니다~ 대구 수성구 달구벌대로 2450 101동 1503호 010-1212-3434', '010-1212-3434', '강다은', '010-1212-3434', '대구 수성구 달구벌대로 2450', '101동 1503호'),
]
카 = {'zonecode': '06236', 'userSelectedType': 'R', 'query': '테헤란로', 'roadAddress': '서울 강남구 테헤란로 152', 'roadname': '테헤란로',
      'jibunAddress': '서울 강남구 역삼동 737', 'sido': '서울', 'sigungu': '강남구', 'apartment': 'N', 'buildingName': ''}

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), '8852', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**', '**daumcdn.net**'): 쪽.route(길, lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto('http://localhost:8852/%EC%A3%BC%EB%AC%B8.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.문자붙여넣기)', timeout=20000)
            쪽.evaluate("() => { ZG.시드.심기(); const 저 = ZG.저장소; if (!ZG.업체자료.자사()) 저.덧붙이기(저.키.업체, { id: 'c_self', 이름: '제로가드닝', 내업체: true, 입금계좌: '농협 000-0000-0000-00 제로가드닝' }); ZG.주문.다시그리기(); }")
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(400)
            쪽.evaluate("() => { const s = ZG.문자주문새문자.상태; s.담은것.push(ZG.문자주문자료.담을줄(ZG.저장소.품목들()[1])); s.담은것[0].수량 = 3; s.담은것[0].단가 = 5000; ZG.주문.다시그리기(); }")
            쪽.wait_for_timeout(300)
            판 = '.문자주문'
            이름칸, 전화칸 = 판 + ' input[placeholder="받는 분"]', 판 + ' input[placeholder="010-"]'
            주소칸, 상세칸 = 판 + ' [placeholder="주소"]', 판 + ' input[placeholder="상세주소"]'
            def 상태(): return 쪽.evaluate("() => JSON.parse(JSON.stringify(ZG.문자주문새문자.상태))")
            def 새로(이름='', 전화=''):
                쪽.evaluate("([이, 전]) => { const s = ZG.문자주문새문자.상태; Object.assign(s, { 받는분: 이, 전화: 전, 주소: '', 상세주소: '', 우편: '', 원문주소: '', 주소확인: '' }); window.__우편 = null; ZG.주문.다시그리기(); }", [이름, 전화])
                쪽.wait_for_timeout(250)
            def 붙이기(글):
                쪽.evaluate("g => { window.__붙일글 = g; }", 글)
                쪽.click(판 + ' button:has-text("손님 문자 붙여넣기")'); 쪽.wait_for_timeout(400)

            # ── 화면 배치
            본다('주소칸 = 2줄 textarea', 쪽.evaluate("(q) => { const e = document.querySelector(q); return e.tagName === 'TEXTAREA' && e.rows === 2; }", 주소칸))
            본다('찾기 단추가 주소 라벨 줄에', 쪽.query_selector(판 + ' label:has-text("주소") > button:has-text("주소 찾기")') is not None)
            상 = 쪽.evaluate("([a, b]) => [a, b].map(q => { const r = document.querySelector(q).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.width)]; })", [이름칸, 전화칸])
            본다('받는 분·전화 한 줄 · 이름 칸이 좁다', 상[0][0] == 상[1][0] and 상[0][1] < 상[1][1], 상)
            본다('보조 전화 칸 없음', 쪽.query_selector(판 + ' :text("보조 전화")') is None)

            # ── 예시 6개
            for i, (글, 원전화, 이름, 전화, 주소, 상세) in enumerate(예시, 1):
                새로('', 원전화); 붙이기(글)
                s = 상태()
                값 = [쪽.input_value(이름칸), 쪽.input_value(전화칸), 쪽.input_value(주소칸), 쪽.input_value(상세칸)]
                본다('예시%d 나누기' % i, 값 == [이름, 전화, 주소, 상세] and s['받는분'] == 이름 and s['주소'] == 주소 and s['상세주소'] == 상세, 값)
                q = 쪽.evaluate("() => window.__우편 && window.__우편.op.q")
                본다('예시%d 주소 찾기 자동으로 열림 · 원문 통째' % i, q == 주소 and s['원문주소'] == (주소 + (' ' + 상세 if 상세 else '')).replace('112 2층', '112, 2층'), [q, s['원문주소']])
                if i == 2: 쪽.screenshot(path=str(여기 / ('2-붙여넣은뒤-' + 틀 + '.png')), full_page=폰, animations='disabled')
                쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")

            # ── 고르기 — 원문과 일치 · 확인줄이 상세주소 아래
            새로('', ''); 붙이기(예시[1][0])
            쪽.evaluate("(d) => window.__우편.o.oncomplete(d)", 카); 쪽.wait_for_timeout(300)
            줄 = 쪽.inner_text(판 + ' .확인줄.맞음') if 쪽.query_selector(판 + ' .확인줄.맞음') else ''
            본다('고름 — ✓ 일치 줄이 보인다', 쪽.is_visible(판 + ' .확인줄.맞음'), 쪽.evaluate("() => [...document.querySelectorAll('.확인칸')].map(e => e.hidden + ':' + e.parentElement.className + ':' + e.childElementCount)"))
            본다('고름 — ✓ 일치 · 원문·검색 두 줄', '원문과 일치' in 줄 and '강남파이낸스센터 12층' in 줄 and '검색' in 줄, 줄.replace('\n', ' / '))
            위 = 쪽.evaluate("(qs) => qs.map(q => Math.round(document.querySelector(q).getBoundingClientRect().top))", [주소칸, 상세칸, 판 + ' .확인줄.맞음'])
            본다('주소 → 상세주소 → 확인줄 위아래', 위[0] < 위[1] < 위[2], 위)
            본다('고름 — 상세는 붙여넣은 그대로 · 우편 채움', 쪽.input_value(상세칸) == '강남파이낸스센터 12층' and 상태()['우편'] == '06236' and 상태()['주소확인'] == '일치')
            쪽.screenshot(path=str(여기 / ('3-일치-' + 틀 + '.png')), full_page=폰, animations='disabled')
            본다('캡처 뒤에도 ✓ 줄 보임', 쪽.is_visible(판 + ' .확인줄.맞음'))

            # ── 안 뜸 — 고르지 않고 닫기
            새로('', ''); 붙이기(예시[3][0])
            쪽.locator('button:has-text("✕ 닫기")').last.click(); 쪽.wait_for_timeout(300)
            안 = 쪽.query_selector(판 + ' .확인줄.안뜸')
            본다('안 고르고 닫음 — 빨간 「직접 입력」 안내 · 미확인 칩', 안 and 안.is_visible() and '직접 입력' in 안.inner_text() and 쪽.is_visible(판 + ' label .미확인') and 상태()['주소확인'] == '미확인')
            본다('안 뜸 — 주소칸엔 원문 그대로', 쪽.input_value(주소칸) == '완주 소양 화심리 파란대문집')
            쪽.screenshot(path=str(여기 / ('4-안뜸-' + 틀 + '.png')), full_page=폰, animations='disabled')

            # ── 다른 이름·전화 → 확인창
            새로('홍길동', '010-1111-2222'); 붙이기(예시[1][0])
            창 = 쪽.query_selector('.askbox')
            창글 = 창.inner_text() if 창 else ''
            본다('다름 확인창 — 이름·전화 둘 다', '적힌 것과 다릅니다' in 창글 and '홍길동' in 창글 and '박정우' in 창글 and '010-9876-5432' in 창글, 창글.replace('\n', ' / '))
            본다('확인창 뜬 동안 주소 찾기는 아직', 쪽.evaluate("() => window.__우편") is None)
            쪽.screenshot(path=str(여기 / ('5-다름확인창-' + 틀 + '.png')), full_page=False, animations='disabled')
            쪽.click('.askbox button:has-text("그대로 두기")'); 쪽.wait_for_timeout(300)
            본다('그대로 두기 — 이름·전화 안 바뀜 · 주소는 넣고 찾기 열림', 쪽.input_value(이름칸) == '홍길동' and 쪽.input_value(전화칸) == '010-1111-2222' and 쪽.input_value(주소칸) == '서울 강남구 테헤란로 152' and 쪽.evaluate("() => !!window.__우편"))
            쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")
            새로('홍길동', ''); 붙이기(예시[1][0])
            쪽.click('.askbox button:has-text("붙여넣은 걸로")'); 쪽.wait_for_timeout(300)
            본다('붙여넣은 걸로 — 이름 바뀜 · 빈 전화는 그냥 채움', 쪽.input_value(이름칸) == '박정우' and 상태()['받는분'] == '박정우' and 쪽.input_value(전화칸) == '010-9876-5432')
            쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")

            # ── 무료배송 (품목 3 × 5,000 = 15,000)
            미리 = lambda: 쪽.inner_text(판 + ' .말풍선')
            합 = lambda: 쪽.inner_text(판 + ' .합계줄')
            본다('처음 합계 19,500 · 배송비 줄', '19,500' in 합() and '배송비 4,500원' in 미리(), 합())
            쪽.click(판 + ' button:has-text("무료배송")'); 쪽.wait_for_timeout(200)
            m = 미리()
            본다('무료배송 — 합계 15,000 · 문자에 「무료배송」 · 배송비 줄 없음', '15,000' in 합() and '\n무료배송\n' in m and '배송비 ' not in m and 상태()['배송비'] == 0 and 상태()['무료배송'] is True, 합())
            본다('무료배송 줄 자리 = 품목 아래·합계 위', m.index('15,000원') < m.index('무료배송') < m.index('합계:'))
            본다('안내 문자 — 성함·주소만 요청 · 연락처 요청 없음', '📌 성함, 주소를 보내주세요!' in m and '연락처를' not in m)
            본다('입금계좌 아래 「구매자 성함으로 입금해 주세요」', '💰입금계좌' in m and m.index('💰입금계좌') < m.index('구매자 성함으로 입금해 주세요') < m.index('📌'), m[-120:].replace('\n', ' / '))
            쪽.screenshot(path=str(여기 / ('6-무료배송-' + 틀 + '.png')), full_page=폰, animations='disabled')
            쪽.click(판 + ' button:has-text("무료배송")'); 쪽.wait_for_timeout(200)
            본다('다시 누름 — 4,500 · 19,500', '19,500' in 합() and 상태()['배송비'] == 4500 and not 상태()['무료배송'])
            쪽.click(판 + ' button:has-text("무료배송")'); 쪽.wait_for_timeout(200)
            쪽.fill(판 + ' input[aria-label="배송비"]', '3000'); 쪽.wait_for_timeout(200)
            본다('배송비를 치면 무료배송 풀림', 상태()['배송비'] == 3000 and not 상태()['무료배송'] and '배송비 3,000원' in 미리())
            쪽.click(판 + ' button:has-text("무료배송")'); 쪽.wait_for_timeout(200)

            # ── 저장 → 줄에 무료배송 · 목록 · 펼친 고침 판
            쪽.fill(이름칸, '시험붙임'); 쪽.wait_for_timeout(200)
            쪽.click(판 + ' .보냄줄 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate("() => ZG.문자주문자료.전부().filter(r => r.받는분 === '시험붙임')[0]")
            본다('저장 — 무료배송 true · 배송비 0 · 원문주소', r and r.get('무료배송') is True and r.get('배송비') == 0 and r.get('원문주소', '').startswith('서울 강남구 테헤란로 152'), r and [r.get('무료배송'), r.get('배송비'), r.get('원문주소')])
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)
            if not 폰: 본다('PC 목록 밑줄 「무료배송」', 쪽.query_selector('tr:has-text("시험붙임") :text("무료배송")') is not None)   # 폰 카드는 배송비 줄이 원래 없다
            (쪽.click('.문카드:has-text("시험붙임") .r1') if 폰 else 쪽.click('tr:has-text("시험붙임") td.fx')); 쪽.wait_for_timeout(300)
            속 = '.문카드 .속' if 폰 else '.속판'
            본다('고침 판 — 붙여넣기 단추 · 주소 2줄 · 무료배송 켜짐', 쪽.query_selector(속 + ' button:has-text("손님 문자 붙여넣기")') is not None and 쪽.query_selector(속 + ' textarea[placeholder="주소"]') is not None and 쪽.query_selector(속 + ' button.무료.켬') is not None)
            쪽.evaluate("g => { window.__붙일글 = g; }", 예시[4][0])
            쪽.click(속 + ' button:has-text("손님 문자 붙여넣기")'); 쪽.wait_for_timeout(400)
            if 쪽.query_selector('.askbox'): 쪽.click('.askbox button:has-text("붙여넣은 걸로")'); 쪽.wait_for_timeout(300)
            본다('고침 판 붙여넣기 — 이름·주소·상세', 쪽.input_value(속 + ' input[placeholder="받는 분"]') == '정하늘' and 쪽.input_value(속 + ' textarea[placeholder="주소"]') == '경기도 양평군 서종면 북한강로 112' and 쪽.input_value(속 + ' input[placeholder="상세주소"]') == '2층')
            쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")
            쪽.screenshot(path=str(여기 / ('7-고침판-' + 틀 + '.png')), full_page=폰, animations='disabled')
            쪽.click(속 + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate("() => ZG.문자주문자료.전부().filter(r => r.받는분 === '정하늘')[0]")
            본다('고침 판 저장 — 상세 2층 · 무료배송 유지', r and r.get('상세주소') == '2층' and r.get('무료배송') is True, r and [r.get('상세주소'), r.get('무료배송')])

            # ── 주문올리기 판(20d)
            쪽.evaluate("() => { const r = ZG.문자주문자료.전부().filter(r => r.받는분 === '정하늘')[0]; ZG.문자주문자료.보냄표시 && ZG.문자주문자료.보냄표시(r.id); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(300)
            올 = 쪽.locator(('.문카드:has-text("정하늘")' if 폰 else 'tr:has-text("정하늘")') + ' button:has-text("주문올리기")')
            if 올.count():
                올.first.click(); 쪽.wait_for_timeout(300)
                올판 = '.문카드 .속.올림' if 폰 else '.올림판'
                본다('올리기 판 — 붙여넣기 단추 · 주소 2줄 · 상세 값', 쪽.query_selector(올판 + ' button:has-text("손님 문자 붙여넣기")') is not None and 쪽.input_value(올판 + ' textarea[placeholder="주소"]') == '경기도 양평군 서종면 북한강로 112' and 쪽.input_value(올판 + ' input[placeholder="상세주소"]') == '2층')
                쪽.evaluate("g => { window.__붙일글 = g; }", 예시[0][0])
                쪽.click(올판 + ' button:has-text("손님 문자 붙여넣기")'); 쪽.wait_for_timeout(400)
                if 쪽.query_selector('.askbox'): 쪽.click('.askbox button:has-text("붙여넣은 걸로")'); 쪽.wait_for_timeout(300)
                쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")
                본다('올리기 판 붙여넣기 — 받는 분 김민지 · 주소', 쪽.input_value(올판 + ' input[placeholder="받는 분"]') == '김민지' and 쪽.input_value(올판 + ' textarea[placeholder="주소"]') == '경기 수원시 영통구 광교중앙로 145')
                쪽.screenshot(path=str(여기 / ('8-올리기판-' + 틀 + '.png')), full_page=폰, animations='disabled')
                쪽.click(올판 + ' button:has-text("주문올리기")'); 쪽.wait_for_timeout(400)
                o = 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.수령인 === '김민지')[0]")
                본다('주문올리기 — 주문줄 주소에 상세까지', o and '광교중앙로 145' in o.get('수령인주소', '') and '103동 1202호' in o.get('수령인주소', ''), o and o.get('수령인주소'))
            else:
                본다('올리기 판 단추 찾음', False, '주문올리기 단추 없음')

            본다('콘솔 빨간 에러 0 (' + 틀 + ')', not 오류, 오류[:3])
            쪽.close()
        브.close()
finally:
    서버.kill()
print('\n%d/%d' % (sum(결과), len(결과)))
