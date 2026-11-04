# -*- coding: utf-8 -*-
# 41 코드 최적화(11/04) — 고치기 전/후가 같은 화면·같은 결과인지 맞댄다
#   python3 최적화-시험.py <v3 뿌리> <포트> <결과폴더>     (전: HEAD 사본 · 후: 지금 v3)
#   python3 최적화-시험.py 비교 <전 결과폴더> <후 결과폴더>
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막는다. 실서버 안 씀
import json, pathlib, re, subprocess, sys, time

if sys.argv[1] == '비교':
    from PIL import Image, ImageChops
    전, 후 = pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
    a, b = json.loads((전 / '결과.json').read_text()), json.loads((후 / '결과.json').read_text())
    맞음 = 틀림 = 0
    for k in sorted(set(a) | set(b)):
        x, y = a.get(k), b.get(k)
        같다 = x == y
        if k.startswith('그림:') and x and y:
            d = ImageChops.difference(Image.open(전 / x).convert('RGB'), Image.open(후 / y).convert('RGB')).getbbox() \
                if Image.open(전 / x).size == Image.open(후 / y).size else 'size'
            같다 = d is None
            x, y = x, ('같음' if 같다 else '다름 ' + str(d))
        if 같다: 맞음 += 1
        else:
            틀림 += 1
            print('  XX', k, '\n     전:', str(x)[:300], '\n     후:', str(y)[:300])
    print(f'전/후 같음 {맞음}/{맞음 + 틀림}')
    sys.exit(0 if 틀림 == 0 else 1)

from playwright.sync_api import sync_playwright
뿌리, 포트, 출 = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
출.mkdir(parents=True, exist_ok=True)
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과, 오류 = {}, {}
쪽들 = ['index.html', '주문.html', '메모.html', '소싱.html', '업체.html', '지시.html', '현황판.html', '이사.html']
탭고르개 = '.pc-tabs button, .toggle button, .stabs button, .subtabs button'
글뽑기 = """() => document.body.innerText.replace(/\\d{1,2}:\\d{2}(:\\d{2})?/g, 'HH:MM').replace(/\\d+초 전|\\d+분 전/g, 'N전')"""

def 새쪽(브, 폰):
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                     device_scale_factor=1, service_workers='block', reduced_motion='reduce')
    쪽._오류 = []
    쪽.on('pageerror', lambda e: 쪽._오류.append('pageerror ' + str(e)))
    쪽.on('response', lambda r: 쪽._오류.append(f'{r.status} {r.url}') if r.status >= 400 and 'localhost' in r.url else None)
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if 'Failed to load resource: the server responded' not in m.text and m.type == 'error' and 'jsdelivr' not in m.text
          and 'ERR_FAILED' not in m.text and 'supabase' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기)
    return 쪽

def 창(쪽):
    쪽.wait_for_timeout(300)
    return 쪽.locator('.askbox').first.inner_text(timeout=2000).replace('\n', ' ') if 쪽.locator('.askbox').count() else '없음'

