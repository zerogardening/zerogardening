# -*- coding: utf-8 -*-
# 35단계 번호 장부 · 한 번만 올리기 · 짝짓기에 받는 분 — python3 v3/검수/50-번호장부/번호장부-시험.py [v3 뿌리]
#   뿌리를 주면 그 사본으로(고치기 전 `git archive HEAD v3 | tar -x -C <임시>` 와 맞대기) · 안 주면 지금 v3
# 🔴 실서버 안 씀 — supabase CDN·주소를 막고, 두 기기(브라우저 컨텍스트 둘)가 같이 쓰는 가짜 서버를 파이썬이 든다(expose_binding).
#    가짜 서버는 id 겹침·문자주문id 겹침을 23505 로 거절한다(35단계 SQL 과 같음). 이름·전화는 전부 가짜
import json, pathlib, subprocess, sys, time, datetime
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
포트 = 8857
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

오늘 = datetime.date.today().isoformat()
앞 = 오늘[2:4] + 오늘[5:7] + 오늘[8:10]

# ── 가짜 서버(파이썬) ──
표들 = {}
시계 = [0]
def 새시각():
    시계[0] += 1
    return '%sT00:00:00.%06d+00:00' % (오늘, 시계[0])
def 처리(_, 표, 일):
    T = 표들.setdefault(표, {})
    이름 = [x[0] for x in 일]
    def 인자(n): return next((x[1] for x in 일 if x[0] == n), None)
    if 'insert' in 이름:
        줄들 = 인자('insert')[0]; 줄들 = 줄들 if isinstance(줄들, list) else [줄들]
        for r in 줄들:
            if r['id'] in T or (r.get('문자주문id') and any(x.get('문자주문id') == r['문자주문id'] for x in T.values())):
                return {'data': None, 'error': {'code': '23505', 'message': 'duplicate key'}}
        for r in 줄들: T[r['id']] = dict(r, 수정시각=새시각())
        return {'data': None, 'error': None}
    if 'upsert' in 이름:
        줄들 = 인자('upsert')[0]; 줄들 = 줄들 if isinstance(줄들, list) else [줄들]
        for r in 줄들: T[r['id']] = dict({'삭제됨': False}, **r, 수정시각=새시각())
        return {'data': None, 'error': None}
    줄들 = list(T.values())
    for n, a in 일:
        if n == 'eq': 줄들 = [r for r in 줄들 if r.get(a[0]) == a[1]]
        if n == 'in': 줄들 = [r for r in 줄들 if r.get(a[0]) in a[1]]
        if n == 'like': 줄들 = [r for r in 줄들 if str(r.get(a[0], '')).startswith(a[1].rstrip('%'))]
        if n == 'gte': 줄들 = [r for r in 줄들 if str(r.get(a[0], '')) >= a[1]]
    if 'order' in 이름: 줄들.sort(key=lambda r: r['id'])
    if 'range' in 이름: s, e = 인자('range'); 줄들 = 줄들[s:e + 1]
    if 'maybeSingle' in 이름 or 'single' in 이름: return {'data': 줄들[0] if 줄들 else None, 'error': None}
    return {'data': 줄들, 'error': None}

# 가짜 supabase-js — 체인을 모아 then 에서 파이썬에 묻는다 · insert 는 0.3초 늦춰 두 기기가 같은 후보를 읽게 만든다(진짜 경합)
가짜 = """(() => {
  function 체인(표, 일) {
    return new Proxy(function () {}, { get(_, k) {
      if (k === 'then') return (ok, no) => {
        const 늦춤 = 일.some(x => x[0] === 'insert') ? new Promise(r => setTimeout(r, 300)) : Promise.resolve();
        return 늦춤.then(() => window.__서버(표, JSON.parse(JSON.stringify(일)))).then(ok, no);
      };
      return (...a) => 체인(표, 일.concat([[k, a]]));
    } });
  }
  const 채널 = () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() { return Promise.resolve(); } });
  const 손 = { from: (표) => 체인(표, []), channel: 채널, removeChannel: () => Promise.resolve(), getChannels: () => [],
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't', user: { id: 'u' } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    functions: { invoke: () => Promise.resolve({ data: { ok: true }, error: null }) } };
  Object.defineProperty(window, 'supabase', { value: { createClient: () => 손 }, writable: false });
})();"""
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
주소 = 'http://localhost:%d/%%EC%%A3%%BC%%EB%%AC%%B8.html' % 포트

