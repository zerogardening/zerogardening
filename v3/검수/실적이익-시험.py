# -*- coding: utf-8 -*-
# 27단계 주문실적 「이익」 검수 (설계 27단계-실적이익-설계.md §5)
#   python3 v3/검수/실적이익-시험.py      ← playwright 필요
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 서버에 아무것도 안 쓴다.
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
샷 = 뿌리 / '검수' / '27-실적이익'
샷.mkdir(parents=True, exist_ok=True)
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + json.dumps(덧, ensure_ascii=False)) if 덧 != '' else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8783', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8783/%EC%A3%BC%EB%AC%B8.html'

# 송장(건) 하나 = 한 사람. 원본[26] = 카페24 27칸의 받은 배송비 칸
순수 = """(바꾼) => {
  const 원 = (v) => { const o = new Array(27).fill(''); o[26] = v; return o; };
  let n = 0;
  const 줄 = (사람, o) => Object.assign({ id: 't' + (++n), 수령인: 사람, 수령인전화: '010-0000-' + String(1000 + 사람.charCodeAt(0) % 9000).slice(-4),
    수령인주소: '서울 ' + 사람, 우편번호: '12345', 판매처: '쿠팡', 주문수량: 1, 옵션입수: 1, 주문일: '2026-10-05', 묶음id: 'B0' }, o);
  const 줄들 = [
    // A 쿠팡 1건 — 18,150 · 매입 6,000×1 · 무료 · 10cm(점수 1 → 2,750)
    줄('갑', { 품목코드: 'AAA01-10', 단가: 18150, 주문번호: 'A1', 원본: 원('무료') }),
    // B 쿠팡 2개 — 15,675×2 = 31,350 · 매입 6,000×2
    줄('을', { 품목코드: 'AAA01-10', 단가: 15675, 주문수량: 2, 주문번호: 'B1', 원본: 원('무료') }),
    // C 스마트스토어 — 같은 주문번호 두 줄(배송비 4500 이 두 번 찍혀 있다) 합 20,000 · 매입 4,000×2
    줄('병', { 판매처: '스마트스토어', 품목코드: 'CCC01-10', 단가: 12000, 주문번호: 'C1', 원본: 원('4500.00') }),
    줄('병', { 판매처: '스마트스토어', 품목코드: 'CCC02-10', 단가: 8000, 주문번호: 'C1', 원본: 원('4500.00') }),
    // D1 G마켓 — 매입가 없는 줄이 낀 송장 → 통째로 이익 제외
    줄('정', { 판매처: 'G마켓', 품목코드: 'AAA01-10', 단가: 9000, 주문번호: 'D1', 원본: 원('4500.00') }),
    줄('정', { 판매처: 'G마켓', 품목코드: 'NOC01-10', 단가: 7000, 주문번호: 'D1', 원본: 원('4500.00') }),
    // D2 심폴 — 배송비 미상
    줄('무', { 판매처: '심폴', 품목코드: 'AAA01-10', 단가: 8000, 주문번호: 'S1', 원본: 원('') }),
    // D3 11번가 45000.00 → 4,500
    줄('기', { 판매처: '11번가', 품목코드: 'DDD01-10', 단가: 10000, 주문번호: 'E1', 원본: 원('45000.00') }),
    // D4 롯데ON — 운임손질 3,300 × 2박스
    줄('경', { 판매처: '롯데ON', 품목코드: 'EEE01-10', 단가: 30000, 주문번호: 'L1', 원본: 원('무료'), 묶음id: 'B1' }),
    // D5 문자 — 문자주문 배송비 3,500
    줄('신', { 판매처: '문자', 품목코드: 'FFF01-10', 단가: 15000, 주문번호: '', 문자주문id: 'M1' }),
    // D6 쿠팡 15cm×4(점수 8) + 서비스 15cm×1(점수 2) = 10 → 3,300 · 박스 1,200
    줄('임', { 품목코드: 'GGG01-15', 단가: 10000, 주문수량: 4, 주문번호: 'G1', 원본: 원('무료') }),
    줄('임', { 품목코드: 'GGG01-15', 단가: 3000, 서비스: true, 주문번호: 'G1', 원본: 원('무료') }),
    // 취소 줄은 아무 데도 안 들어간다
    줄('갑', { 품목코드: 'AAA01-10', 단가: 99999, 주문번호: 'X1', 카페24상태: '취소완료', 원본: 원('무료') })
  ];
  const 단가표 = { 'AAA01-10': 6000, 'CCC01-10': 4000, 'CCC02-10': 4000, 'NOC01-10': 0, 'DDD01-10': 3000, 'EEE01-10': 10000, 'FFF01-10': 5000, 'GGG01-15': 2500 };
  const 열쇠 = ZG.운임손질.앞머리들(줄들[8])[0] + '01000001234';
  const 손질 = { B1: [{ id: 'B1#' + 열쇠, 묶음id: 'B1', 묶음열쇠: 열쇠, 차수: 1, 단가: 3300, 박스수: 2 }] };
  const 이익 = { 설정: ZG.실적이익.설정(바꾼 || {}), 단가표, 문자배송비: { M1: 3500 }, 손질 };
  const 결 = ZG.주문실적.모으기(줄들, { 부터: '2026-10-01', 까지: '2026-10-31', 단위: '일', 이익 });
  const 마 = {}; 결.이익.마켓들.forEach(m => 마[m.이름] = m);
  const 뽑 = (m) => m && { 매출: m.매출, 이익매출: m.이익매출, 매입: m.매입, 수수료: m.수수료, 받은: m.받은, 낸: m.낸, 박스: m.박스, 부자재: m.부자재,
    포장비: m.포장비, 차액: m.차액, 이익: m.이익, 없음건: m.없음건, 없음매출: m.없음매출, 미상건: m.미상건, 갈래: m.갈래 };
  const 하나 = (사람들) => ZG.주문실적.모으기(줄들.filter(r => 사람들.indexOf(r.수령인) >= 0), { 부터: '2026-10-01', 까지: '2026-10-31', 단위: '일', 이익 }).이익.합계;
  return {
    A: 뽑(하나(['갑'])), B: 뽑(하나(['을'])), C: 뽑(마['스마트스토어']), D1: 뽑(마['G마켓']), D2: 뽑(마['심폴']),
    D3: 뽑(마['11번가']), D4: 뽑(마['롯데ON']), D5: 뽑(마['문자·당근·전화']), D6: 뽑(하나(['임'])),
    합: 뽑(결.이익.합계), 이익률: 결.이익.합계.이익률, 미상마켓: 결.이익.합계.미상마켓,
    마켓합: 결.이익.마켓들.reduce((a, m) => a + m.이익, 0), 마켓매출: 결.이익.마켓들.reduce((a, m) => a + m.매출, 0),
    상품합: 결.이익.상품들.reduce((a, p) => a + p.이익, 0), 매출: 결.합계.매출,
    상품: 결.이익.상품들.map(p => [p.접두, p.매출, p.이익, p.없음]),
    순서: 결.이익.마켓들.map(m => m.이름), NaN: JSON.stringify(결.이익).indexOf('NaN') >= 0
  };
}"""

