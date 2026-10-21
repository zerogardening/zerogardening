# -*- coding: utf-8 -*-
# 30단계 주문실적 「재구매」 검수 (설계 30단계-재구매-설계.md 「시험 예시」)
#   python3 v3/검수/재구매-시험.py      ← playwright 필요
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 서버에 아무것도 안 쓴다.
#    실데이터 대조(④)는 백업 파일을 읽기만 한다 · 화면 캡처는 가짜 이름으로만.
import json, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
백업 = 뿌리.parent / '백업' / '자동' / 'v3-2026-10-21' / 'v3_주문.json'
샷 = 뿌리 / '검수' / '30-재구매'
샷.mkdir(parents=True, exist_ok=True)
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
포트 = '8832'

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + json.dumps(덧, ensure_ascii=False)) if 덧 != '' else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', 포트, '-d', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
주소 = 'http://localhost:' + 포트 + '/%EC%A3%BC%EB%AC%B8.html'

# 설계 예시 6줄 — 김가 11111: 10/1 쿠팡 · 10/1 쿠팡(같은 날) · 10/5 스스 / 이나 22222: 10/2 스스 · 10/3 스스(취소) / 박다 33333: 10/4 심폴(서비스)
예시 = """() => {
  let n = 0;
  const 줄 = (이름, 우, 날, 마켓, o) => Object.assign({ id: 'e' + (++n), 수령인: 이름, 우편번호: 우, 주문일: 날, 판매처: 마켓,
    수령인주소: 이름 + ' 주소 ' + n, 수령인전화: '010-1111-' + (1000 + n), 품목코드: 'AAA01-10', 주문수량: 1, 옵션입수: 1, 단가: 10000, 주문번호: 'E' + n }, o);
  const 줄들 = [
    줄('김가', '11111', '2026-10-01', '쿠팡'), 줄('김가', '11111', '2026-10-01', '쿠팡'), 줄('김 가', '11-111', '2026-10-05', '스마트스토어'),
    줄('이나', '22222', '2026-10-02', '스마트스토어'), 줄('이나', '22222', '2026-10-03', '스마트스토어', { 카페24상태: '취소완료' }),
    줄('박다', '33333', '2026-10-04', '심폴', { 서비스: true })
  ];
  const 결 = ZG.재구매.모으기(줄들, null);
  const 마 = {}; 결.마켓들.forEach(m => 마[m.이름] = m);
  const 김 = 결.손님들.filter(s => s.이름.replace(/\\s/g, '') === '김가')[0];
  return { 손님수: 결.손님수, 재구매수: 결.재구매수, 율: 결.율, 분포: 결.분포, 못셈: 결.못셈,
    쿠팡: 마['쿠팡'], 스스: 마['스마트스토어'], 심폴: 마['심폴'] || null, 합: 결.합,
    김: 김 && { 회차: 김.회차, 주소: 김.주소, 첫마켓: 김.첫마켓, 최근: 김.최근, 매출: 김.매출, 주로: 김.주로 },
    손님들: 결.손님들.length, 김주소: 줄들[2].수령인주소 };
}"""

# ★ — 08i 송장 파일의 E열 앞머리 「(번호/★n)」
별 = """() => {
  const 저 = ZG.저장소; let n = 0;
  const 원 = (r) => { const o = new Array(27).fill(''); o[2] = r.주문번호; o[4] = '상품'; o[11] = '10000'; o[12] = '1'; o[13] = r.수령인; o[14] = r.우편번호;
    o[15] = r.수령인주소; o[18] = '010-2222-3333'; return o; };
  const 줄 = (이름, 우, 주소, 날, o) => Object.assign({ id: 'od_s' + (++n), 수령인: 이름, 우편번호: 우, 수령인주소: 주소, 주문일: 날, 판매처: '쿠팡',
    수령인전화: '010-2222-3333', 품목코드: 'AAA01-10', 유통명: '시험풀', 주문수량: 1, 옵션입수: 1, 단가: 10000, 주문번호: 'S' + n }, o);
  const 줄들 = [
    줄('갑순', '11111', '서울 갑', '2026-10-01'), 줄('갑순', '11111', '서울 갑', '2026-10-02', { 카페24상태: '반품완료' }),
    줄('갑순', '11111', '서울 갑', '2026-10-03', { 서비스: true }), 줄('갑순', '11111', '서울 갑', '2026-10-05'), 줄('갑순', '11111', '서울 갑', '2026-10-09'),
    줄('을돌', '', '부산 을동 1-2', '2026-10-01'), 줄('을돌', '', '부산 을동 12', '2026-10-04')
  ];
  저.전체쓰기(저.키.주문, 줄들);
  const 머리 = (r) => { const 표 = ZG.로젠파일.준비([{ 원본: 원(r), 줄: r, id: r.id }], { 묶음id: 'x' }).표; const m = String(표[0][4]).match(/★(\\d+)/); return m ? +m[1] : 0; };
  return { 첫날: 머리(줄들[0]), 닷새: 머리(줄들[3]), 아흐레: 머리(줄들[4]), 주소손님: 머리(줄들[6]),
    산날: ZG.주문자료.산날들(줄들) };
}"""

