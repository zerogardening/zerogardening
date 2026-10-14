# -*- coding: utf-8 -*-
# 21단계 주문실적 · 주문조회 마켓칩·시각 검수 (설계 21단계-주문실적-설계.md §7)
#   python3 v3/검수/주문실적-시험.py [실데이터사본폴더]   ← playwright 필요
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 서버에 아무것도 안 쓴다.
#    실데이터 사본(zg.v3.주문.json · zg.v3.품목.json)을 주면 로컬 페이지에 심어 집계만 출력한다(읽기만).
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
샷 = 뿌리 / '검수' / '21-주문실적'
샷.mkdir(parents=True, exist_ok=True)
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
사본 = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8781', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8781/%EC%A3%BC%EB%AC%B8.html'

# 가짜 줄 — 사람 셋 · 마켓 넷 · 서비스·취소·날짜오류 섞음
가짜 = """() => {
  const 줄 = (o) => Object.assign({ 수령인:'갑', 수령인전화:'010-1111-1111', 수령인주소:'서울 1', 판매처:'쿠팡',
    품목코드:'FEE01-10', 유통명:'페스튜카', 규격:'10cm', 주문수량:1, 옵션입수:1, 단가:5000, 주문일:'2026-10-05' }, o);
  return [
    줄({}), 줄({ 품목코드:'FEE01-15', 규격:'15cm', 단가:8000 }),                         // 같은 사람 같은 날 쿠팡 2줄 → 1건
    줄({ 주문일:'2026-10-06' }),                                                          // 이튿날 → 또 1건
    줄({ 판매처:'스마트스토어', 주문수량:2 }),                                           // 같은 날 다른 마켓 → 1건
    줄({ 수령인:'을', 수령인전화:'010-2222-2222', 판매처:'카페24', 결제금액:12345, 주문수량:3, 옵션입수:4 }),  // 결제금액 그대로
    줄({ 수령인:'병', 수령인전화:'010-3333-3333', 판매처:'카페24', 주문수량:2, 원본수량:5, 결제금액:99999, 단가:4000 }), // 손댄 수량 → 2×4000
    줄({ 수령인:'정', 수령인전화:'010-4444-4444', 서비스:true, 단가:3000 }),           // 서비스만 → 건 아님
    줄({ 수령인:'무', 수령인전화:'010-5555-5555', 카페24상태:'취소완료' }),
    줄({ 수령인:'기', 수령인전화:'010-6666-6666', 카페24상태:'C40' }),
    줄({ 수령인:'경', 수령인전화:'010-7777-7777', 품목코드:'', 원본코드:'X99', 유통명:'짝없는것', 판매처:'' }),
    줄({ 주문일:'엉터리' }),
    줄({ 주문일:'2026-03-08', 수령인:'신' }),                                             // 서머타임 없는 날짜
    줄({ 주문일:'2026-11-30' })                                                           // 기간 밖
  ];
}"""