def 새쪽(브, 폭, 높):
    쪽 = 브.new_page(viewport={'width': 폭, 'height': 높})
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.add_init_script(심기)
    # 00-새판 이 뜨자마자 한두 번 새로고침한다(옛 동작) — 그 사이 끊긴 스크립트가 있으면 다시 연다
    for _ in range(4):
        오류.clear(); 쪽.goto(주소); 쪽.wait_for_timeout(2000); 쪽.wait_for_load_state('networkidle')
        if 쪽.evaluate("() => !!(window.ZG && ZG.운임손질 && ZG.문자주문자료 && ZG.실적이익화면 && ZG.주문 && ZG.로젠파일)"): break
    return 쪽, 오류

# 화면용 — 최근 30일, 마켓마다 받은 배송비 모양을 실데이터처럼(쿠팡 무료 · 스마트 4500 · 11번가 45000.00 · 심폴 빈칸)
화면줄 = """() => {
  const 저 = ZG.저장소, 오늘 = ZG.ui.오늘문자();
  ZG.시드.심기();
  const 품 = 저.품목들().slice(0, 12);
  품[3].매입단가 = 0; 저.전체쓰기(저.키.품목, 저.품목들().map(p => p.품목코드 === 품[3].품목코드 ? Object.assign({}, p, { 매입단가: 0 }) : p));
  const 마 = [['쿠팡','무료'],['스마트스토어','4500.00'],['카페24','4500.00'],['G마켓','4500.00'],['11번가','45000.00'],['롯데ON','무료'],['심폴',''],['당근', null]];
  const 이름 = ['정하린','김정원','박하늘','오세린','윤도경','서지안','이수목','강나래','최다온','한별'];
  const 줄들 = []; let n = 0;
  for (let d = 0; d < 30; d++) {
    const 날 = ZG.계산.날짜문자(new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) - d).getTime());
    for (let k = 0; k < 3 + (d * 7) % 5; k++) {
      n++;
      const p = 품[(n * 5) % 품.length], m = 마[(n * 3) % 마.length], 사람 = 이름[n % 이름.length] + (n % 3);
      const r = { id: 'od_t' + n, 주문일: 날, 판매처: m[0], 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '',
        주문수량: 1 + n % 3, 옵션입수: 1, 단가: 9000 + (n % 5) * 3000, 수령인: 사람, 주문번호: 'N' + n, 묶음id: 'B' + d,
        수령인전화: '010-' + String(1000 + n).slice(-4) + '-1234', 수령인주소: '서울시 ' + n + '길', 출처: '수동', 등록일시: Date.now() - d * 86400000 };
      if (m[1] != null) { r.원본 = new Array(27).fill(''); r.원본[26] = m[1]; }
      r.묶음키 = ZG.주문자료.묶음키(r);
      줄들.push(r);
    }
  }
  저.전체쓰기(저.키.주문, 줄들);
  return 줄들.length;
}"""

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        쪽, 오류 = 새쪽(브, 1440, 900)

        print('\n① 계산 — 순수 (쿠팡 11.4%)')
        r = 쪽.evaluate(순수, None)
        A, B, C = r['A'], r['B'], r['C']
        본다('A 쿠팡 1건: 수수료 2,069 · 택배 2,750 · 박스 770 · 부자재 200 · 이익 6,361',
             [A['수수료'], A['낸'], A['박스'], A['부자재'], A['매입'], A['이익']] == [2069, 2750, 770, 200, 6000, 6361], A)
        본다('B 쿠팡 2개: 31,350×11.4%=3,573.9 → 반올림 3,574 · 부자재 400 · 이익 11,856',
             [B['수수료'], B['낸'], B['박스'], B['부자재'], B['매입'], B['이익']] == [3574, 2750, 770, 400, 12000, 11856], B)
        본다('C 스마트스토어: 수수료 = 20,000×6.36% + 4,500×3.63% = 1,435 · 받은 4,500 한 번 · 차액 +1,750',
             [C['수수료'], C['받은'], C['낸'], C['차액'], C['박스'], C['부자재'], C['이익'], C['갈래']] == [1435, 4500, 2750, 1750, 770, 400, 11145, '불포함'], C)
        본다('C 받은 − 택배비 − 박스비 = 980', C['받은'] - C['낸'] - C['박스'] == 980)
        D1 = r['D1']
        본다('D 매입가 없는 줄이 낀 송장 → 이익 제외, 따로 센다', D1['없음건'] == 1 and D1['없음매출'] == 16000 and D1['이익매출'] == 0
             and D1['이익'] == 0 and D1['매출'] == 16000, D1)
        D2 = r['D2']
        본다('D 심폴 → 미상 · 받은 0 · 이익 = 8,000−6,000−2,750−770−200', D2['미상건'] == 1 and D2['갈래'] == '미상' and D2['이익'] == -1720, D2)
        D3 = r['D3']
        본다('D 11번가 45000.00 → 4,500 · 수수료 round(1,300+148.5)=1,449 · 이익 6,331', D3['받은'] == 4500 and D3['수수료'] == 1449 and D3['이익'] == 6331, D3)
        D4 = r['D4']
        본다('D 운임손질 3,300×2박스 → 낸 6,600 · 박스 2,400 · 이익 7,200', D4['낸'] == 6600 and D4['박스'] == 2400 and D4['이익'] == 7200, D4)
        D5 = r['D5']
        본다('D 문자 → 문자·당근·전화 · 문자주문 배송비 3,500 · 이익 9,780', D5 and D5['받은'] == 3500 and D5['수수료'] == 0 and D5['이익'] == 9780, D5)
        D6 = r['D6']
        본다('D 서비스 줄도 상자 점수에 든다(10점 → 3,300 · 박스 1,200) · 매출엔 안 든다', D6['낸'] == 3300 and D6['박스'] == 1200 and D6['매출'] == 40000 and D6['이익'] == 20140, D6)
        합 = r['합']
        본다('합계 이익 = 마켓 이익의 합', 합['이익'] == r['마켓합'], [합['이익'], r['마켓합']])
        본다('합계 매출 = 08r 매출 = 마켓 매출의 합 (취소 빠짐)', 합['매출'] == r['매출'] == r['마켓매출'], [합['매출'], r['매출'], r['마켓매출']])
        본다('상품 이익 합 ≈ 합계 (몇 원 차이)', abs(r['상품합'] - 합['이익']) <= 5, [r['상품합'], 합['이익']])
        본다('이익률 = 이익 ÷ 매입가 있는 건 매출', abs(r['이익률'] - 합['이익'] / 합['이익매출']) < 1e-12 and 합['이익매출'] == 합['매출'] - 16000)
        본다('매입가 없는 상품은 「없음」, 이익 0', ['NOC01', 7000, 0, True] in r['상품'], [x for x in r['상품'] if x[0] == 'NOC01'])
        본다('미상 마켓 이름', r['미상마켓'] == ['심폴'], r['미상마켓'])
        본다('마켓 순서 = 이익 큰 순', r['순서'][0] == '쿠팡', r['순서'])
        본다('NaN 없음', not r['NaN'])
        r2 = 쪽.evaluate(순수, {'수수료': {'쿠팡': {'판매': 10}}})
        본다('설정 바꾸면 반영 (쿠팡 10% → A 수수료 1,815)', r2['A']['수수료'] == 1815 and r2['A']['이익'] == 6361 + 2069 - 1815, r2['A'])

        print('\n② 화면 — PC')
        n = 쪽.evaluate(화면줄)
        쪽.evaluate("() => ZG.주문.다시그리기()"); 쪽.wait_for_timeout(300)
        쪽.click('.pc-tabs button:has-text("주문실적")'); 쪽.wait_for_timeout(600)
        본다('넷칸 요약 · 분해줄 6칸 · 예외줄', 쪽.locator('.주문실적 .stat.five > div').count() == 4 and 쪽.locator('.주문실적 .eq .it').count() == 6
             and 쪽.locator('.주문실적 .exrow .exc').count() == 2)
        수 = 쪽.evaluate("""() => { const s = ZG.주문실적화면.상태; const 결 = ZG.주문실적.읽어모으기({부터:s.부터, 까지:s.까지, 단위:'일'}); return 결.이익.합계; }""")
        글 = 쪽.eval_on_selector_all('.주문실적 .eq .v', 'els => els.map(e => e.textContent)')
        본다('분해줄 = 계산 (매출·매입·수수료·차액·포장비·이익)', 글 == ['{:,}'.format(수['이익매출']), '{:,}'.format(수['매입']), '{:,}'.format(수['수수료']),
             ('+' if 수['차액'] > 0 else '−' if 수['차액'] < 0 else '') + '{:,}'.format(abs(수['차액'])), '{:,}'.format(수['포장비']), '{:,}'.format(수['이익'])], [글, 수['이익']])
        본다('분해줄 셈이 맞다', 수['이익매출'] - 수['매입'] - 수['수수료'] + 수['차액'] - 수['포장비'] == 수['이익'])
        행 = 쪽.locator('.주문실적 .이익마켓 tr:not(.tot)').count() - 1
        본다('마켓별 이익 표 — 8 마켓 + 합계', 행 == 8 and 쪽.locator('.주문실적 .이익마켓 tr.tot').count() == 1, 행)
        본다('기존 21 화면은 그대로 아래에 (추이·마켓 매출 표·상품 10줄)', 쪽.locator('.주문실적 .추이 svg').count() == 1
             and 쪽.locator('.주문실적 .ptab table').count() == 2 and 쪽.locator('.주문실적 tr.prow').count() == 10)
        쪽.screenshot(path=str(샷 / 'PC-1-이익.png'), full_page=True)
        쪽.click('.주문실적 .이익마켓 .mini-tg button:has-text("배송비 포함")'); 쪽.wait_for_timeout(200)
        포함 = 쪽.eval_on_selector_all('.주문실적 .이익마켓 tr:not(.tot) .kt', 'els => els.map(e => e.textContent)')
        본다('「배송비 포함」만', 포함 and all(t == '배송비 포함' for t in 포함), 포함)
        쪽.click('.주문실적 .이익마켓 .mini-tg button:has-text("전체")'); 쪽.wait_for_timeout(200)
        쪽.click('.주문실적 .이익상품 .mini-tg button:has-text("원가율 높은순")'); 쪽.wait_for_timeout(200)
        율 = 쪽.eval_on_selector_all('.주문실적 .이익상품 tr:not(.nocost) .cbar b', 'els => els.map(e => +e.textContent.replace("%",""))')
        본다('원가율 높은순', 율 == sorted(율, reverse=True) and len(율) > 1, 율)
        for _ in range(20):
            다음 = 쪽.locator('.주문실적 .이익상품 .pager button:has-text("›")')
            if not 다음.count() or 다음.is_disabled(): break
            다음.click(); 쪽.wait_for_timeout(150)
        끝 = 쪽.eval_on_selector_all('.주문실적 .이익상품 tr', 'els => els.slice(1).map(e => e.className)')
        본다('매입가 없는 상품은 맨 아래', 'nocost' in 끝 and 끝[끝.index('nocost'):] == ['nocost'] * (len(끝) - 끝.index('nocost')), 끝)
        쪽.fill('.주문실적 .이익상품 input', 'zzzz'); 쪽.wait_for_timeout(400)
        본다('찾기', '찾는 상품이 없습니다' in 쪽.eval_on_selector('.주문실적 .이익상품', 'e => e.textContent'))
        쪽.fill('.주문실적 .이익상품 input', ''); 쪽.wait_for_timeout(400)
        쪽.click('.주문실적 .gear'); 쪽.wait_for_timeout(300)
        본다('⚙ 수수료율 창 — 8 마켓, 쿠팡 11.4', 쪽.locator('.이익설정 tr').count() == 9 and 쪽.input_value('.이익설정 input >> nth=0') == '11.4')
        쪽.screenshot(path=str(샷 / 'PC-2-수수료율.png'), full_page=False)
        앞이익 = 수['이익']
        쪽.fill('.이익설정 input >> nth=0', '10'); 쪽.click('.이익설정 .btn.main'); 쪽.wait_for_timeout(500)
        저장 = 쪽.evaluate("() => JSON.parse(localStorage.getItem('zg.v3.실적이익설정'))")
        뒤 = 쪽.evaluate("""() => { const s = ZG.주문실적화면.상태; return ZG.주문실적.읽어모으기({부터:s.부터, 까지:s.까지, 단위:'일'}).이익.합계.이익; }""")
        본다('저장 → 바꾼 값만 · 이익이 오른다', 저장 == {'수수료': {'쿠팡': {'판매': 10}}} and 뒤 > 앞이익 and 쪽.locator('.이익설정').count() == 0, [저장, 앞이익, 뒤])
        쪽.click('.주문실적 .gear'); 쪽.wait_for_timeout(300)
        쪽.click('.이익설정 .btn.l'); 쪽.click('.이익설정 .btn.main'); 쪽.wait_for_timeout(400)
        본다('기본값으로 → 저장하면 빈 설정', 쪽.evaluate("() => JSON.parse(localStorage.getItem('zg.v3.실적이익설정'))") == {'수수료': {}})
        본다('PC 콘솔 오류 0', not 오류, 오류[:3])

        print('\n③ 화면 — 폰')
        폰, 폰오류 = 새쪽(브, 390, 844)
        폰.evaluate(화면줄)
        폰.evaluate("() => ZG.주문.다시그리기()"); 폰.wait_for_timeout(300)
        폰.click('.subtabs button:has-text("실적")'); 폰.wait_for_timeout(600)
        본다('폰 — 이익 요약카드 · 분해 · 예외 둘 · 마켓 줄 · 상품 카드', 폰.locator('.sumcard .rate').count() == 1 and 폰.locator('.bd2 > div').count() == 6
             and 폰.locator('.excs .exc').count() == 2 and 폰.locator('.주문실적 .mr').count() == 8 and 폰.locator('.주문실적 .pk').count() > 3)
        본다('폰 — 기존 추이·마켓·상품 그대로', 폰.locator('.주문실적 .추이 svg').count() == 1 and 폰.locator('.pcard').count() > 0)
        폰.screenshot(path=str(샷 / '폰-1-이익.png'), full_page=False)
        폰.click('.주문실적 .이익상품칸 .fchip:has-text("원가율 높은순")'); 폰.wait_for_timeout(200)
        폰.locator('.주문실적 .이익상품칸').scroll_into_view_if_needed()
        폰.screenshot(path=str(샷 / '폰-2-상품.png'), full_page=False)
        폰.click('.주문실적 .hscroll .gear'); 폰.wait_for_timeout(300)
        본다('폰 수수료율 — 온 화면, 8 줄, 심폴 배송비 미상', 폰.locator('.이익설정.폰 .sk').count() == 8 and '미상' in 폰.eval_on_selector('.이익설정.폰', 'e => e.textContent'))
        폰.screenshot(path=str(샷 / '폰-3-수수료율.png'), full_page=False)
        폰.click('.이익설정 .pill'); 폰.wait_for_timeout(200)
        본다('폰 닫기', 폰.locator('.이익설정').count() == 0)
        본다('폰 콘솔 오류 0', not 폰오류, 폰오류[:3])
        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
