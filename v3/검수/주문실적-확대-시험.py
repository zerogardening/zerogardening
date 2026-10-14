# -*- coding: utf-8 -*-
# 주문실적 「매출 추이」 확대·이동 검수 (우람님 10/14 — 주식 차트처럼)
#   python3 v3/검수/주문실적-확대-시험.py [실데이터사본폴더]   ← playwright 필요
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 서버에 아무것도 안 쓴다.
#    실데이터 사본을 주면 로컬 브라우저 저장소에만 심어 「올해」 일간으로 한 번 더 돈다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
샷 = 뿌리 / '검수' / '21-주문실적'
샷.mkdir(parents=True, exist_ok=True)
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
사본 = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8782', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8782/%EC%A3%BC%EB%AC%B8.html'

# 최근 30일에 고루 — 날마다 값이 달라야 세로 눈금 변화가 보인다
화면줄 = """() => {
  const 저 = ZG.저장소, 오늘 = ZG.ui.오늘문자();
  ZG.시드.심기();
  const 품 = 저.품목들().slice(0, 12), 마 = ['카페24','쿠팡','스마트스토어','G마켓','11번가','심폴','문자'];
  const 줄들 = []; let n = 0;
  for (let d = 0; d < 30; d++) {
    const 날 = ZG.계산.날짜문자(new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) - d).getTime());
    for (let k = 0; k < 1 + (d * 7) % 9 + (d === 3 ? 25 : 0); k++) {
      n++;
      const p = 품[(n * 5) % 품.length];
      const r = { id: 'od_z' + n, 주문일: 날, 판매처: 마[(n * 3) % 마.length], 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '',
        주문수량: 1 + n % 4, 옵션입수: 1, 단가: 3000 + (n % 5) * 1500, 수령인: '갑' + n, 수령인전화: '010-' + String(1000 + n).slice(-4) + '-1234',
        수령인주소: '서울시 ' + n + '길', 출처: '수동', 등록일시: Date.now() - d * 86400000 };
      r.묶음키 = ZG.주문자료.묶음키(r);
      줄들.push(r);
    }
  }
  저.전체쓰기(저.키.주문, 줄들);
}"""

실심기 = """(주) => { ZG.시드.심기(); ZG.저장소.전체쓰기(ZG.저장소.키.주문, JSON.parse(주)); }"""

# 지금 그려진 추이 — 보이는 칸 번호·눈금 꼭대기·달 글자·말풍선
읽기 = """() => {
  const svg = document.querySelector('.주문실적 .추이 svg'), r = svg.getBoundingClientRect();
  const 칸 = [...svg.querySelectorAll('rect[data-i]')].map(e => +e.getAttribute('data-i'));
  const 눈 = [...svg.querySelectorAll('text[text-anchor="end"]')].map(e => e.textContent);
  const 달 = [...svg.querySelectorAll('text[text-anchor="start"]')].map(e => e.textContent);
  const 판 = document.querySelector('.주문실적 .추이판'), 틀 = svg._틀, 배 = r.width / 틀.W;
  const 가운데 = r.left + (틀.왼 + 틀.안폭 / 2) * 배;
  const 밑 = document.elementFromPoint(가운데, r.top + r.height / 2);
  return { 수: 칸.length, 첫: Math.min(...칸), 끝: Math.max(...칸), 꼭대기: 눈[눈.length - 1], 달,
           팁: !document.querySelector('.주문실적 .tip').hidden, 확대: 판.classList.contains('확대'),
           x: r.left, y: r.top, w: r.width, h: r.height, 왼: r.left + 틀.왼 * 배, 안폭: 틀.안폭 * 배,
           가운데칸: 밑 && 밑.getAttribute('data-i'), 배율: visualViewport.scale, 전체: ZG.주문실적화면.상태 && document.querySelectorAll('.주문실적 .추이 svg').length };
}"""

# 보이는 칸들 기준 세로 눈금이 맞는가 — 08t 눈금폭으로 다시 계산
눈금맞나 = """() => {
  const svg = document.querySelector('.주문실적 .추이 svg');
  const s = ZG.주문실적화면.상태, 결 = ZG.주문실적.읽어모으기({ 부터: s.부터, 까지: s.까지, 단위: s.단위 });
  const 칸 = [...svg.querySelectorAll('rect[data-i]')].map(e => +e.getAttribute('data-i'));
  const 최대 = Math.max(0, ...칸.map(i => s.지표 === '건수' ? 결.칸들[i].건수 : 결.칸들[i].매출));
  const 폭 = ZG.주문실적차트.눈금폭(최대), 꼭 = 폭 * Math.max(1, Math.ceil(최대 / 폭));
  const 글 = [...svg.querySelectorAll('text[text-anchor="end"]')].map(e => e.textContent).pop();
  const 첫달 = Number(결.칸들[Math.min(...칸)].부터.slice(5, 7)) + '월';
  return { 꼭, 글, 첫달 };
}"""

