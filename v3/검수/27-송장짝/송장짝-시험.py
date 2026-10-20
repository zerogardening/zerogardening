# -*- coding: utf-8 -*-
# 27단계 ⓐ 저장 실패·못 올라간 기록 빨간 띠 · ⓑ 로젠 S열 빈 줄 이름+전화 자동 짝 — python3 v3/검수/27-송장짝/송장짝-시험.py
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막는다. 실서버 안 씀
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '27-송장짝'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8798', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8798/%EC%A3%BC%EB%AC%B8.html'
상품 = 'http://localhost:8798/index.html'

# 주문 심기 — 이름·전화·나감 여부. 나감=True 면 출고를 미리 만들어 둔다
심기자료 = """() => {
  const 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  let i = 0; const ids = {};
  const 주문 = (키, 이름, 전화, 며칠, 나감) => {
    const p = ps[(i++) % ps.length];
    const o = { id: 'o_짝시험_' + 키, 주문번호: '9910' + String(i).padStart(2,'0'), 주문일: 날(며칠), 판매처: '수동', 출처: '수동',
      수령인: 이름, 수령인전화: 전화, 수령인주소: '서울시 시험로 ' + i, 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 주문수량: 1, 단가: 1000 };
    저.덧붙이기(저.키.주문, o); ids[키] = o.id;
    if (나감) 저.덧붙이기(저.키.출고, { id: 'out_짝시험_' + 키, 주문id: o.id, 품목코드: o.품목코드, 수량: 1, 출고일: 날(며칠) });
  };
  주문('형하', '김형하', '010-1234-5678', -3, false);
  주문('미연', '성미연', '01055551111', -3, false);
  주문('미연남', '성미연', '010-9999-2222', -1, false);       // 동명이인 — 전화가 달라 빠져야 한다
  주문('여럿1', '박여럿', '010-7777-1234', -5, false);
  주문('여럿2', '박여럿', '010-7777-1234', -2, false);        // 같은 사람 두 건 → 자동 말고 고르기
  주문('여럿남', '박여럿', '010-3333-0000', -1, false);       // 고르기에도 안 나와야 한다
  주문('빈칸', '이빈칸', '010-4444-1234', -2, false);         // 엑셀 전화 빈칸 → 이름만이라 자동 금지
  주문('별', '최별표', '010-6666-1234', -2, false);           // 엑셀 「*******」 → 자동 금지
  주문('공', '오공공', '010-8888-1234', -2, false);           // 엑셀 「010-****-****」 → 앞 3자리뿐이라 자동 금지
  주문('재옛', '정재주', '010-2020-3030', -20, true);         // 이미 나간 지난 주문
  주문('재새', '정재주', '010-2020-3030', -1, false);          // 재주문 — 이것에만 붙어야 한다
  주문('나감', '한나감', '010-1212-3434', -4, true);          // 나간 것뿐 → 그대로 확인 필요
  return ids;
}"""

# 로젠 출력완료 모양 — 머리글 두 줄(D=운송장번호 · S=주문번호), 수하인 G · 전화 J · 휴대폰 K
파일넣기 = """async () => {
  const 머리1 = []; 머리1[3] = '운송장번호'; 머리1[6] = '수하인'; 머리1[9] = '수하인'; 머리1[10] = '수하인'; 머리1[18] = '주문번호';
  const 머리2 = []; 머리2[3] = '운송장번호'; 머리2[6] = '이름'; 머리2[9] = '전화'; 머리2[10] = '휴대폰'; 머리2[11] = '박스\\n수량'; 머리2[18] = '주문번호';
  const 줄 = (송, 이름, j, k) => { const r = []; r[3] = 송; r[6] = 이름; r[9] = j; r[10] = k; r[11] = '1'; r[18] = ''; return r; };
  const 행들 = [['주문등록_출력(복수건)_출력완료'], 머리1, 머리2,
    줄('99000000001', '김형하', '', '010-1234-****'),
    줄('99000000002', '성미연', '0105-555-****', '010-5555-****'),
    줄('99000000003', '박여럿', '010-7777-****', '010-7777-****'),
    줄('99000000004', '이빈칸', '', ''),
    줄('99000000005', '최별표', '*******', '*******'),
    줄('99000000006', '오공공', '010-****-****', ''),
    줄('99000000007', '정재주', '', '010-2020-****'),
    줄('99000000008', '한나감', '010-1212-****', '010-1212-****')];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(행들), 'Sheet1');
  const 바 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const f = new File([바], '주문등록_출력완료.xlsx');
  const dt = new DataTransfer(); dt.items.add(f);
  document.querySelector('.drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}"""
출고 = "(id) => ZG.저장소.읽기(ZG.저장소.키.출고).filter(r => r.주문id === id && !String(r.id).startsWith('out_짝시험_')).map(r => r.운송장번호 || '?')"