순수 = """(가) => {
  const 실 = ZG.주문실적, 자 = ZG.주문자료, 줄들 = (new Function('return (' + 가 + ')()'))();
  const 기 = { 부터:'2026-03-01', 까지:'2026-10-31' };
  const 일 = 실.모으기(줄들, Object.assign({ 단위:'일' }, 기)),
        주 = 실.모으기(줄들, Object.assign({ 단위:'주' }, 기)),
        월 = 실.모으기(줄들, Object.assign({ 단위:'월' }, 기));
  const 칸합 = (r, k) => r.칸들.reduce((a, c) => a + c[k], 0);
  const 매출줄 = 줄들.filter(r => !r.서비스 && !실.취소인가(r) && 자.날짜정규화(r.주문일) && 자.날짜정규화(r.주문일) <= 기.까지);
  const 하루 = 실.모으기(줄들, { 부터:'2026-10-05', 까지:'2026-10-05', 단위:'일' });
  const 페 = 일.상품들.find(p => p.접두 === 'FEE01');
  return {
    합: 일.합계, 뺀: 일.뺀줄,
    줄합: 매출줄.reduce((a, r) => a + 자.금액(r), 0),
    일매출: 칸합(일,'매출'), 주매출: 칸합(주,'매출'), 월매출: 칸합(월,'매출'),
    일건: 칸합(일,'건수'), 주건: 칸합(주,'건수'), 월건: 칸합(월,'건수'), 주합: 주.합계, 월합: 월.합계,
    마켓매출: 일.마켓들.reduce((a, m) => a + m.매출, 0), 마켓건: 일.마켓들.reduce((a, m) => a + m.건수, 0),
    상품매출: 일.상품들.reduce((a, p) => a + p.매출, 0), 상품수량: 일.상품들.reduce((a, p) => a + p.수량, 0),
    칸마켓: 일.칸들.every(c => Object.values(c.마켓).reduce((a, m) => a + m.매출, 0) === c.매출 &&
                              Object.values(c.마켓).reduce((a, m) => a + m.건수, 0) === c.건수),
    하루: { 합: 하루.합계, 마켓: 하루.마켓들.map(m => [m.이름, m.건수, m.매출]) },
    일칸수: 일.칸들.length, 빈칸: 일.칸들.filter(c => !c.매출).length,
    주칸: 주.칸들.map(c => [c.부터, c.까지]),
    삼월: 일.칸들.filter(c => c.부터 >= '2026-03-07' && c.부터 <= '2026-03-09').map(c => [c.부터, c.매출, c.일요일]),
    페: 페 && { 규격: 페.규격들.map(g => g.품목코드), 비중: Object.values(페.마켓).reduce((a, m) => a + m.비중, 0), 추이: 페.추이.reduce((a, b) => a + b, 0), 매출: 페.매출 },
    물음: 일.상품들.filter(p => p.접두[0] === '?').map(p => [p.접두, p.코드]),
    기타: 일.마켓들.some(m => m.이름 === '기타'),
    칩: ['이번 주','이번 달','지난달','최근 30일','올해'].map(n => [n, 실.기간칩(n, '2026-10-14')]),
    NaN없음: JSON.stringify(일).indexOf('NaN') < 0 && JSON.stringify(주).indexOf('NaN') < 0
  };
}"""

시각 = """() => {
  const 시 = ZG.주문올리기.시각만들기;
  return [시('2026-09-02 17:22'), 시(new Date(2026, 8, 2, 0, 0, 0)), 시(new Date(2026, 8, 2, 9, 5)), 시(45903.5),
          시(45903), 시('2026-08-06'), 시('2026-08-06 25:10'), 시('2026-08-08T20:42:07+09:00'), 시('')];
}"""

# 카페24 27칸 + 덤칸 주문일시 · 당근 14칸 — 08h 읽기결과 를 그대로 돌린다(저장은 안 한다)
올리기 = """() => {
  const 칸 = ZG.주문올리기.칸이름들();
  const 줄 = 칸.map(n => ({ 쇼핑몰:'쿠팡', 주문번호:'T1', 발주일:'2026-10-05', 주문상품명:'시험', 수량:'1', 수령인:'갑', 주소:'서울', 핸드폰:'010-1234-5678', 판매가:'5000' })[n] || '');
  const 기본 = ZG.주문올리기.읽기결과([칸, 줄]);
  const 덤 = ZG.주문올리기.읽기결과([칸.concat(['주문일시']), 줄.concat(['2026-10-05 14:07'])]);
  const 앞덤 = ZG.주문올리기.읽기결과([['주문일시'].concat(칸), ['2026-10-05 08:30'].concat(줄)]);
  const 당머리 = ['주문번호','주문일시','상품명','가격','주문상태','주문자명','연락처','우편번호','배송주소','요청사항','현관 출입 방법'];
  const 당 = ZG.주문올리기.읽기결과([당머리, ['D1','2026-09-02 17:22','제로가드닝 페스튜카 2개','9000','결제완료','당근이','010-9999-0000','12345','서울 어딘가','','']]);
  return {
    기본시각: 기본.항목들[0].줄.주문시각 === undefined, 기본키: Object.keys(기본.항목들[0].줄).includes('주문시각'),
    덤시각: 덤.항목들[0].줄.주문시각, 앞덤시각: 앞덤.항목들[0].줄.주문시각,
    원본같음: JSON.stringify(기본.항목들[0].원본) === JSON.stringify(덤.항목들[0].원본) && JSON.stringify(기본.항목들[0].원본) === JSON.stringify(앞덤.항목들[0].원본),
    원본길이: 덤.항목들[0].원본.length, 모르는: 덤.머리.모르는,
    당ok: 당.ok, 당시각: 당.ok && 당.항목들[0].줄.주문시각, 당날: 당.ok && 당.항목들[0].줄.주문일,
    당원본: 당.ok && 당.항목들[0].원본.length, 당발주일: 당.ok && 당.항목들[0].원본[3]
  };
}"""