def 새쪽(브, 폭, 높, 폰):
    맥 = 브.new_context(viewport={'width': 폭, 'height': 높}, has_touch=폰, is_mobile=폰, device_scale_factor=2 if 폰 else 1)
    쪽 = 맥.new_page()
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소); 쪽.wait_for_timeout(2000)
    return 쪽, 오류, 맥.new_cdp_session(쪽)

def 손(cdp, 종류, 점들):
    cdp.send('Input.dispatchTouchEvent', {'type': 종류, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(점들)]})

def 핀치(쪽, cdp, cx, cy, 처음, 나중, 걸음=8):
    손(cdp, 'touchStart', [(cx - 처음, cy), (cx + 처음, cy)])
    for k in range(1, 걸음 + 1):
        d = 처음 + (나중 - 처음) * k / 걸음
        손(cdp, 'touchMove', [(cx - d, cy), (cx + d, cy)]); 쪽.wait_for_timeout(20)
    손(cdp, 'touchEnd', []); 쪽.wait_for_timeout(120)

def 끌기(쪽, cdp, x, y, dx, dy, 걸음=8):
    손(cdp, 'touchStart', [(x, y)])
    for k in range(1, 걸음 + 1):
        손(cdp, 'touchMove', [(x + dx * k / 걸음, y + dy * k / 걸음)]); 쪽.wait_for_timeout(20)
    손(cdp, 'touchEnd', []); 쪽.wait_for_timeout(120)

def 톡(쪽, cdp, x, y, 쉼=80):
    손(cdp, 'touchStart', [(x, y)]); 손(cdp, 'touchEnd', []); 쪽.wait_for_timeout(쉼)