def 문자주문(id, 이름, 전화, 품목수=1):
    return {'id': id, '날짜': 오늘, '받는분': 이름, '전화': 전화, '메모': '', '주소': '서울 시험로 1', '상세주소': '', '우편': '', '배송메시지': '',
            '품목': [{'품목코드': 'CAR01-1%d' % i, '유통명': '청사초%d' % i, '학명': '', '규격': '', '수량': 1, '단가': 3800} for i in range(품목수)],
            '배송비': 4500, '상태': '보냄', '등록일시': 1, '수정일시': 1}
def 서버심기():
    표들.clear()
    표들['v3_공유설정'] = {'서버상태': {'id': '서버상태', '내용': {'올림완료': True}, '삭제됨': False, '수정시각': 새시각()}}
    표들['v3_문자주문'] = {r['id']: {'id': r['id'], '내용': r, '삭제됨': False, '수정시각': 새시각()} for r in [
        문자주문('sm_가', '시험가람', '01011110001'), 문자주문('sm_나', '시험나래', '01011110002'),
        문자주문('sm_다', '시험다솜', '01011110003'), 문자주문('sm_라', '시험라온', '01011110004'),
        문자주문('sm_같', '시험같음', '01011110005', 2)]}

올림 = """(id) => { window.__끝 = window.__끝 || {}; delete window.__끝[id]; const 사람 = ZG.문자주문자료.하나(id);
  const p = ZG.번호장부 ? ZG.번호장부.올리기(id, 사람) : Promise.resolve(ZG.문자주문자료.주문올리기(id, 사람));
  p.then(r => { window.__끝[id] = r; }, e => { window.__끝[id] = { 오류: String(e) }; }); }"""
def 기다림(쪽, id):
    쪽.wait_for_function("(id) => window.__끝 && window.__끝[id]", arg=id, timeout=20000)
    return 쪽.evaluate("(id) => window.__끝[id]", id)
def 서버주문(sid):
    return sorted((r['id'], r['내용'].get('주문번호')) for r in 표들.get('v3_주문', {}).values() if r['내용'].get('문자주문id') == sid and not r.get('삭제됨'))
def 숨김(쪽, 참):
    쪽.evaluate("(h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }", 참)

def 기기(브, 이름):
    판 = 브.new_context(viewport={'width': 1440, 'height': 1000}, service_workers='block')
    판.expose_binding('__서버', 처리)
    쪽 = 판.new_page(); 쪽._오류 = []; 쪽._이름 = 이름
    쪽.on('pageerror', lambda e: 쪽._오류.append('pageerror ' + str(e)))
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text and 'Failed to load resource' not in m.text else None)
    for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**', '**daumcdn.net**'): 쪽.route(길, lambda r: r.abort())
    쪽.add_init_script(가짜 + 심기)
    쪽.goto(주소); 쪽.wait_for_function('!!(window.ZG && ZG.서버 && ZG.서버.준비 && ZG.문자주문자료)', timeout=20000)
    쪽.evaluate('() => ZG.서버.준비'); 쪽.wait_for_timeout(300)
    return 판, 쪽