def 새쪽(브, 폭, 높):
    쪽 = 브.new_page(viewport={'width': 폭, 'height': 높})
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소); 쪽.wait_for_timeout(2000)
    return 쪽, 오류

# 화면용 가짜 줄 — 최근 30일에 고루 흩는다. 반은 주문시각이 있다
화면줄 = """() => {
  const 저 = ZG.저장소, 오늘 = ZG.ui.오늘문자();
  ZG.시드.심기();
  const 품 = 저.품목들().slice(0, 12), 마 = ['카페24','쿠팡','스마트스토어','G마켓','11번가','심폴','문자','전화주문'];
  const 이름 = ['정하린','김정원','박하늘','오세린','윤도경','서지안','이수목','강나래','최다온','한별'];
  const 줄들 = [];
  let n = 0;
  for (let d = 0; d < 30; d++) {
    const 날 = ZG.계산.날짜문자(new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) - d).getTime());
    for (let k = 0; k < 3 + (d * 7) % 5; k++) {
      n++;
      const p = 품[(n * 5) % 품.length], 사람 = 이름[n % 이름.length] + (n % 3);
      const r = { id: 'od_t' + n, 주문일: 날, 판매처: 마[(n * 3) % 마.length], 품목코드: p.품목코드, 유통명: p.유통명, 학명: p.학명 || '',
        규격: p.규격 || '', 주문수량: 1 + n % 4, 옵션입수: 1, 단가: 3000 + (n % 5) * 1500, 수령인: 사람,
        수령인전화: '010-' + String(1000 + n).slice(-4) + '-1234', 수령인주소: '서울시 ' + n + '길', 출처: '수동', 등록일시: Date.now() - d * 86400000 };
      if (n % 2) r.주문시각 = String(8 + n % 13).padStart(2,'0') + ':' + String((n * 7) % 60).padStart(2,'0');
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

        print('\n① 집계 — 순수 함수')
        r = 쪽.evaluate(순수, 가짜)
        합 = r['합']
        본다('합계 매출 = 매출줄 금액의 합 (08a.금액)', 합['매출'] == r['줄합'], [합['매출'], r['줄합']])
        본다('일 = 주 = 월 매출 합', r['일매출'] == r['주매출'] == r['월매출'] == 합['매출'], [r['일매출'], r['주매출'], r['월매출']])
        본다('일 = 주 = 월 건수 합', r['일건'] == r['주건'] == r['월건'] == 합['건수'], [r['일건'], r['주건'], r['월건'], 합['건수']])
        본다('주·월 합계도 같다', r['주합'] == 합 and r['월합'] == 합)
        본다('마켓별 합 = 합계 (매출·건수)', r['마켓매출'] == 합['매출'] and r['마켓건'] == 합['건수'], [r['마켓매출'], r['마켓건']])
        본다('상품별 합 = 합계 (매출·수량)', r['상품매출'] == 합['매출'] and r['상품수량'] == 합['수량'], [r['상품매출'], r['상품수량'], 합['수량']])
        본다('칸 안 마켓 합 = 칸 값', r['칸마켓'])
        하 = r['하루']
        # 10/5: 갑 쿠팡(2줄)=1 · 갑 스마트=1 · 을 카페24=1 · 병 카페24=1 · 경 기타=1 → 5건. 서비스·취소 빠짐
        본다('같은 사람 같은 날 쿠팡 2줄 → 1건, 다른 마켓 → 따로', 하['합']['건수'] == 5 and ['쿠팡', 1, 13000] in 하['마켓'], 하)
        본다('결제금액 그대로 · 손댄 수량은 수량×단가',
             하['합']['매출'] == 5000 + 8000 + 10000 + 12345 + 8000 + 5000, 하['합']['매출'])
        본다('서비스 1 · 취소 2 · 날짜 1 이 빠진다', r['뺀'] == {'서비스': 1, '취소': 2, '날짜': 1}, r['뺀'])
        본다('빈 날 0칸도 만든다 (3/1~10/31 = 245일)', r['일칸수'] == 245 and r['빈칸'] > 200, [r['일칸수'], r['빈칸']])
        주칸 = r['주칸']
        본다('주는 일요일 시작 · 첫·끝 칸은 기간에서 잘림', 주칸[0] == ['2026-03-01', '2026-03-07'] and 주칸[-1][1] == '2026-10-31'
             and 주칸[-1][0] == '2026-10-25', [주칸[0], 주칸[-1]])
        본다('3/8 칸이 하루 한 칸, 일요일', r['삼월'] == [['2026-03-07', 0, False], ['2026-03-08', 5000, True], ['2026-03-09', 0, False]], r['삼월'])
        페 = r['페']
        본다('FEE01-10·15 → 접두 한 줄, 규격 둘', 페 and sorted(페['규격']) == ['FEE01-10', 'FEE01-15'], 페)
        본다('상품 마켓 비중 합 100%', 페 and abs(페['비중'] - 1) < 1e-9, 페 and 페['비중'])
        본다('상품 추이 합 = 상품 매출', 페 and 페['추이'] == 페['매출'])
        본다('코드 없는 줄은 따로, 코드 칸 —', r['물음'] == [['?X99', '—']], r['물음'])
        본다('빈 판매처는 「기타」', r['기타'])
        칩 = dict((a, b) for a, b in r['칩'])
        본다('기간칩', 칩['이번 주'] == {'부터': '2026-10-11', '까지': '2026-10-14'} and 칩['지난달'] == {'부터': '2026-09-01', '까지': '2026-09-30'}
             and 칩['최근 30일'] == {'부터': '2026-09-15', '까지': '2026-10-14'} and 칩['올해']['부터'] == '2026-01-01', 칩)
        본다('NaN 없음', r['NaN없음'])

        print('\n② 시각만들기')
        시 = 쪽.evaluate(시각)
        본다('시각 판정', 시 == ['17:22', '', '09:05', '12:00', '', '', '', '20:42', ''], 시)

        print('\n③ 올리기 — 주문일시 칸 · 당근')
        o = 쪽.evaluate(올리기)
        본다('시각 없으면 칸을 안 만든다', o['기본시각'] and not o['기본키'])
        본다('카페24 주문일시 칸 → 주문시각', o['덤시각'] == '14:07' and o['앞덤시각'] == '08:30', [o['덤시각'], o['앞덤시각']])
        본다('원본27 이 안 밀린다 (뒤·앞에 덤칸)', o['원본같음'] and o['원본길이'] == 27, o['원본길이'])
        본다('주문일시는 모르는 칸이 아니다', o['모르는'] == [], o['모르는'])
        본다('당근 → 시각 저장 · 날짜·발주일 칸은 날짜만', o['당ok'] and o['당시각'] == '17:22' and o['당날'] == '2026-09-02'
             and o['당원본'] == 27 and o['당발주일'] == '2026-09-02', o)

        print('\n④ 주문 조회 — 마켓칩 · 시각')
        n = 쪽.evaluate(화면줄)
        쪽.evaluate("() => { const 상 = ZG.주문.상태, 오늘 = ZG.ui.오늘문자(); 상.부터 = ZG.주문실적.기간칩('최근 30일', 오늘).부터; 상.까지 = 오늘; 상.기간칩 = ''; ZG.주문.다시그리기(); }")
        쪽.wait_for_timeout(500)
        칩들 = 쪽.eval_on_selector_all('.마켓줄 .fchip', 'els => els.map(e => [e.childNodes[e.childNodes.length-2].textContent, +e.querySelector(".n").textContent, e.classList.contains("zero")])')
        본다('고정 9 + 전체 + 그밖(전화주문)', [c[0] for c in 칩들][:10] == ['전체', '카페24', '쿠팡', '스마트스토어', 'G마켓', '11번가', '롯데ON', '심폴', '당근', '문자']
             and 칩들[-1][0] == '전화주문', [c[0] for c in 칩들])
        본다('0 인 칩은 흐림', all(c[2] == (c[1] == 0) for c in 칩들[1:]), 칩들)
        def 띠건():
            return int(쪽.eval_on_selector('.합계띠 .칸 b', 'e => e.textContent').replace(',', ''))
        본다('「전체」 수 = 합계띠', 칩들[0][1] == 띠건(), [칩들[0][1], 띠건()])
        맞음 = []
        for 이름, 수, _ in 칩들[1:]:
            if not 수: continue
            쪽.click('.마켓줄 .fchip:has-text("%s")' % 이름); 쪽.wait_for_timeout(250)
            맞음.append((이름, 수, 띠건()))
        본다('칩 수 = 누른 뒤 합계띠 건수', all(a[1] == a[2] for a in 맞음), 맞음)
        걸린 = 쪽.evaluate("() => [...new Set(ZG.주문.줄들().map(r => r.판매처))]")
        본다('마켓을 걸면 줄들()도 그 마켓만', 걸린 == [맞음[-1][0]], 걸린)
        쪽.click('.마켓줄 .fchip:has-text("전체")'); 쪽.wait_for_timeout(250)
        시각칸 = 쪽.eval_on_selector_all('td.wh .t', 'els => els.map(e => e.textContent)')
        본다('PC 주문 일시 칸 — 시각 또는 --:--', 시각칸 and all(t == '--:--' or (len(t) == 5 and t[2] == ':') for t in 시각칸) and '--:--' in 시각칸, 시각칸[:6])
        등록 = 쪽.evaluate("""() => { const 표 = {}; ZG.주문.줄들().forEach(r => { if (!r.주문시각) { const d = new Date(r.등록일시);
            표[String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')] = 1; } }); return Object.keys(표); }""")
        없는것 = 쪽.evaluate("() => ZG.주문자료.건으로묶기(ZG.주문.줄들()).filter(g => !g.줄들.some(r => r.주문시각)).length")
        본다('시각 없는 건 수 = --:-- 수 (등록일시가 안 끼어든다)', 시각칸[:20].count('--:--') == min(없는것, 20) or 시각칸.count('--:--') <= 없는것, [시각칸.count('--:--'), 없는것, 등록[:3]])
        쪽.screenshot(path=str(샷 / 'PC-1-주문조회.png'), full_page=False)

        print('\n⑤ 주문실적 탭 — PC')
        쪽.click('.pc-tabs button:has-text("주문실적")'); 쪽.wait_for_timeout(500)
        본다('길 안내', 쪽.eval_on_selector('.pc-head .path', 'e => e.textContent') == '주문 관리 › 주문실적')
        본다('추이 svg · 마켓 표 · 상품 표', 쪽.locator('.주문실적 .추이 svg').count() == 1 and 쪽.locator('.주문실적 .ptab table').count() == 2
             and 쪽.locator('.주문실적 tr.prow').count() == 10)
        매출 = 쪽.eval_on_selector('.주문실적 .stat .v', 'e => e.textContent')
        계산 = 쪽.evaluate("() => { const s = ZG.주문실적화면.상태; return ZG.주문실적.읽어모으기({부터:s.부터, 까지:s.까지, 단위:'일'}).합계.매출; }")
        본다('요약 매출 = 집계', 매출.replace(',', '').replace('원', '').replace(',', '') == str(계산), [매출, 계산])
        쪽.hover('.주문실적 .추이 svg rect[data-i="20"]'); 쪽.wait_for_timeout(200)
        본다('점에 올리면 말풍선', 쪽.eval_on_selector('.주문실적 .tip', 'e => !e.hidden && e.textContent.includes("합계")'))
        쪽.click('.주문실적 tr.prow:nth-of-type(3)'); 쪽.wait_for_timeout(300)
        본다('상품 펼침 — 규격·마켓·추이선', 쪽.locator('.주문실적 tr.det .vtab').count() == 2 and 쪽.locator('.주문실적 tr.det svg').count() == 1)
        쪽.hover('.주문실적 .추이 svg rect[data-i="20"]'); 쪽.wait_for_timeout(200)
        쪽.screenshot(path=str(샷 / 'PC-2-실적-일간.png'), full_page=True)
        for 단위, 이름 in [('주간', 'PC-3-실적-주간.png'), ('월간', None)]:
            쪽.click('.주문실적 .기간줄 .mini-tg button:has-text("%s")' % 단위); 쪽.wait_for_timeout(400)
            if 이름: 쪽.screenshot(path=str(샷 / 이름), full_page=True)
        월칸 = 쪽.locator('.주문실적 .ptbody tr').count()
        본다('월간 = 달 칸 1~2', 1 <= 월칸 <= 2, 월칸)
        쪽.click('.주문실적 .추이 .mini-tg button:has-text("건수")'); 쪽.wait_for_timeout(300)
        본다('지표 건수 — 제목 바뀜', 쪽.eval_on_selector('.주문실적 .추이 h4', 'e => e.textContent') == '주문 추이')
        쪽.fill('.주문실적 .상품표 input', 'zzzz없는것'); 쪽.wait_for_timeout(400)
        본다('찾기 없으면 「찾는 상품이 없습니다」', '찾는 상품이 없습니다' in 쪽.eval_on_selector('.주문실적 .상품표', 'e => e.textContent'))
        쪽.fill('.주문실적 .상품표 input', ''); 쪽.wait_for_timeout(400)
        쪽.click('.주문실적 .상품표 th:has-text("수량")'); 쪽.wait_for_timeout(200)
        수량들 = 쪽.eval_on_selector_all('.주문실적 tr.prow td:nth-child(6)', 'els => els.map(e => +e.textContent.replace(/,/g, ""))')
        본다('수량 정렬', 수량들 == sorted(수량들, reverse=True), 수량들)
        쪽.click('.pc-tabs button:has-text("고객")'); 쪽.wait_for_timeout(400)
        본다('고객 탭 .ccard 는 실적 CSS 를 안 받는다', 쪽.evaluate("() => { const c = document.querySelector('.ccard'); return !c || getComputedStyle(c).display === 'flex'; }"))
        본다('PC 콘솔 오류 0', not 오류, 오류[:3])

        print('\n⑥ 폰')
        폰, 폰오류 = 새쪽(브, 390, 844)
        폰.evaluate(화면줄)
        폰.evaluate("() => ZG.주문.다시그리기()"); 폰.wait_for_timeout(400)
        탭 = 폰.eval_on_selector_all('.subtabs button', 'els => els.map(e => e.textContent)')
        본다('폰 탭 짧은 이름 다섯', 탭 == ['조회', '견적', '고객', '문자', '실적'], 탭)
        본다('폰 카드 왼쪽 날짜·시각', 폰.locator('.ocard .when .t').count() > 0)
        폰.screenshot(path=str(샷 / '폰-1-주문조회.png'))
        폰.click('.마켓줄 .fchip:has-text("쿠팡")'); 폰.wait_for_timeout(300)
        폰.screenshot(path=str(샷 / '폰-2-쿠팡만.png'))
        폰.click('.subtabs button:has-text("실적")'); 폰.wait_for_timeout(500)
        본다('폰 요약줄(.ph-sub) 없음', 폰.locator('.ph-sub').count() == 0)
        본다('폰 실적 — 요약·추이·마켓·상품', 폰.locator('.sumcard').count() == 1 and 폰.locator('.주문실적 .추이 svg').count() == 1
             and 폰.locator('.prow2').count() > 30 and 폰.locator('.pcard').count() > 0)
        폰.click('.주문실적 .추이 svg rect[data-i="10"]'); 폰.wait_for_timeout(200)
        폰.screenshot(path=str(샷 / '폰-3-실적-위.png'), full_page=False)
        폰.click('.pcard:nth-child(2)'); 폰.wait_for_timeout(300)
        본다('폰 상품 펼침', 폰.locator('.pcard.open .det .mrow').count() > 0)
        폰.locator('.pcard.open').scroll_into_view_if_needed()
        폰.screenshot(path=str(샷 / '폰-4-실적-상품펼침.png'), full_page=False)
        폰.click('.주문실적 .단위줄 button:has-text("주간")'); 폰.wait_for_timeout(300)
        본다('폰 주간 전환', 폰.locator('.prow2').count() in (6, 7), 폰.locator('.prow2').count())
        본다('폰 콘솔 오류 0', not 폰오류, 폰오류[:3])

        if 사본:
            print('\n⑦ 실데이터 사본 (읽기만, 로컬 페이지)')
            실, _ = 새쪽(브, 1440, 900)
            주문 = (사본 / 'zg.v3.주문.json').read_text(encoding='utf-8')
            품목 = (사본 / 'zg.v3.품목.json').read_text(encoding='utf-8') if (사본 / 'zg.v3.품목.json').exists() else '[]'
            out = 실.evaluate("""([주, 품]) => {
              const 줄들 = JSON.parse(주), 실 = ZG.주문실적, 자 = ZG.주문자료, 오늘 = ZG.ui.오늘문자();
              const 이름표 = {}; JSON.parse(품).forEach(p => { const k = String(p.품목코드||'').slice(0,5); if (k && !이름표[k]) 이름표[k] = p.유통명; });
              const 온 = 실.모으기(줄들, { 부터:'2000-01-01', 까지:오늘, 단위:'월', 이름표 });
              const 삼십 = 실.모으기(줄들, Object.assign({ 단위:'일', 이름표 }, 실.기간칩('최근 30일', 오늘)));
              const 줄합 = 줄들.filter(r => { const d = 자.날짜정규화(r.주문일); return d && d <= 오늘 && !r.서비스 && !실.취소인가(r); }).reduce((a, r) => a + 자.금액(r), 0);
              return { 줄수: 줄들.length, 시각있는줄: 줄들.filter(r => r.주문시각).length, 합: 온.합계, 줄합, 뺀: 온.뺀줄,
                       NaN: JSON.stringify(온).includes('NaN') || JSON.stringify(삼십).includes('NaN'),
                       삼십: 삼십.합계, 삼십마켓: 삼십.마켓들.map(m => m.이름 + ' ' + m.건수 + '건 ' + m.매출),
                       취소상태: [...new Set(줄들.filter(실.취소인가).map(r => r.카페24상태))] };
            }""", [주문, 품목])
            print('   ', json.dumps(out, ensure_ascii=False))
            본다('실데이터 — NaN 없음', not out['NaN'])
            본다('실데이터 — 합계 매출 = Σ 매출줄 금액', out['합']['매출'] == out['줄합'], [out['합']['매출'], out['줄합']])

        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