def 폰시험(브, 이름, 심기함수, 인자, 기간칩=None):
    폰, 오류, cdp = 새쪽(브, 390, 844, True)
    폰.evaluate(심기함수, 인자) if 인자 is not None else 폰.evaluate(심기함수)
    폰.evaluate("() => ZG.주문.다시그리기()"); 폰.wait_for_timeout(300)
    폰.click('.subtabs button:has-text("실적")'); 폰.wait_for_timeout(400)
    if 기간칩: 폰.click('.hscroll .fchip:has-text("%s")' % 기간칩); 폰.wait_for_timeout(500)
    폰.locator('.주문실적 .추이').scroll_into_view_if_needed(); 폰.wait_for_timeout(200)
    a = 폰.evaluate(읽기); n = a['수']
    본다(이름 + ' 처음은 전체', not a['확대'] and a['첫'] == 0 and a['끝'] == n - 1, n)
    cx, cy = a['왼'] + a['안폭'] * 0.6, a['y'] + a['h'] * 0.5
    def 칸밑(x):   # 그 화면 x 아래 칸 번호(소수) — 확대 중심이 손가락 아래에 머무는지 본다
        b = 폰.evaluate(읽기)
        창수 = (폰.evaluate("() => { const s = document.querySelector('.주문실적 .추이 svg'); return s._틀.안폭 / s._틀.칸너비; }"))
        첫x = 폰.evaluate("() => { const s = document.querySelector('.주문실적 .추이 svg'), r = s.getBoundingClientRect(), 틀 = s._틀, 배 = r.width / 틀.W; const 점 = s._점; for (let i = 0; i < 점.length; i++) if (점[i]) return [i, r.left + 점[i].x * 배]; }")
        return 첫x[0] + (x - 첫x[1]) / (b['안폭'] / 창수)
    전 = 칸밑(cx)
    핀치(폰, cdp, cx, cy, 30, 100)
    b = 폰.evaluate(읽기)
    본다(이름 + ' 벌리기 → 보이는 칸 줄고 막대 커짐', b['확대'] and 5 <= b['수'] < n, [n, b['수'], b['첫'], b['끝']])
    후 = 칸밑(cx)
    본다(이름 + ' 확대 중심 = 손가락 자리', abs(전 - 후) < 0.6, [round(전, 2), round(후, 2)])
    본다(이름 + ' 브라우저 확대 아님', b['배율'] == 1, b['배율'])
    e = 폰.evaluate(눈금맞나)
    본다(이름 + ' 세로 눈금 = 보이는 칸 최대 기준', e['글'] == ZGTick(e['꼭']), e)
    본다(이름 + ' 보이는 첫 칸에 달 이름', b['달'][:1] == [e['첫달']], [b['달'], e['첫달']])
    폰.screenshot(path=str(샷 / ('폰-확대-%s-1-벌림.png' % 이름)))
    # 한 손가락 가로 끌기 — 오른쪽으로 끌면 앞(옛날) 칸이 보인다
    끌기(폰, cdp, a['왼'] + 20, cy, 120, 0)
    c = 폰.evaluate(읽기)
    본다(이름 + ' 오른쪽 끌기 → 앞 칸으로 이동', c['첫'] < b['첫'] or c['첫'] == 0, [b['첫'], c['첫']])
    본다(이름 + ' 끌어도 말풍선 안 뜸', not c['팁'])
    끌기(폰, cdp, a['왼'] + 260, cy, -240, 0)
    d = 폰.evaluate(읽기)
    본다(이름 + ' 왼쪽 끌기 → 뒤 칸으로', d['첫'] > c['첫'], [c['첫'], d['첫']])
    # 세로 한 손가락은 차트가 안 먹는다
    전창 = (d['첫'], d['끝'], d['수'])
    끌기(폰, cdp, cx, cy, 0, -150)
    v = 폰.evaluate(읽기)
    본다(이름 + ' 세로 끌기는 차트 그대로', (v['첫'], v['끝'], v['수']) == 전창, [전창, (v['첫'], v['끝'], v['수'])])
    폰.locator('.주문실적 .추이').scroll_into_view_if_needed(); 폰.wait_for_timeout(200)
    v = 폰.evaluate(읽기); cy = v['y'] + v['h'] * 0.5
    # 톡 = 말풍선
    톡(폰, cdp, v['왼'] + v['안폭'] * 0.5, cy, 400)
    t = 폰.evaluate(읽기)
    본다(이름 + ' 톡 → 말풍선', t['팁'] and t['수'] == v['수'])
    폰.screenshot(path=str(샷 / ('폰-확대-%s-2-말풍선.png' % 이름)))
    # 지표를 바꿔도 범위는 그대로
    폰.click('.주문실적 .추이 .mini-tg button:has-text("건수")'); 폰.wait_for_timeout(300)
    w = 폰.evaluate(읽기)
    본다(이름 + ' 지표 바꿔도 범위 유지', (w['첫'], w['끝']) == (t['첫'], t['끝']) and w['확대'], [(t['첫'], t['끝']), (w['첫'], w['끝'])])
    e = 폰.evaluate(눈금맞나)
    본다(이름 + ' 건수 눈금도 보이는 칸 기준', e['글'] == ZGTick(e['꼭'], False), e)
    폰.click('.주문실적 .추이 .mini-tg button:has-text("매출")'); 폰.wait_for_timeout(300)
    # 가장 많이 벌리면 5칸에서 멈춘다
    w = 폰.evaluate(읽기); cy = w['y'] + w['h'] * 0.5
    for _ in range(3): 핀치(폰, cdp, w['왼'] + w['안폭'] * 0.5, cy, 20, 130)
    m = 폰.evaluate(읽기)
    본다(이름 + ' 최대 확대 = 5칸', 5 <= m['수'] <= 6 and abs(폰.evaluate("() => { const s = document.querySelector('.주문실적 .추이 svg'); return s._틀.안폭 / s._틀.칸너비; }") - 5) < 1e-6, m['수'])
    폰.screenshot(path=str(샷 / ('폰-확대-%s-3-최대.png' % 이름)))
    # 오므리기 → 넓어짐
    핀치(폰, cdp, w['왼'] + w['안폭'] * 0.5, cy, 120, 40)
    o = 폰.evaluate(읽기)
    본다(이름 + ' 오므리기 → 보이는 칸 늘어남', o['수'] > m['수'], [m['수'], o['수']])
    # 두 번 톡 → 처음 범위
    x2 = o['왼'] + o['안폭'] * 0.4
    톡(폰, cdp, x2, cy, 60); 톡(폰, cdp, x2, cy, 400)
    z = 폰.evaluate(읽기)
    본다(이름 + ' 두 번 톡 → 처음 범위', not z['확대'] and z['수'] == n and z['첫'] == 0 and not z['팁'], [z['수'], z['팁']])
    # 전체에서 오므리면 그대로
    핀치(폰, cdp, x2, cy, 120, 40)
    q = 폰.evaluate(읽기)
    본다(이름 + ' 전체에서 오므려도 전체', not q['확대'] and q['수'] == n)
    # 단위를 바꾸면 범위가 풀린다
    핀치(폰, cdp, x2, cy, 30, 110)
    폰.click('.주문실적 .단위줄 button:has-text("주간")'); 폰.wait_for_timeout(300)
    s = 폰.evaluate(읽기)
    본다(이름 + ' 단위 바꾸면 전체로', not s['확대'] and s['첫'] == 0)
    본다(이름 + ' 폰 콘솔 오류 0', not 오류, 오류[:3])
    폰.context.close()