# ── ④ 짝짓기 자료(로컬 전용 화면) ──
D자료 = """() => {
  const 저 = ZG.저장소, 오늘 = ZG.ui.오늘문자(), 품 = 저.품목들()[1], 앞 = 오늘.slice(2,4) + 오늘.slice(5,7) + 오늘.slice(8,10);
  const 줄 = (id, 번, 판매처, 이름, 전화, sid) => 저.덧붙이기(저.키.주문, { id, 주문번호: 앞 + 번, 주문일: 오늘, 판매처, 출처: 판매처 === '문자' ? '수동' : '자동수집',
    수령인: 이름, 수령인전화: 전화, 수령인주소: '서울 시험로 1', 품목코드: 품.품목코드, 유통명: 품.유통명, 규격: 품.규격 || '', 주문수량: 1, 단가: 1000, 문자주문id: sid || undefined });
  const 나감 = (oid, 송) => 저.덧붙이기(저.키.출고, { id: 'out_' + oid, 출처: '주문', 주문id: oid, 품목코드: 품.품목코드, 수량: 1, 출고일: 오늘, 운송장번호: 송, 등록일시: 1 });
  const 문 = (id, 이름, 전화, 번) => 저.덧붙이기(저.키.문자주문, { id, 날짜: 오늘, 받는분: 이름, 전화, 주소: '서울 시험로 1', 품목: [{ 품목코드: 품.품목코드, 유통명: 품.유통명, 수량: 1, 단가: 1000 }],
    상태: '올림', 올린주문번호: 앞 + 번, 올린일시: Date.now(), 등록일시: Date.now(), 수정일시: Date.now() });
  // 01 — 현진희(나감) 와 조춘성(안 나감)이 같은 번호 (11/10 그대로) · 현진희 주문탭 추가 줄(문자주문id 없음)도 나감
  문('sm_현', '시험현진', '01011111111', '-01'); 줄('o_현', '-01', '문자', '시험현진', '010-1111-1111', 'sm_현'); 나감('o_현', '99001');
  줄('o_현더', '-01', '문자', '시험현진', '010-1111-1111'); 나감('o_현더', '99002');
  문('sm_조', '시험조춘', '01022222222', '-01'); 줄('o_조', '-01', '문자', '시험조춘', '010-2222-2222', 'sm_조');
  // 로젠 짝 — 02 이미섭·문수근(둘 다 안 나감) · 03 최다름 하나 · 마켓 번호 하나
  줄('o_이', '-02', '문자', '시험이미', '010-3333-3333', 'sm_이'); 줄('o_문', '-02', '문자', '시험문수', '010-4444-4444', 'sm_문');
  줄('o_최', '-03', '문자', '시험최다', '010-7777-7777', 'sm_최');
  저.덧붙이기(저.키.주문, { id: 'o_마켓', 주문번호: '20261110-0000001', 주문일: 오늘, 판매처: '카페24', 출처: '자동수집', 수령인: '시험마켓', 수령인전화: '010-8888-8888',
    수령인주소: '서울 시험로 2', 품목코드: 품.품목코드, 유통명: 품.유통명, 규격: 품.규격 || '', 주문수량: 1, 단가: 1000 });
  return 앞;
}"""
파일넣기 = """(앞) => {
  const 머리1 = []; 머리1[3] = '운송장번호'; 머리1[6] = '수하인'; 머리1[9] = '수하인'; 머리1[10] = '수하인'; 머리1[18] = '주문번호';
  const 머리2 = []; 머리2[3] = '운송장번호'; 머리2[6] = '이름'; 머리2[9] = '전화'; 머리2[10] = '휴대폰'; 머리2[11] = '박스\\n수량'; 머리2[18] = '주문번호';
  const 줄 = (송, 이름, k, 번) => { const r = []; r[3] = 송; r[6] = 이름; r[9] = ''; r[10] = k; r[11] = '1'; r[18] = 번; return r; };
  const 행들 = [['주문등록_출력(복수건)_출력완료'], 머리1, 머리2,
    줄('99005', '시험문수', '010-4444-****', 앞 + '-02'),
    줄('99006', '시험박없', '010-9999-****', 앞 + '-03'),
    줄('99007', '시험선물', '010-5555-****', '20261110-0000001')];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(행들), 'Sheet1');
  const f = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], '주문등록_출력완료.xlsx');
  const dt = new DataTransfer(); dt.items.add(f);
  document.querySelector('.drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}"""