def 찍기(쪽, 이름):
    쪽.wait_for_timeout(700)
    결과['글:' + 이름] = 쪽.evaluate(글뽑기)
    결과['수:' + 이름] = 쪽.evaluate("() => [...document.querySelectorAll('*')].filter(e => e.tagName !== 'SCRIPT').length")
    파일 = re.sub(r'[^\w가-힣.-]', '_', 이름) + '.png'
    쪽.screenshot(path=str(출 / 파일), full_page=False)
    결과['그림:' + 이름] = 파일

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', 포트, '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주 = f'http://localhost:{포트}/'
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        # ① 화면 8개 × PC·폰 — 첫 화면 + 탭마다
        for 폰 in (False, True):
            for h in 쪽들:
                쪽 = 새쪽(브, 폰); 틀 = ('폰' if 폰 else 'PC') + ':' + h
                쪽.goto(주 + h); 쪽.wait_for_timeout(2500)
                찍기(쪽, 틀)
                n = 쪽.locator(탭고르개).count()
                for i in range(min(n, 12)):
                    탭 = 쪽.locator(탭고르개).nth(i)
                    if not 탭.is_visible(): continue
                    글 = (탭.inner_text() or '').strip().replace('\n', ' ')[:12]
                    탭.click(); 찍기(쪽, f'{틀}:탭{i}:{글}')
                오류[틀] = 쪽._오류; 쪽.close()

        # ② 메모 체크 — 밀어서 단추 내기 (17c → 04 공통 쓸기)
        쪽 = 새쪽(브, True); 쪽.goto(주 + '메모.html'); 쪽.wait_for_timeout(2500)
        쪽.evaluate("() => { ZG.체크.넣기('시험 할일', '상세 글'); ZG.메모앱.다시그리기(); }")
        쪽.wait_for_timeout(400)
        카 = 쪽.locator('.ckcard').filter(has_text='시험 할일').first
        bb = 카.bounding_box()
        결과['체크:단추그림수'] = 쪽.locator('.ckacts').first.evaluate("e => e.querySelectorAll('svg').length + '|' + e.innerText.replace(/\\s+/g,' ')")
        쪽.mouse.move(bb['x'] + 300, bb['y'] + 20); 쪽.mouse.down()
        for dx in range(0, 200, 20): 쪽.mouse.move(bb['x'] + 300 - dx, bb['y'] + 22)
        쪽.mouse.up(); 쪽.wait_for_timeout(300)
        결과['체크:민뒤'] = 카.evaluate('e => e.style.transform')
        카.click(); 쪽.wait_for_timeout(200)
        결과['체크:누르면닫힘'] = 카.evaluate("e => e.style.transform + '|' + e.classList.contains('open')")
        카.click(); 쪽.wait_for_timeout(200)
        결과['체크:한번더누르면펼침'] = 카.evaluate("e => e.classList.contains('open')")
        # 밀고 삭제
        쪽.mouse.move(bb['x'] + 300, bb['y'] + 20); 쪽.mouse.down()
        for dx in range(0, 200, 20): 쪽.mouse.move(bb['x'] + 300 - dx, bb['y'] + 22)
        쪽.mouse.up(); 쪽.wait_for_timeout(300)
        쪽.locator('.ckrow').filter(has_text='시험 할일').locator('.ckacts .del').click(timeout=3000)
        결과['체크:삭제확인창'] = 창(쪽)
        if 쪽.locator('.askbox').count(): 쪽.locator('.askbox button', has_text='지우기').click(); 쪽.wait_for_timeout(400)
        결과['체크:지운뒤남은수'] = 쪽.locator('.ckcard').filter(has_text='시험 할일').count()
        찍기(쪽, '체크:끝'); 오류['체크'] = 쪽._오류; 쪽.close()

        # ③ 주문 고객 — 견적 만들기·메모 지우기 (16c 가 16b 것을 쓴다) · PC·폰
        for 폰 in (False, True):
            틀 = '고객' + ('폰' if 폰 else 'PC')
            쪽 = 새쪽(브, 폰); 쪽.goto(주 + '주문.html'); 쪽.wait_for_timeout(2500)
            키 = 쪽.evaluate("""(폰) => {
              ZG.고객자료.손등록추가({ 이름: '김시험', 전화: '010-1111-2222', 주소: '서울시 시험로 1', 메모: '첫 메모' });
              ZG.견적탭.탭으로('고객');
              const g = ZG.고객자료.목록().find(g => g.이름 === '김시험');
              const 모 = 폰 ? ZG.고객폰 : ZG.고객PC; 모.상태.키 = g.키; 모.상태.뷰 = '상세';
              ZG.주문.다시그리기(); return g.키; }""", 폰)
            쪽.wait_for_timeout(500); 찍기(쪽, 틀 + ':상세')
            쪽.locator('button', has_text='견적요청').first.click(timeout=3000)
            결과[틀 + ':견적창'] = 창(쪽)
            쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(300)
            지움 = 쪽.locator('button[aria-label$="메모 지우기"]')
            결과[틀 + ':삭제단추수'] = 지움.count()
            if 지움.count():
                지움.first.click(timeout=3000)
                결과[틀 + ':메모삭제창'] = 창(쪽)
                if 쪽.locator('.askbox').count():
                    쪽.locator('.askbox button', has_text='삭제').click(); 쪽.wait_for_timeout(400)
            결과[틀 + ':남은메모'] = 쪽.evaluate("(k) => JSON.stringify((ZG.저장소.읽기(ZG.저장소.키.고객).find(c => c.id === k) || {}).메모들 || null)", 키)
            결과[틀 + ':수동주문단추'] = 쪽.locator('button', has_text='수동주문').count()
            if 쪽.locator('button', has_text='수동주문').count(): 쪽.locator('button', has_text='수동주문').first.click(timeout=3000); 쪽.wait_for_timeout(500)
            결과[틀 + ':수동주문채울값'] = 쪽.evaluate("() => [...document.querySelectorAll('input,textarea')].filter(i => /김시험|010-1111-2222|시험로/.test(i.value)).length")
            찍기(쪽, 틀 + ':수동주문'); 오류[틀] = 쪽._오류; 쪽.close()

        # ④ 입고 저장 뒤 「상세페이지 작업 대기」 갱신 길 (05d 내역다시)
        쪽 = 새쪽(브, False); 쪽.goto(주 + 'index.html'); 쪽.wait_for_timeout(2500)
        결과['입고:내역다시'] = 쪽.evaluate("""() => { let n = 0; const 옛 = ZG.사진수집.대기다시;
            ZG.사진수집.대기다시 = function () { n++; return 옛.apply(this, arguments); };
            ZG.입고내역.내역다시(); ZG.사진수집.대기다시 = 옛; return n; }""")
        # ⑤ 옮긴 공통 함수 — 제때(10초 끊기)·그림읽기
        결과['공통:제때통과'] = 쪽.evaluate("() => (ZG.ui.제때 ? ZG.ui.제때(Promise.resolve(7)) : Promise.resolve(7))")
        오류['입고'] = 쪽._오류; 쪽.close()
        브.close()
finally:
    서버.terminate(); 서버.wait()

결과['오류'] = 오류
(출 / '결과.json').write_text(json.dumps(결과, ensure_ascii=False, indent=1))
총 = sum(len(v) for v in 오류.values())
print('콘솔 빨간 에러', 총, {k: v for k, v in 오류.items() if v})
print('찍은 화면', sum(1 for k in 결과 if k.startswith('그림:')))