def 새쪽(브, 폰, 넣기=None):
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                     device_scale_factor=2 if 폰 else 1, service_workers='block')
    쪽._오류 = []
    쪽.on('pageerror', lambda e: 쪽._오류.append(str(e)))
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기 + (넣기 or ''))
    return 쪽

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        print('\nⓑ 로젠 S열 빈 줄 — 이름+전화 자동 짝 (PC)')
        쪽 = 새쪽(브, False)
        쪽.goto(주소); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_function("() => window.ZG && ZG.배송완료창")
        쪽.evaluate("() => { ZG.시드.심기(); }")
        ids = 쪽.evaluate(심기자료)
        앞 = 쪽.evaluate("() => ['010-1234-****', '0502-4236-****', '*******', '010-****-****', '', '02-123-****', '010-1234-5678'].map(ZG.배송완료.전화앞)")
        본다('전화앞: 가림 * 앞 숫자 · 짧으면(010) 버림', 앞 == ['0101234', '05024236', '', '', '', '02123', '01012345678'], 앞)
        쪽.wait_for_function("() => window.XLSX")
        쪽.evaluate("() => ZG.배송완료창.열기()"); 쪽.wait_for_timeout(300)
        쪽.evaluate(파일넣기); 쪽.wait_for_timeout(800)
        판 = {r['수하인']: r for r in 쪽.evaluate("() => [...document.querySelectorAll('.needbox tr')].slice(1).map(tr => ({ 수하인: tr.cells[1].innerText.split('\\n')[0], 글: tr.innerText }))")}
        본다('김형하 — 휴대폰만(J 빈칸) 맞아 자동 연결', 쪽.evaluate(출고, ids['형하']) == ['99000000001'], 쪽.evaluate(출고, ids['형하']))
        본다('김형하 줄에 「이름·전화로 찾음」', '이름·전화로 찾음' in 판.get('김형하', {}).get('글', ''), 판.get('김형하', {}).get('글', '').replace('\n', ' / '))
        본다('성미연 — 전화 맞는 쪽만 연결 · 동명이인 안 깎임', 쪽.evaluate(출고, ids['미연']) == ['99000000002'] and 쪽.evaluate(출고, ids['미연남']) == [])
        본다('박여럿 — 두 건이 맞아 자동 안 함', 쪽.evaluate(출고, ids['여럿1']) == [] and 쪽.evaluate(출고, ids['여럿2']) == [])
        본다('이빈칸 — 전화 빈칸은 이름만이라 자동 안 함', 쪽.evaluate(출고, ids['빈칸']) == [])
        본다('최별표 — 「*******」 자동 안 함', 쪽.evaluate(출고, ids['별']) == [])
        본다('오공공 — 「010-****-****」 자동 안 함', 쪽.evaluate(출고, ids['공']) == [])
        본다('정재주 — 이미 나간 옛 주문 빼고 재주문에만 연결', 쪽.evaluate(출고, ids['재새']) == ['99000000007'] and 쪽.evaluate(출고, ids['재옛']) == [])
        본다('한나감 — 안 나간 주문이 없어 그대로 확인 필요', 쪽.evaluate(출고, ids['나감']) == [])
        수 = 쪽.inner_text('.needbox h4')
        본다('확인 필요 5건(박여럿·이빈칸·최별표·오공공·한나감)', '확인 필요 5건' in 수, 수)
        쪽.screenshot(path=str(여기 / '1-자동짝-PC.png'), full_page=True)

        # 박여럿 — 이름으로 찾기: 전화 맞는 두 건만 고르기에 뜬다
        tr = 쪽.locator('.needbox tr:has-text("박여럿")')
        tr.locator('button:has-text("이름")').first.click(); 쪽.wait_for_timeout(400)
        항목 = 쪽.locator('.askbox').inner_text() if 쪽.locator('.askbox').count() else ''
        본다('박여럿 고르기 — 이름·전화로 찾은 주문 2건만', '이름·전화로 찾은 주문' in 항목 and 항목.count('박여럿 ·') == 2, 항목.replace('\n', ' / '))
        쪽.screenshot(path=str(여기 / '2-고르기-PC.png'))
        쪽.locator('.askbox button:has-text("오늘"), .askbox button:has-text("2일 전")').first.click(); 쪽.wait_for_timeout(400)
        본다('고른 건(2일 전)에 연결 · 남 안 깎임', 쪽.evaluate(출고, ids['여럿2']) == ['99000000003'] and 쪽.evaluate(출고, ids['여럿1']) == [] and 쪽.evaluate(출고, ids['여럿남']) == [])

        # 이빈칸 — 전화 없으면 지금처럼 이름 후보 하나 → 이름으로 찾기에 붙는다
        쪽.locator('.needbox tr:has-text("이빈칸")').locator('button:has-text("이름")').first.click(); 쪽.wait_for_timeout(400)
        본다('이빈칸 — 이름으로 찾기는 지금처럼(후보 하나면 붙음)', 쪽.evaluate(출고, ids['빈칸']) == ['99000000004'])

        # 되돌리기 — 자동 연결 줄도 창 안에서 되돌리면 확인 필요로
        tr = 쪽.locator('.needbox tr:has-text("김형하")')
        tr.locator('button:has-text("되돌")').first.click(); 쪽.wait_for_timeout(400)
        본다('자동 연결 줄 되돌리기 → 출고 지움', 쪽.evaluate(출고, ids['형하']) == [])
        본다('콘솔 빨간 에러 없음(ⓑ)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()

        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\nⓐ 빨간 띠 — ' + 이름)
            쪽 = 새쪽(브, 폰)
            쪽.goto(주소); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_function("() => window.ZG && ZG.보내기")
            쪽.evaluate("() => { ZG.시드.심기(); ZG.보내기.비우기(); }")
            쪽.reload(); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_timeout(500)
            본다('문제 없으면 띠 없음', 쪽.locator('.zg-못올림').count() == 0)

            # 1분 넘게 못 나간 기록 2건 + 방금 것 1건(안 센다)
            쪽.evaluate("""() => { const 옛 = Date.now() - 5 * 60000;
              localStorage.setItem('zg.v3.보낼것', JSON.stringify({
                '주문|a1': { 표: '주문', id: 'a1', 값: { id: 'a1' }, 시각: 옛 },
                '문자주문|a2': { 표: '문자주문', id: 'a2', 값: { id: 'a2' }, 시각: 옛 },
                '주문|a3': { 표: '주문', id: 'a3', 값: { id: 'a3' }, 시각: Date.now() } })); }""")
            쪽.reload(); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_timeout(500)
            띠 = 쪽.locator('.zg-못올림')
            글 = 띠.inner_text() if 띠.count() else ''
            본다('「⚠ 서버에 못 올라간 기록 2건」(1분 넘은 것만)', 글 == '⚠ 서버에 못 올라간 기록 2건', 글)
            위 = 쪽.evaluate("() => { const b = document.querySelector('.zg-못올림'); const r = b.getBoundingClientRect(); return [document.body.firstElementChild === b, Math.round(r.top), Math.round(r.width), getComputedStyle(b).backgroundColor]; }")
            본다('맨 위 · 가로 꽉 · 빨강', 위[0] and 위[1] == 0 and 위[2] >= (380 if 폰 else 1400) and 위[3] == 'rgb(215, 0, 21)', 위)
            쪽.screenshot(path=str(여기 / ('3-못올라감띠-' + 이름 + '.png')))

            # 이 기기 저장 실패 — 주문 표 쓰기만 막아 본다
            쪽.evaluate("""() => { const 원 = Storage.prototype.setItem; window.__원 = 원;
              Storage.prototype.setItem = function (k, v) { if (k === 'zg.v3.주문') throw new DOMException('꽉 참', 'QuotaExceededError'); return 원.call(this, k, v); };
              ZG.저장소.덧붙이기(ZG.저장소.키.주문, { id: 'o_띠시험', 주문번호: 'x', 수령인: '띠시험' }); }""")
            쪽.wait_for_timeout(200)
            글 = 쪽.inner_text('.zg-못올림')
            본다('「⚠ 이 기기에 저장 실패」 곧바로 함께', 글.startswith('⚠ 이 기기에 저장 실패') and '못 올라간 기록 2건' in 글, 글)
            쪽.screenshot(path=str(여기 / ('4-저장실패띠-' + 이름 + '.png')))
            쪽.evaluate("() => { Storage.prototype.setItem = window.__원; ZG.저장소.바꾸기(ZG.저장소.키.주문, 'o_띠시험', { 수령인: '띠시험2' }); }")
            쪽.wait_for_timeout(200)
            글 = 쪽.inner_text('.zg-못올림') if 쪽.locator('.zg-못올림').count() else ''
            본다('같은 표가 다시 써지면 「저장 실패」 풀림', '저장 실패' not in 글 and '못 올라간 기록 2건' in 글, 글)
            본다('주문 표에 실제로 들어감', 쪽.evaluate("() => JSON.parse(localStorage.getItem('zg.v3.주문')).some(r => r.id === 'o_띠시험')"))
            쪽.evaluate("() => ZG.보내기.비우기()"); 쪽.wait_for_timeout(200)
            본다('큐 비우면 띠 사라짐', 쪽.locator('.zg-못올림').count() == 0)
            본다('화면에 사용법 설명 문구 없음', '눌러' not in 글 and '하세요' not in 글)
            본다('콘솔 빨간 에러 없음(ⓐ ' + 이름 + ')', not 쪽._오류, 쪽._오류[:3])
            쪽.close()

        print('\nⓐ 다른 화면(상품) 도 같은 띠')
        쪽 = 새쪽(브, False, "localStorage.setItem('zg.v3.보낼것', JSON.stringify({'주문|b1': { 표: '주문', id: 'b1', 값: { id: 'b1' }, 시각: Date.now() - 300000 }}));")
        쪽.goto(상품); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_timeout(500)
        글 = 쪽.inner_text('.zg-못올림') if 쪽.locator('.zg-못올림').count() else ''
        본다('index.html 「⚠ 서버에 못 올라간 기록 1건」', 글 == '⚠ 서버에 못 올라간 기록 1건', 글)
        쪽.screenshot(path=str(여기 / '5-상품화면띠-PC.png'))
        쪽.evaluate("() => ZG.보내기.비우기()")
        본다('콘솔 빨간 에러 없음(상품)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