출고 = "(id) => ZG.저장소.읽기(ZG.저장소.키.출고).filter(r => r.주문id === id && !String(r.id).startsWith('out_')).map(r => r.운송장번호 || '?')"

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), str(포트), str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        서버심기()
        판A, A = 기기(브, 'A'); 판B, B = 기기(브, 'B')
        본다('두 기기 다 가짜 서버에 붙음(문자주문 5건 받음)', A.evaluate("() => ZG.서버.켜짐 && ZG.문자주문자료.전부().length") == 5 and B.evaluate("() => ZG.문자주문자료.전부().length") == 5)

        print('\n① 두 기기가 같은 때 다른 주문을 올림 → 번호 다름')
        A.evaluate(올림, 'sm_가'); B.evaluate(올림, 'sm_나')
        a, b = 기다림(A, 'sm_가'), 기다림(B, 'sm_나')
        본다('둘 다 올라감', not a.get('오류') and not b.get('오류'), [a, b])
        본다('번호 다름', a.get('번호') and a.get('번호') != b.get('번호'), [a.get('번호'), b.get('번호')])
        장부 = sorted(표들.get('v3_주문번호', {}))
        본다('장부에 두 번호 · 오늘 01·02', 장부 == [앞 + '-01', 앞 + '-02'], 장부)

        print('\n② B 를 숨긴 채 A 가 올림 → B 를 다시 켜고 올림 → 안 겹침')
        숨김(B, True)
        A.evaluate(올림, 'sm_다'); c = 기다림(A, 'sm_다')
        숨김(B, False)
        B.evaluate(올림, 'sm_라'); d = 기다림(B, 'sm_라')
        본다('B 는 A 의 sm_다 를 모름(실시간 없음 · 15초 안이라 따라잡기도 안 함)', B.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).every(o => o.문자주문id !== 'sm_다')"))
        쓴 = [a.get('번호'), b.get('번호'), c.get('번호')]
        본다('B 번호가 앞의 셋과 안 겹침', d.get('번호') and d.get('번호') not in 쓴, 쓴 + [d.get('번호')])

        print('\n③ 같은 주문(sm_같 · 품목 2)을 두 기기가 같이 올림 → 하나')
        A.evaluate(올림, 'sm_같'); B.evaluate(올림, 'sm_같')
        e, f = 기다림(A, 'sm_같'), 기다림(B, 'sm_같')
        A.wait_for_timeout(1500)   # 01c 보내기(0.3초 모아 보냄)가 서버에 닿게
        번호들 = {x.get('번호') for x in (e, f) if x.get('번호')}
        본다('두 기기가 받은 번호가 하나', len(번호들) == 1, [e, f])
        줄 = 서버주문('sm_같')
        본다('서버 주문 줄 한 벌(품목 2 → 2줄) · 번호 하나', len(줄) == 2 and len({n for _, n in 줄}) == 1, 줄)
        본다('장부에 sm_같 번호 하나', sum(1 for r in 표들.get('v3_주문번호', {}).values() if r.get('문자주문id') == 'sm_같') == 1)
        본다('서버 문자주문 sm_같 올린주문번호 = 그 번호', 표들['v3_문자주문']['sm_같']['내용'].get('올린주문번호') in 번호들)

        print('\n③-2 A 가 올린 sm_가 를 모르는 B 가 또 올림(11/09 문수근) → 막힘')
        전줄 = 서버주문('sm_가')
        본다('B 는 sm_가 를 아직 「보냄」으로 앎', B.evaluate("() => ZG.문자주문자료.하나('sm_가').상태") == '보냄')
        B.evaluate(올림, 'sm_가'); g = 기다림(B, 'sm_가')
        B.wait_for_timeout(1500)
        본다('「이미 다른 기기에서 올린 주문」', '이미 다른 기기에서 올린' in str(g.get('오류', '')), g)
        본다('서버 sm_가 주문 줄·번호 그대로', 서버주문('sm_가') == 전줄, [전줄, 서버주문('sm_가')])

        print('\n③-3 인터넷 끊김 → 안 올리고 「인터넷 연결 후 다시」')
        표들['v3_문자주문']['sm_끊'] = {'id': 'sm_끊', '내용': 문자주문('sm_끊', '시험끊김', '01011110009'), '삭제됨': False, '수정시각': 새시각()}
        B.evaluate("() => ZG.저장소.덧붙이기(ZG.저장소.키.문자주문, " + json.dumps(문자주문('sm_끊', '시험끊김', '01011110009'), ensure_ascii=False) + ")")
        B.evaluate("() => { window.__원서버 = window.__서버; window.__서버 = () => Promise.reject(new Error('끊김')); }")
        B.evaluate(올림, 'sm_끊'); h = 기다림(B, 'sm_끊')
        B.evaluate("() => { window.__서버 = window.__원서버; }")
        본다('「인터넷 연결 후 다시 올려 주세요」 · 번호 없음', h.get('오류') == '인터넷 연결 후 다시 올려 주세요' and not h.get('번호'), h)
        본다('그 주문은 「올림」 안 됨 · 주문 줄 없음', B.evaluate("() => ZG.문자주문자료.하나('sm_끊').상태 !== '올림' && !ZG.저장소.읽기(ZG.저장소.키.주문).some(o => o.문자주문id === 'sm_끊')"))
        B.evaluate(올림, 'sm_끊'); h2 = 기다림(B, 'sm_끊')
        본다('다시 연결되면 올라감', h2.get('번호') and h2.get('번호') not in 쓴 + [d.get('번호')] + list(번호들), h2)

        print('\n⑤ 화면에서 「주문올리기」 단추로(입금 자동 올리기 길 포함 · 같은 함수)')
        A.evaluate("() => ZG.저장소.덧붙이기(ZG.저장소.키.문자주문, " + json.dumps(문자주문('sm_단추', '시험단추', '01011110010'), ensure_ascii=False) + ")")
        A.locator('button', has_text='문자').first.click(); A.wait_for_timeout(300)
        A.evaluate("() => ZG.문자주문.목록으로 && ZG.문자주문.목록으로()"); A.wait_for_timeout(400)
        A.locator('tr:has-text("시험단추") button:has-text("주문올리기")').first.click(); A.wait_for_timeout(400)
        A.locator('.올림판 button:has-text("주문올리기")').first.click()
        A.wait_for_function("() => ZG.문자주문자료.하나('sm_단추').상태 === '올림'", timeout=10000)
        n = A.evaluate("() => ZG.문자주문자료.하나('sm_단추').올린주문번호")
        본다('단추로 올림 → 장부 번호', n in 표들.get('v3_주문번호', {}) and 표들['v3_주문번호'][n].get('문자주문id') == 'sm_단추', n)
        A.screenshot(path=str(여기 / '1-단추올림-PC.png'))
        for 쪽 in (A, B): 본다('콘솔 빨간 에러 0 (기기 %s)' % 쪽._이름, not 쪽._오류, 쪽._오류[:3])
        판A.close(); 판B.close()

        print('\n④ 번호 같고 받는 분 다른 줄 → 발송완료로 안 붙음 (로컬 전용)')
        for 폰 in (False, True):
            판 = 브.new_context(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000}, device_scale_factor=2 if 폰 else 1, service_workers='block')
            쪽 = 판.new_page(); 쪽._오류 = []
            쪽.on('pageerror', lambda e: 쪽._오류.append(str(e)))
            쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**', '**daumcdn.net**'): 쪽.route(길, lambda r: r.abort())
            쪽.add_init_script(심기 + (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8') + ';')
            쪽.goto(주소); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문자료 && ZG.배송완료)', timeout=20000)
            쪽.evaluate("() => ZG.시드.심기()"); 오앞 = 쪽.evaluate(D자료)
            틀 = '폰' if 폰 else 'PC'
            if not 폰:
                정 = 쪽.evaluate("() => { const z = ZG.문자주문자료; return { 조: z.발송정보(z.하나('sm_조')), 현: z.발송정보(z.하나('sm_현')), 지울: z.지울줄(z.하나('sm_조')).map(o => o.id) }; }")
                본다('조춘성(번호만 같음) — 발송완료 아님', 정['조']['됨'] is False, 정['조'])
                본다('조춘성 — 「번호 겹침」 표시', 정['조'].get('겹침') is True)
                본다('현진희 — 제 줄·주문탭 추가 줄 송장 둘 다 그대로', 정['현']['됨'] and 정['현']['송장'] == ['99001', '99002'], 정['현']['송장'])
                본다('조춘성 주문 지우기 — 현진희 줄은 안 지움', 정['지울'] == ['o_조'], 정['지울'])
            쪽.locator('button', has_text='문자').first.click(); 쪽.wait_for_timeout(300)
            쪽.evaluate("() => ZG.문자주문.목록으로 && ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(500)
            쪽.click('.단계줄 .단계.주문'); 쪽.wait_for_timeout(300)   # 올렸고 안 나간 줄 = 주문완료
            글 = 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("시험조춘")').first.inner_text()
            본다(틀 + ' 조춘성 칸 — 「번호 겹침 · 확인 필요」 · 발송완료 아님', '번호 겹침 · 확인 필요' in 글 and 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("시험조춘") .st.ship').count() == 0, 글.replace('\n', ' / ')[:120])
            쪽.screenshot(path=str(여기 / ('2-번호겹침-' + 틀 + '.png')))
            if not 폰:
                쪽.evaluate("() => new Promise(r => ZG.주문파일.준비되면(r))")
                쪽.evaluate("() => ZG.배송완료창.열기()"); 쪽.wait_for_timeout(300)
                쪽.evaluate(파일넣기, 오앞); 쪽.wait_for_timeout(800)
                본다('로젠 02 수하인 문수근 — 문수근만 송장', 쪽.evaluate(출고, 'o_문') == ['99005'] and 쪽.evaluate(출고, 'o_이') == [], [쪽.evaluate(출고, 'o_문'), 쪽.evaluate(출고, 'o_이')])
                본다('로젠 03 수하인 다름 — 최다름에 안 붙음', 쪽.evaluate(출고, 'o_최') == [])
                확 = 쪽.locator('.needbox').inner_text() if 쪽.locator('.needbox').count() else ''
                본다('03 줄 「받는 분이 다름 — 확인 필요」', '받는 분이 다름 — 확인 필요' in 확, 확.replace('\n', ' / ')[:160])
                본다('마켓 번호는 받는 분 달라도 그대로 붙음(안 건드림)', 쪽.evaluate(출고, 'o_마켓') == ['99007'])
                쪽.screenshot(path=str(여기 / '3-로젠확인-PC.png'), full_page=True)
            본다('콘솔 빨간 에러 0 (④ ' + 틀 + ')', not 쪽._오류, 쪽._오류[:3])
            판.close()
        브.close()
finally:
    서버.terminate(); 서버.wait()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
