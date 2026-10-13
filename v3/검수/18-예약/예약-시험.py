# -*- coding: utf-8 -*-
# 18단계 ① 예약 지정·리스트·올리기 잠금 — python3 v3/검수/18-예약/예약-시험.py
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막아 서버에 아무것도 안 간다. 날짜는 오늘 기준으로 잡는다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '18-예약'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8796', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8796/%EC%A3%BC%EB%AC%B8.html'

# 날 더하기는 페이지 안에서 — 오늘이 언제든 같은 모양으로 시험한다
심기자료 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const 새 = (이름, 전화, i, 받은, 예약, 예약일, 등록) => {
    const r = 자.새로저장({ 받는분: 이름, 전화: 전화, 품목: [자.담을줄(ps[i])], 배송비: 3000 }, true);
    const 값 = { 날짜: 날(받은), 등록일시: Date.now() + (등록 || 0) };
    if (예약 !== undefined) { 값.예약 = 예약; 값.예약일 = 예약일 === null ? '' : 날(예약일); }
    저.바꾸기(저.키.문자주문, r.id, 값); return r.id; };
  return {
    A: 새('시험가람', '01011110001', 10, -2, true, 5),
    B: 새('시험나래', '01011110002', 11, -1, true, 0),
    C: 새('시험다솜', '01011110003', 12, 0, true, -1),
    D: 새('시험라온', '01011110004', 13, -10, true, null),
    E: 새('시험마루', '01011110005', 14, 0, true, null, 5),
    F: 새('시험바다', '01011110006', 15, 0),
    G: 새('시험사랑', '01011110007', 16, 0),
    H: 새('시험아라', '01011110008', 17, 0),
    날5: 날(5), 날3: 날(3), 날m1: 날(-1), 오늘: 오늘
  };
}"""
하나 = "(id) => ZG.문자주문자료.하나(id)"

def 펼치기(쪽, 폰, 이름):
    if 폰: 쪽.click('.문카드:has-text("%s") .r1' % 이름)
    else: 쪽.click('tr:has-text("%s") td.fx' % 이름)
    쪽.wait_for_timeout(300)
def 판(폰): return '.문카드 .속' if 폰 else '.속판'
def 올림단추(쪽, 폰, 이름):
    return 쪽.query_selector(('.문카드:has-text("%s") .act button:has-text("주문올리기")' % 이름) if 폰 else ('tr:has-text("%s") td.상태칸 button:has-text("주문올리기")' % 이름))

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
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
            m = 쪽.evaluate(심기자료)
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)

            # ── 오늘 갈래 — 예약 줄도 칩을 단 채 보인다 (시안대로)
            칩글 = 쪽.inner_text('.fchips')
            본다('오늘 칩 수 = 오늘 받은 건(예약 포함) 5 · 예약 칩 5', '오늘\n5' in 칩글 or '오늘5' in 칩글.replace('\n', ''), 칩글.replace('\n', ' '))
            본다('예약 칩 숫자 5 · 때됨 점', '예약5' in 칩글.replace('\n', '') and 쪽.query_selector('.fchip.예약 .점') is not None)
            줄글 = 쪽.inner_text('.문카드:has-text("시험다솜")' if 폰 else 'tr:has-text("시험다솜")')
            본다('오늘 갈래 — 시험다솜(예약, 지난 날) 칩 보임', '예약 ' in 줄글, 줄글.replace('\n', ' '))
            본다('오늘 갈래 — 시험마루 「날짜 미정」 칩', '날짜 미정' in 쪽.inner_text('.문카드:has-text("시험마루")' if 폰 else 'tr:has-text("시험마루")'))

            # ── ① 예약 지정 (펼친 판) → 잠김 → 저장
            펼치기(쪽, 폰, '시험바다')
            쪽.click(판(폰) + ' .예약고름 button:has-text("예약일 정하기")'); 쪽.wait_for_timeout(200)
            본다('날짜판 열림 · 지난 날 꺼짐', 쪽.query_selector('.날짜판') is not None and 쪽.evaluate("() => [...document.querySelectorAll('.날짜판 .d.지난')].every(b => b.disabled)"))
            글 = 쪽.evaluate("(d) => ZG.예약화면.날글(d)", m['날3'])
            if m['날3'][:7] != m['오늘'][:7]: 쪽.click('.날짜판 .calhd button >> nth=1')
            쪽.click('.날짜판 button[aria-label="%s"]' % 글); 쪽.wait_for_timeout(200)
            본다('날짜칸에 고른 날', 쪽.input_value('.날짜칸 .inp') == 글, 쪽.input_value('.날짜칸 .inp'))
            잠 = 쪽.query_selector(판(폰) + ' button:has-text("주문올리기")')
            본다('저장 전 바로 잠김 🔒', 잠.is_disabled() and '🔒' in 잠.inner_text())
            쪽.screenshot(path=str(여기 / ('1-예약지정-' + 이름 + '.png')), full_page=True, animations='disabled')
            쪽.click(판(폰) + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate(하나, m['F'])
            본다('저장 — 예약:true · 예약일 · 받은 날 그대로', r.get('예약') is True and r.get('예약일') == m['날3'] and r['날짜'] == m['오늘'], [r.get('예약'), r.get('예약일'), r['날짜']])
            b = 올림단추(쪽, 폰, '시험바다')
            본다('접힌 줄 주문올리기 잠김', b and b.is_disabled() and '🔒' in b.inner_text())
            답 = 쪽.evaluate("(id) => ZG.문자주문자료.주문올리기(id, { 받는분: '시험바다', 전화: '01011110006' })", m['F'])
            본다('자료층도 막음', '전이라 올릴 수 없습니다' in str(답.get('오류', '')), 답)

            # ── 날짜 미정
            펼치기(쪽, 폰, '시험사랑')
            쪽.click(판(폰) + ' .예약고름 button:has-text("날짜 미정")'); 쪽.wait_for_timeout(200)
            본다('날짜 미정 — 잠기지 않음', not 쪽.query_selector(판(폰) + ' button:has-text("주문올리기")').is_disabled())
            쪽.click(판(폰) + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate(하나, m['G'])
            본다('날짜 미정 저장 — 예약:true · 예약일 빈칸', r.get('예약') is True and r.get('예약일') == '', [r.get('예약'), r.get('예약일')])

            # ── 해제
            펼치기(쪽, 폰, '시험바다')
            쪽.click(판(폰) + ' button:has-text("예약 해제")'); 쪽.wait_for_timeout(200)
            본다('해제 — 바로 풀림', not 쪽.query_selector(판(폰) + ' button:has-text("주문올리기")').is_disabled())
            쪽.click(판(폰) + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate(하나, m['F'])
            본다('해제 저장 — 예약:false', r.get('예약') is False and r.get('예약일') == '', [r.get('예약'), r.get('예약일')])
            본다('안 건드린 줄엔 예약 칸이 안 붙음', 'H' in m and '예약' not in 쪽.evaluate(하나, m['H']))
            # 시험아라를 펼쳐 저장만 — 예약 칸이 새로 붙지 않는다
            펼치기(쪽, 폰, '시험아라'); 쪽.click(판(폰) + ' button:has-text("저장")'); 쪽.wait_for_timeout(300)
            본다('예약 안 건드리고 저장 — 예약 칸 없음', '예약' not in 쪽.evaluate(하나, m['H']))

            # ── 예약 갈래 — 두 구역 · 정렬
            쪽.click('.fchip.예약'); 쪽.wait_for_timeout(400)
            이름들 = 쪽.evaluate("""(폰) => [...document.querySelectorAll(폰 ? '.ph-list .문카드 .nm' : 'tbody tr:not(.묶음):not(.구역줄):not(.틈):not(.틈2) td:nth-child(3)')]
               .map(e => e.textContent.replace(/010.*$/, '').replace(/(문자 보냄|저장됨).*$/, '').trim()).filter(t => t.startsWith('시험'))""", 폰)
            본다('정렬 — 지정 다솜(지난)·나래(오늘)·가람(D-5) / 미정 라온(10일 전)·사랑·마루', 이름들 == ['시험다솜', '시험나래', '시험가람', '시험라온', '시험사랑', '시험마루'], 이름들)
            구역 = 쪽.inner_text('.ph-list' if 폰 else 'tbody')
            본다('구역 머리 둘 · D글 · 받은 날 꼬리', '예약일 지정' in 구역 and '날짜 미정' in 구역 and 'D-5' in 구역 and 'D+1' in 구역 and '10일 전' in 구역, '')
            본다('때된 줄 강조(다솜·나래)', 쪽.evaluate("(폰) => document.querySelectorAll(폰 ? '.문카드.때됨' : 'tbody tr.때됨:not(.묶음)').length", 폰) == 2)
            if 폰:
                본다('폰 예약 갈래 — 달력 없음 · 요약줄', 쪽.query_selector('.문자주문 .cal') is None and '지정' in 쪽.inner_text('.ph-sub'), 쪽.inner_text('.ph-sub'))
            else:
                본다('PC 머리글·길', '예약' in 쪽.inner_text('.tblhd .d') and '› 예약' in 쪽.inner_text('.pc-head .path'), 쪽.inner_text('.pc-head .path'))
                본다('PC 달력 예약일 점', 쪽.query_selector('.cal .d i.rv') is not None)
            for 누구, 잠김 in (('시험가람', True), ('시험다솜', False), ('시험나래', False), ('시험라온', False)):
                b = 올림단추(쪽, 폰, 누구)
                본다('%s 주문올리기 %s' % (누구, '잠김' if 잠김 else '열림'), b and b.is_disabled() == 잠김)
            쪽.wait_for_timeout(1500); 쪽.screenshot(path=str(여기 / ('2-예약갈래-' + 이름 + '.png')), full_page=True, animations='disabled')
            # 예약 갈래에서 펼쳐도 갈래가 그대로
            펼치기(쪽, 폰, '시험가람')
            본다('예약 갈래에서 펼침 — 갈래 유지', 쪽.query_selector('.fchip.예약.on') is not None and 쪽.query_selector('.예약필드') is not None)
            쪽.screenshot(path=str(여기 / ('3-예약갈래-펼침-' + 이름 + '.png')), full_page=True, animations='disabled')
            # 지난 날 예약은 올릴 수 있다
            답 = 쪽.evaluate("(id) => ZG.문자주문자료.주문올리기(id, { 받는분: '시험다솜', 전화: '01011110003' })", m['C'])
            본다('지난 예약일 — 올리기 됨', bool(답.get('번호')), 답)
            답 = 쪽.evaluate("(id) => ZG.문자주문자료.주문올리기(id, { 받는분: '시험라온', 전화: '01011110004' })", m['D'])
            본다('날짜 미정 — 올리기 됨', bool(답.get('번호')), 답)
            쪽.evaluate("() => ZG.주문.다시그리기()"); 쪽.wait_for_timeout(300)
            구역 = 쪽.inner_text('.ph-list' if 폰 else 'tbody')
            본다('올린 줄은 예약 리스트에서 빠짐', '시험다솜' not in 구역 and '시험라온' not in 구역)
            # 날을 누르면 오늘 갈래로
            if not 폰:
                쪽.click('.cal .d.today'); 쪽.wait_for_timeout(300)
                본다('달력 날 누름 → 오늘 갈래', 쪽.query_selector('.fchip.on:not(.예약)') is not None)
            else:
                쪽.click('.fchip:not(.예약)'); 쪽.wait_for_timeout(300)
            본다('오늘 갈래 — 올린 다솜은 주문올림', '주문올림' in 쪽.inner_text('.문카드:has-text("시험다솜")' if 폰 else 'tr:has-text("시험다솜")'))
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