def ZGTick(v, 돈=True):   # 08t 눈금글 과 같은 규칙
    if not 돈 or v < 10000: return format(int(v), ',')
    만 = v / 10000
    return ('%.1f' % 만 if 만 % 1 else str(int(만))) + '만'

def PC시험(브, 이름, 심기함수, 인자, 기간칩=None):
    pc, 오류, cdp = 새쪽(브, 1440, 900, False)
    pc.evaluate(심기함수, 인자) if 인자 is not None else pc.evaluate(심기함수)
    pc.evaluate("() => ZG.주문.다시그리기()"); pc.wait_for_timeout(300)
    pc.click('.pc-tabs button:has-text("주문실적")'); pc.wait_for_timeout(500)
    if 기간칩: pc.click('.기간줄 .fchip:has-text("%s")' % 기간칩); pc.wait_for_timeout(500)
    a = pc.evaluate(읽기); n = a['수']
    cx, cy = a['왼'] + a['안폭'] * 0.3, a['y'] + a['h'] * 0.5
    pc.mouse.move(cx, cy); pc.wait_for_timeout(150)
    본다(이름 + ' PC 올리면 말풍선', pc.evaluate(읽기)['팁'])
    for _ in range(4):
        cdp.send('Input.dispatchMouseEvent', {'type': 'mouseWheel', 'x': cx, 'y': cy, 'deltaX': 0, 'deltaY': -60, 'modifiers': 2})
        pc.wait_for_timeout(40)
    pc.wait_for_timeout(100)
    b = pc.evaluate(읽기)
    본다(이름 + ' PC ctrl+휠 → 확대', b['확대'] and 5 <= b['수'] < n, [n, b['수']])
    e = pc.evaluate(눈금맞나)
    본다(이름 + ' PC 세로 눈금 = 보이는 칸 기준', e['글'] == ZGTick(e['꼭']), e)
    cdp.send('Input.dispatchMouseEvent', {'type': 'mouseWheel', 'x': cx, 'y': cy, 'deltaX': 200, 'deltaY': 0, 'modifiers': 0})
    pc.wait_for_timeout(120)
    c = pc.evaluate(읽기)
    본다(이름 + ' PC 가로 휠 → 이동', c['첫'] > b['첫'] or c['끝'] == n - 1, [b['첫'], c['첫']])
    pc.mouse.move(cx, cy); pc.mouse.down(); pc.mouse.move(cx + 80, cy, steps=6); pc.mouse.move(cx + 260, cy, steps=6); pc.wait_for_timeout(60)
    끄는중팁 = pc.evaluate(읽기)['팁']
    pc.mouse.up(); pc.wait_for_timeout(150)
    d = pc.evaluate(읽기)
    본다(이름 + ' PC 끌기 → 이동, 끄는 동안 말풍선 없음', d['첫'] < c['첫'] and not 끄는중팁, [c['첫'], d['첫'], 끄는중팁])
    pc.mouse.move(cx + 40, cy + 5); pc.wait_for_timeout(150)
    본다(이름 + ' PC 확대 중에도 올리면 말풍선', pc.evaluate(읽기)['팁'])
    pc.screenshot(path=str(샷 / ('PC-확대-%s.png' % 이름)), clip={'x': 0, 'y': max(0, a['y'] - 70), 'width': 1440, 'height': a['h'] + 140})
    scroll0 = pc.evaluate("() => scrollY")
    pc.mouse.wheel(0, 300); pc.wait_for_timeout(200)
    본다(이름 + ' PC 세로 휠은 페이지 스크롤', pc.evaluate("() => scrollY") != scroll0 and pc.evaluate(읽기)['수'] == d['수'])
    pc.evaluate("() => scrollTo(0, 0)"); pc.wait_for_timeout(100)
    z = pc.evaluate(읽기)
    pc.mouse.dblclick(z['왼'] + z['안폭'] * 0.5, z['y'] + z['h'] * 0.5); pc.wait_for_timeout(150)
    z = pc.evaluate(읽기)
    본다(이름 + ' PC 더블클릭 → 처음으로', not z['확대'] and z['수'] == n)
    본다(이름 + ' PC 콘솔 오류 0', not 오류, 오류[:3])
    pc.context.close()

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        print('\n① 폰 — 가짜 30일')
        폰시험(브, '가짜', 화면줄, None)
        print('\n② PC — 가짜 30일')
        PC시험(브, '가짜', 화면줄, None)
        if 사본:
            주 = (사본 / 'zg.v3.주문.json').read_text(encoding='utf-8')
            print('\n③ 실데이터 사본 — 올해 일간 (로컬 저장소에만)')
            폰시험(브, '실', 실심기, 주, '올해')
            PC시험(브, '실', 실심기, 주, '올해')
        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