# 59d6ba1 판(HEAD 08i 재구매표)을 그대로 옮긴 것 — 새 08a 산날들과 실데이터로 대조한다
옛판대조 = """(줄들) => {
  const 취소 = ZG.주문실적.취소인가, 옛 = {};
  줄들.forEach(r => {
    const 이 = String(r.수령인 == null ? '' : r.수령인).normalize('NFC').replace(/\\s/g, ''), 우 = String(r.우편번호 == null ? '' : r.우편번호).replace(/\\D/g, '');
    if (!이 || !우 || !r.주문일) return;
    if (r.서비스 === true || (취소 && 취소(r))) return;
    (옛[이 + '|' + 우] = 옛[이 + '|' + 우] || {})[r.주문일] = 1;
  });
  const 새 = ZG.주문자료.산날들(줄들);
  const 같은 = Object.keys(옛).every(k => 새[k] && Object.keys(새[k]).sort().join() === Object.keys(옛[k]).sort().join());
  const 새만 = Object.keys(새).filter(k => !옛[k]);
  const 별 = (k) => (새[k] ? Object.keys(새[k]).length : 0);
  const 결 = ZG.재구매.모으기(줄들, ZG.실적이익.조건읽기());
  return { 옛손님: Object.keys(옛).length, 같은: 같은, 새만: 새만.length, 새만다주소: 새만.every(k => k.indexOf('|주소#') > 0),
    임귀희: 별('임귀희|04805'), 이순규: 별('이순규|46211'), 조미화: 별('조미화|38128'),
    손님수: 결.손님수, 재구매수: 결.재구매수, 율: 결.율, 분포: 결.분포, 못셈: 결.못셈,
    이익손님: 결.손님들.filter(s => s.이익있음).length, NaN: JSON.stringify(결).indexOf('NaN') >= 0,
    마켓: 결.마켓들.map(m => [m.이름, m.첫, m.재]) };
}"""

# 화면용 가짜 — 손님 12명이 1~5회, 마켓 섞임 · 심폴 손님(이익 ≈) · 매입가 없는 손님(이익 —)
화면줄 = """() => {
  const 저 = ZG.저장소, 오늘 = ZG.ui.오늘문자();
  ZG.시드.심기();
  const 품 = 저.품목들().filter(p => Number(p.매입단가) > 0).slice(0, 6);
  const 마 = ['쿠팡', '스마트스토어', '쿠팡', 'G마켓', '문자', '쿠팡', '11번가', '카페24'];
  const 사람 = [['정하린', 5], ['김정원', 4], ['박하늘', 3], ['오세린', 3], ['윤도경', 2], ['서지안', 2], ['이수목', 2], ['강나래', 1], ['최다온', 1], ['한별', 1], ['심폴손', 2], ['없음손', 2]];
  const 줄들 = []; let n = 0;
  const 날 = (d) => ZG.계산.날짜문자(new Date(+오늘.slice(0, 4), +오늘.slice(5, 7) - 1, +오늘.slice(8, 10) - d).getTime());
  사람.forEach((s, i) => {
    for (let k = 0; k < s[1]; k++) {
      n++;
      const m = s[0] === '심폴손' ? '심폴' : 마[(i + k * 3) % 마.length], p = 품[(n * 5) % 품.length];
      const r = { id: 'od_t' + n, 주문일: 날(i * 3 + k * 40), 판매처: m, 품목코드: s[0] === '없음손' ? 'NOC99-10' : p.품목코드, 유통명: p.유통명,
        주문수량: 1 + n % 2, 옵션입수: 1, 단가: 12000 + (n % 4) * 3000, 수령인: s[0], 주문번호: 'N' + n, 묶음id: 'B' + n,
        우편번호: String(10000 + i * 7), 수령인전화: '010-5555-' + String(1000 + i), 수령인주소: '서울시 ' + s[0] + '로 ' + (k === 0 ? 9 : 1) + '길', 출처: '수동', 등록일시: Date.now() - n };
      if (m !== '심폴') { r.원본 = new Array(27).fill(''); r.원본[26] = m === '쿠팡' ? '무료' : '3000'; }
      r.묶음키 = ZG.주문자료.묶음키(r);
      줄들.push(r);
    }
  });
  줄들.push(Object.assign({}, 줄들[0], { id: 'od_x', 수령인: '', 우편번호: '', 수령인주소: '', 주문번호: 'NX', 묶음키: '' }));   // 못 세는 줄
  저.전체쓰기(저.키.주문, 줄들);
  return 줄들.length;
}"""

def 새쪽(브, 폭, 높):
    쪽 = 브.new_page(viewport={'width': 폭, 'height': 높})
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.add_init_script(심기)
    for _ in range(4):   # 00-새판 새로고침 경합(옛 동작) — 스크립트가 반쯤 실리면 다시 연다
        오류.clear(); 쪽.goto(주소); 쪽.wait_for_timeout(2000); 쪽.wait_for_load_state('networkidle')
        if 쪽.evaluate("() => !!(window.ZG && ZG.재구매 && ZG.재구매화면 && ZG.주문 && ZG.로젠파일 && ZG.실적이익화면)"): break
    return 쪽, 오류

def 화면숫자(쪽):
    return 쪽.evaluate("""() => { const 결 = ZG.재구매.읽어모으기(); return [결.손님수, 결.재구매수, 결.못셈]; }""")

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        쪽, 오류 = 새쪽(브, 1440, 900)

        print('\n① 설계 예시 6줄')
        r = 쪽.evaluate(예시)
        본다('손님 2명 (박다는 서비스뿐이라 안 셈)', r['손님수'] == 2, r['손님수'])
        본다('김가 2회 = 재구매 · 같은 날 두 주문은 1회 · 「김 가」「11-111」도 같은 손님', r['김'] and r['김']['회차'] == 2 and r['손님들'] == 1, r['김'])
        본다('이나 1회 (취소 날 뺌) · 분포 1회 1 · 2회 1', r['분포'] == [1, 1, 0, 0, 0], r['분포'])
        본다('재구매율 50%', r['재구매수'] == 1 and r['율'] == 0.5, [r['재구매수'], r['율']])
        본다('첫 마켓 쿠팡 1명 중 1 (100%) · 다른 마켓으로 1', r['쿠팡']['첫'] == 1 and r['쿠팡']['재'] == 1 and r['쿠팡']['율'] == 1 and r['쿠팡']['나감'] == 1 and r['쿠팡']['같은'] == 0, r['쿠팡'])
        본다('스마트스토어 1명 중 0 · 다른 마켓에서 1', r['스스']['첫'] == 1 and r['스스']['재'] == 0 and r['스스']['율'] == 0 and r['스스']['들어옴'] == 1, r['스스'])
        본다('심폴(서비스뿐)은 마켓표에 없음', r['심폴'] is None)
        본다('김가 주소 = 마지막 수령지(10/5 줄) · 최근 10-05', r['김']['주소'] == r['김주소'] and r['김']['최근'] == '2026-10-05', r['김'])
        본다('김가 첫마켓 쿠팡 · 누적 매출 30,000', r['김']['첫마켓'] == '쿠팡' and r['김']['매출'] == 30000, r['김'])
        본다('합계 줄 = 마켓 합', r['합']['첫'] == 2 and r['합']['재'] == 1 and r['합']['율'] == 0.5, r['합'])

        print('\n② ★ 송장 (08i 가 08a 를 부른다)')
        s = 쪽.evaluate(별)
        본다('첫 주문 ★ 없음', s['첫날'] == 0, s)
        본다('반품만·서비스만 있는 날은 안 셈 → 10/5 송장 ★2', s['닷새'] == 2, s)
        본다('송장 주문일까지만 센다 → 10/9 송장 ★3 (10/5 송장은 그 뒤 주문 안 셈)', s['아흐레'] == 3, s)
        본다('우편번호 없으면 주소 글자(공백·- 빼고)로 같은 손님 → ★2', s['주소손님'] == 2, s)

        print('\n③ 기간 칩과 무관 (누적)')
        쪽.evaluate(화면줄)
        쪽.evaluate("() => ZG.주문.다시그리기()"); 쪽.wait_for_timeout(300)
        쪽.click('.pc-tabs button:has-text("주문실적")'); 쪽.wait_for_timeout(700)
        기대 = 화면숫자(쪽)
        def PC글(): return 쪽.eval_on_selector('.주문실적 .재구매 .big3', 'e => e.textContent')
        앞글, 앞칸 = PC글(), 쪽.eval_on_selector('.주문실적 .stat.five > div:last-child', 'e => e.textContent')
        쪽.click('.주문실적 .기간줄 .fchip:has-text("이번 주")'); 쪽.wait_for_timeout(600)
        본다('「이번 주」로 바꿔도 재구매 숫자 같음', PC글() == 앞글 and 쪽.eval_on_selector('.주문실적 .stat.five > div:last-child', 'e => e.textContent') == 앞칸, [앞글, PC글()])
        쪽.click('.주문실적 .기간줄 .fchip:has-text("올해")'); 쪽.wait_for_timeout(600)
        본다('「올해」도 같음', PC글() == 앞글)

        print('\n④ PC 화면')
        본다('요약 다섯째 칸 = 재구매율 · 누적 배지', 쪽.locator('.주문실적 .stat.five > div').count() == 5 and '재구매율누적' in 앞칸, 앞칸)
        본다('전체 손님·재구매 손님 = 계산 (가짜 12명 · 재구매 9명)', 기대[:2] == [12, 9] and ('12명' in 앞글 and '9명' in 앞글), [기대, 앞글])
        본다('못 세는 줄 1', 기대[2] == 1 and '못 세는 줄 1' in 쪽.eval_on_selector('.주문실적 .재구매 h3', 'e => e.textContent'))
        본다('구매 횟수별 5줄', 쪽.locator('.주문실적 .재구매 .dr').count() == 5)
        본다('이사 표·배지 없음 · A/B 토글 없음', '이사' not in 쪽.eval_on_selector('.주문실적', 'e => e.textContent')
             and 쪽.locator('.주문실적 .재구매마켓 .mini-tg').count() == 0)
        행 = 쪽.locator('.주문실적 .재구매마켓 tr').count()
        본다('마켓별 재구매율 표 — 마켓 줄 + 합계', 행 >= 4 and 쪽.locator('.주문실적 .재구매마켓 tr.tot').count() == 1, 행)
        이름들 = 쪽.eval_on_selector_all('.주문실적 .재구매손님 td.pn', 'els => els.map(e => e.textContent)')
        본다('손님 표 — 이름 안 가림 · 구매횟수순 첫 줄 정하린 5회', 이름들[:1] == ['정하린'] and '*' not in ''.join(이름들), 이름들)
        주소들 = 쪽.eval_on_selector_all('.주문실적 .재구매손님 td.addr', 'els => els.map(e => e.textContent)')
        본다('주소 칸 = 마지막 수령지(9길)', 주소들 and all(a.endswith('9길') for a in 주소들), 주소들[:3])
        익 = 쪽.eval_on_selector_all('.주문실적 .재구매손님 tr', "els => els.slice(1).map(e => [e.querySelector('td.pn').textContent, e.lastChild.textContent, e.lastChild.className])")
        심 = [x for x in 익 if x[0] == '심폴손']; 없 = [x for x in 익 if x[0] == '없음손']
        본다('심폴 손님 이익 ≈ (잠정)', 심 and 심[0][1].startswith('≈ ') and 'prov' in 심[0][2], 심)
        본다('매입가 없는 손님 이익 —', 없 and 없[0][1] == '—', 없)
        합 = 쪽.evaluate("""() => { const 결 = ZG.재구매.읽어모으기(); const 손 = 결.손님들.filter(s => s.이름 === '정하린')[0];
          const 익 = ZG.주문실적.모으기(ZG.저장소.읽기(ZG.저장소.키.주문).filter(r => r.수령인 === '정하린'), { 부터: '2000-01-01', 까지: ZG.ui.오늘문자(), 단위: '월', 이익: ZG.실적이익.조건읽기() }).이익.합계.이익;
          return [Math.round(손.이익), 익]; }""")
        본다('손님 이익 = 27단계 이익을 그 손님 송장만 모은 값', 합[0] == 합[1], 합)
        쪽.click('.주문실적 .재구매손님 .mini-tg button:has-text("누적매출순")'); 쪽.wait_for_timeout(200)
        매 = 쪽.eval_on_selector_all('.주문실적 .재구매손님 tr', "els => els.slice(1).map(e => +e.children[4].textContent.replace(/,/g, ''))")
        본다('누적매출순', 매 == sorted(매, reverse=True) and len(매) == 9, 매)
        쪽.click('.주문실적 .재구매손님 .mini-tg button:has-text("최근구매순")'); 쪽.wait_for_timeout(200)
        최 = 쪽.eval_on_selector_all('.주문실적 .재구매손님 tr', "els => els.slice(1).map(e => e.children[5].textContent)")
        본다('최근구매순', 최 == sorted(최, reverse=True), 최)
        쪽.click('.주문실적 .재구매손님 .mini-tg button:has-text("이익순")'); 쪽.wait_for_timeout(200)
        끝 = 쪽.eval_on_selector_all('.주문실적 .재구매손님 tr', "els => els.slice(1).map(e => e.lastChild.textContent)")
        본다('이익순 — 이익 모르는 손님은 맨 아래', 끝[-1] == '—', 끝)
        쪽.click('.주문실적 .재구매손님 .mini-tg button:has-text("구매횟수순")'); 쪽.wait_for_timeout(200)
        쪽.locator('.주문실적 .재구매').scroll_into_view_if_needed()
        쪽.screenshot(path=str(샷 / 'PC-재구매.png'), full_page=True)
        본다('PC 누른 뒤 콘솔 오류 0', not 오류, 오류[:3])

        print('\n⑤ 폰 화면')
        폰, 폰오류 = 새쪽(브, 390, 844)
        폰.evaluate(화면줄)
        폰.evaluate("() => ZG.주문.다시그리기()"); 폰.wait_for_timeout(300)
        폰.click('.subtabs button:has-text("실적")'); 폰.wait_for_timeout(700)
        카 = 폰.eval_on_selector('.주문실적 .sumcard.재구매', 'e => e.textContent')
        본다('폰 요약카드 — 누적 · 75.0% · 12명 · 9명 · 못 세는 줄 1', '누적' in 카 and '75.0%' in 카 and '12명' in 카 and '9명' in 카 and '못 세는 줄 1' in 카, 카)
        본다('폰 구매 횟수별 5줄 · 접힌 칸 둘', 폰.locator('.주문실적 .재구매횟수 .dr').count() == 5 and 폰.locator('.주문실적 .재구매접기').count() == 2)
        폰.click('.주문실적 .재구매접기 >> nth=0'); 폰.wait_for_timeout(400)
        본다('마켓별 펼침', 폰.locator('.주문실적 .foldbody.open .재구매마켓 .mr').count() >= 3)
        폰.click('.주문실적 .재구매접기 >> nth=1'); 폰.wait_for_timeout(400)
        본다('재구매 손님 카드 9장 · 주소 줄', 폰.locator('.주문실적 .재구매손님칸 .pk').count() == 9 and 폰.locator('.주문실적 .재구매손님칸 .pk .t3').count() == 9)
        폰.click('.주문실적 .재구매손님칸 .fchip:has-text("누적매출순")'); 폰.wait_for_timeout(300)
        본다('폰 정렬 눌러도 펼침 유지', 폰.locator('.주문실적 .재구매손님칸 .fchip.on').inner_text() == '누적매출순' and 폰.locator('.주문실적 .foldbody.open').count() == 2)
        폰.locator('.주문실적 .sumcard.재구매').scroll_into_view_if_needed()
        폰.screenshot(path=str(샷 / '폰-1-요약.png'), full_page=False)
        폰.locator('.주문실적 .재구매마켓').scroll_into_view_if_needed()
        폰.screenshot(path=str(샷 / '폰-2-마켓.png'), full_page=False)
        폰.locator('.주문실적 .재구매손님칸').scroll_into_view_if_needed()
        폰.screenshot(path=str(샷 / '폰-3-손님.png'), full_page=False)
        본다('폰 누른 뒤 콘솔 오류 0', not 폰오류, 폰오류[:3])

        print('\n⑥ 실데이터 대조 (백업 읽기만 · ★ 회귀)')
        if 백업.exists():
            줄들 = [x['내용'] for x in json.loads(백업.read_text(encoding='utf-8')) if not x.get('삭제됨')]
            d = 쪽.evaluate(옛판대조, 줄들)
            본다('우편번호 있는 손님은 59d6ba1 판과 산 날이 하나도 안 다름', d['같은'] and d['옛손님'] > 1000, d['옛손님'])
            본다('새로 세는 손님은 우편번호 없는 주소 손님뿐', d['새만다주소'], d['새만'])
            본다('59d6ba1 ★ 그대로 — 임귀희 2 · 이순규 6 · 조미화 3', [d['임귀희'], d['이순규'], d['조미화']] == [2, 6, 3], [d['임귀희'], d['이순규'], d['조미화']])
            본다('실데이터 NaN 없음', not d['NaN'])
            print('    실데이터(10/21 백업) 손님 %d · 재구매 %d · %.1f%% · 분포 %s · 못셈 %d · 이익 있는 재구매 손님 %d' % (
                d['손님수'], d['재구매수'], d['율'] * 100, d['분포'], d['못셈'], d['이익손님']))
            print('    첫 마켓', d['마켓'])
        else:
            print('    (백업 없음 — 건너뜀)')
        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
