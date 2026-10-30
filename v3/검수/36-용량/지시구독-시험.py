# -*- coding: utf-8 -*-
# 36 용량 — 01d-지시구독 · 19 지시함 · 06l 품절이 「통째 다시 받기」 대신 바뀐 줄만 받는지
#   python3 v3/검수/36-용량/지시구독-시험.py [뿌리(v3 폴더)]
# 🔴 로컬 전용 — supabase CDN 을 막고 가짜 클라이언트(window.supabase)를 끼운다. 실서버 안 씀
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = pathlib.Path(__file__).resolve().parent
포트 = 8830
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

지금 = int(time.time() * 1000)
분 = 60000
def 때(ms): return time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(ms / 1000)) + '.%03d123+00:00' % (ms % 1000)
def 줄(ms, 꼬리, 내용, 삭제=False):
    return {'id': '%d-%s' % (ms, 꼬리), '내용': 내용, '삭제됨': 삭제, '수정시각': 때(ms)}
지시줄 = [
    줄(지금 - 30 * 분, 'aaaa', {'누가': '우람님', '보낸때': 지금 - 30 * 분, '글': '어제 주문 정리해 줘', '상태': '됨', '답장': '정리했습니다'}),
    줄(지금 - 20 * 분, 'GEN01-10', {'누가': '시스템', '갈래': '마켓품절', '품목코드': 'GEN01-10', '상태': '대기', '보낸때': 지금 - 20 * 분,
                                     '마켓': {'카페24': {'상태': '완료', '사유': '', '때': 지금}}}),
    줄(지금 - 10 * 분, 'bbbb', {'누가': '우람님', '보낸때': 지금 - 10 * 분, '글': '휴케라 사진 확인', '상태': '허브로'}),
    줄(지금 - 5 * 분, 'cccc', {'갈래': '구독', '끝주소': 'x'}),
]
품목 = [{'품목코드': 'GEN01-10', '유통명': '용담 보라 10cm', '학명': 'Gentiana scabra', '규격': '10cm 포트', '등록일시': 지금 - 3}]

심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
가짜 = """
window.__q = []; window.__채널 = {}; window.__지시 = %s; window.__품목 = %s;
window.__실시간 = %s;
(function () {
  const 시 = (v) => new Date(v).getTime();
  function 풀기(q) {
    if (q.op !== 'select') return { data: null, error: null };
    if (q.t === 'v3_공유설정') return { data: q.single ? { 내용: { 시각: 1 } } : [], error: null };
    if (q.t === 'v3_품목') return { data: window.__품목.map(p => ({ id: p.품목코드, 내용: p, 삭제됨: false, 수정시각: '2026-10-01T00:00:00+00:00' })), error: null };
    if (q.t !== 'v3_지시') return { data: [], error: null };
    let r = window.__지시.slice();
    q.f.forEach(([op, k, v]) => {
      const 값 = (row) => k === '내용->>갈래' ? (row.내용 || {}).갈래 : row[k];
      if (op === 'eq') r = r.filter(x => 값(x) === v);
      if (op === 'in') r = r.filter(x => v.indexOf(값(x)) >= 0);
      if (op === 'gte') r = r.filter(x => String(값(x)) >= v);
      if (op === 'gt') r = r.filter(x => 시(값(x)) > 시(v));
    });
    if (q.ord) { const [k, 오름] = q.ord; r.sort((a, b) => (k === '수정시각' ? 시(a[k]) - 시(b[k]) : (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0)) * (오름 ? 1 : -1)); }
    if (q.lim) r = r.slice(0, q.lim);
    if (q.sel === '수정시각') r = r.map(x => ({ 수정시각: x.수정시각 }));
    return { data: JSON.parse(JSON.stringify(r)), error: null };
  }
  function 질의(t) {
    const q = { t, sel: '', f: [], ord: null, lim: null, op: 'select',
      select(s) { if (q.op === 'select') q.sel = s; return q; }, eq(k, v) { q.f.push(['eq', k, v]); return q; },
      in(k, v) { q.f.push(['in', k, v]); return q; }, gte(k, v) { q.f.push(['gte', k, v]); return q; },
      gt(k, v) { q.f.push(['gt', k, v]); return q; }, order(k, o) { q.ord = [k, !(o && o.ascending === false)]; return q; },
      limit(n) { q.lim = n; return q; }, range(a, b) { q.lim = b - a + 1; return q; }, maybeSingle() { q.single = true; return q; },
      upsert(rows) { q.op = 'upsert'; q.rows = rows; return q; }, update(v) { q.op = 'update'; q.val = v; return q; },
      then(ok, no) {
        window.__q.push({ t: q.t, sel: q.sel, f: JSON.stringify(q.f), op: q.op, lim: q.lim });
        if (q.op === 'upsert' && q.t === 'v3_지시') q.rows.forEach(r => window.__지시.push(Object.assign({ 수정시각: new Date().toISOString() }, r)));
        return Promise.resolve(풀기(q)).then(ok, no);
      } };
    return q;
  }
  function 채널(이름) {
    const c = { 이름, 듣기: [], 시스템: [],
      on(종류, 거름, f) { (종류 === 'system' ? c.시스템 : c.듣기).push({ 거름, f }); return c; },
      subscribe(f) { setTimeout(() => { f && f('SUBSCRIBED');
        const 붙음 = window.__실시간;
        c.시스템.forEach(h => h.f({ extension: 'postgres_changes', status: 붙음 ? 'ok' : 'error', message: 붙음 ? 'Subscribed to PostgreSQL' : 'Unable to subscribe' })); }, 50); return c; } };
    window.__채널[이름] = c; return c;
  }
  window.supabase = { createClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u' } } } }) },
    from: 질의, channel: 채널,
    functions: { invoke: () => Promise.resolve({ data: { ok: true } }) } }) };
  // 실시간 한 줄 쏘기 — 서버 표도 같이 바꾼다
  window.__쏘기 = (종류, 행) => {
    const i = window.__지시.findIndex(x => x.id === 행.id);
    if (종류 === 'DELETE') { if (i >= 0) window.__지시.splice(i, 1); }
    else { 행.수정시각 = new Date().toISOString(); if (i >= 0) window.__지시[i] = 행; else window.__지시.push(행); }
    const c = window.__채널['v3-지시']; if (!c) return 'no channel';
    c.듣기.forEach(h => h.거름.table === 'v3_지시' && h.f(종류 === 'DELETE' ? { eventType: 'DELETE', new: {}, old: { id: 행.id } } : { eventType: 종류, new: 행, old: {} }));
    return 'ok';
  };
})();
"""

서버 = subprocess.Popen([sys.executable, '-c', 'import functools, http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; '
                         'h.ThreadingHTTPServer(("", %d), functools.partial(h.SimpleHTTPRequestHandler, directory=%r)).serve_forever()' % (포트, str(뿌리))],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)

def 열기(브, 쪽이름, 폰, 실시간):
    ctx = 브.new_context(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                         device_scale_factor=2 if 폰 else 1, service_workers='block')
    쪽 = ctx.new_page()
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기 + (가짜 % (json.dumps(지시줄, ensure_ascii=False), json.dumps(품목, ensure_ascii=False), 'true' if 실시간 else 'false')))
    쪽.goto('http://localhost:%d/%s' % (포트, 쪽이름)); 쪽.wait_for_timeout(2000)
    return ctx, 쪽, 오류

def 지시통째(쪽):   # 19 의 통째 받기 = select id,내용,삭제됨 · limit 200
    return 쪽.evaluate("() => window.__q.filter(q => q.t === 'v3_지시' && q.op === 'select' && q.lim === 200).length")
def 품절통째(쪽):   # 06l 의 품절 받기 = in 갈래 마켓품절·판매
    return 쪽.evaluate("() => window.__q.filter(q => q.t === 'v3_지시' && q.op === 'select' && q.f.indexOf('마켓품절') >= 0 && q.f.indexOf('\"gt\"') < 0).length")
def 바뀐만(쪽):
    return 쪽.evaluate("() => window.__q.filter(q => q.t === 'v3_지시' && q.f.indexOf('\"gt\"') >= 0).length")
def 흐름(쪽): return 쪽.inner_text('.지시-흐름')

with sync_playwright() as p:
    브 = p.chromium.launch()
    try:
        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n── 지시함(%s) · 실시간 붙음' % 이름)
            ctx, 쪽, 오류 = 열기(브, '%EC%A7%80%EC%8B%9C.html', 폰, True)
            글 = 흐름(쪽)
            본다('처음 통째 받기 1번 · 줄 3개(구독 줄 뺌)', 지시통째(쪽) == 1 and '어제 주문 정리해 줘' in 글 and '휴케라 사진 확인' in 글, 지시통째(쪽))
            본다('실시간 붙음', 쪽.evaluate('ZG.지시구독.상태().실시간') is True)
            r = dict(지시줄[2]); r['내용'] = dict(r['내용'], 상태='됨', 답장='사진 7장 확인했습니다')
            본다('UPDATE 쏨', 쪽.evaluate('(r) => window.__쏘기("UPDATE", r)', r) == 'ok')
            쪽.wait_for_timeout(2200)
            본다('UPDATE → 답장이 화면에 (통째 다시 안 받음)', '사진 7장 확인했습니다' in 흐름(쪽) and 지시통째(쪽) == 1, 지시통째(쪽))
            새 = 줄(지금, 'dddd', {'누가': '우람님', '보낸때': 지금, '글': '새 지시 한글 확인', '상태': '대기'})
            쪽.evaluate('(r) => window.__쏘기("INSERT", r)', 새); 쪽.wait_for_timeout(2200)
            본다('INSERT → 새 줄 뜸', '새 지시 한글 확인' in 흐름(쪽))
            지움 = dict(새, 삭제됨=True)
            쪽.evaluate('(r) => window.__쏘기("UPDATE", r)', 지움); 쪽.wait_for_timeout(2200)
            본다('삭제됨=true → 사라짐', '새 지시 한글 확인' not in 흐름(쪽))
            쪽.evaluate('(r) => window.__쏘기("DELETE", r)', 지시줄[0]); 쪽.wait_for_timeout(2200)
            본다('DELETE → 사라짐', '어제 주문 정리해 줘' not in 흐름(쪽))
            # 보내기 — 한글로 쳐서 단추
            쪽.fill('.지시-입력 textarea', '용량 시험 지시입니다')
            쪽.click('.지시-보내기'); 쪽.wait_for_timeout(800)
            본다('보내기 단추 → upsert 1 · 화면에 뜸', 쪽.evaluate("() => window.__q.filter(q => q.op === 'upsert' && q.t === 'v3_지시').length") == 1
                 and '용량 시험 지시입니다' in 흐름(쪽))
            쪽.wait_for_timeout(6000)     # 예전 코드면 5초마다 통째로 다시 받았다
            본다('9초 넘게 지나도 통째 받기 그대로 1번', 지시통째(쪽) == 1, 지시통째(쪽))
            쪽.screenshot(path=str(여기 / ('지시함-%s.png' % 이름)))
            본다('콘솔 빨간 에러 0', not 오류, 오류)
            ctx.close()

        print('\n── 지시함(PC) · 실시간 안 붙음 → 15초 「바뀐 줄만」')
        ctx, 쪽, 오류 = 열기(브, '%EC%A7%80%EC%8B%9C.html', False, False)
        본다('실시간 아님', 쪽.evaluate('ZG.지시구독.상태().실시간') is False)
        쪽.evaluate("""() => { window.__지시.push({ id: Date.now() + '-eeee', 삭제됨: false, 수정시각: new Date(Date.now() + 1000).toISOString(),
                       내용: { 누가: '우람님', 보낸때: Date.now(), 글: '폴링으로 받은 줄', 상태: '대기' } }); }""")
        쪽.wait_for_timeout(17500)
        본다('15초 안에 바뀐 줄만 받아 뜸', '폴링으로 받은 줄' in 흐름(쪽) and 바뀐만(쪽) >= 1 and 지시통째(쪽) == 1, [바뀐만(쪽), 지시통째(쪽)])
        본다('콘솔 빨간 에러 0', not 오류, 오류)
        ctx.close()

        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n── 품절 탭(%s) · 실시간 붙음' % 이름)
            ctx, 쪽, 오류 = 열기(브, 'index.html#품절', 폰, True)
            처음 = 품절통째(쪽)
            코드 = 쪽.eval_on_selector_all('.품절탭 ' + ('.sc' if 폰 else '.pcr') + ' .cd', 'es => es.map(e => e.textContent)')
            본다('처음 품절 받기 · 카드 GEN01-10', 처음 >= 1 and 코드 == ['GEN01-10'], [처음, 코드])
            r = dict(지시줄[1]); r['내용'] = dict(r['내용'], 상태='됨', 마켓={m: {'상태': '완료', '사유': '', '때': 지금} for m in
                                                           ['카페24', '심폴', '스마트스토어', '쿠팡', 'G마켓', '롯데ON', '11번가']})
            쪽.evaluate('(r) => window.__쏘기("UPDATE", r)', r); 쪽.wait_for_timeout(2500)
            분수 = 쪽.eval_on_selector_all('.품절탭 .frac', 'es => es.map(e => e.textContent)')
            본다('품절 줄 UPDATE → 한 번 다시 받아 7/7', 품절통째(쪽) == 처음 + 1 and 분수 == ['7/7'], [품절통째(쪽), 분수])
            쪽.evaluate('(r) => window.__쏘기("UPDATE", r)', dict(지시줄[2], 내용=dict(지시줄[2]['내용'], 상태='됨'))); 쪽.wait_for_timeout(2500)
            본다('품절 아닌 줄 UPDATE → 다시 안 받음', 품절통째(쪽) == 처음 + 1, 품절통째(쪽))
            쪽.wait_for_timeout(14000)    # 예전 코드면 15초마다 다시 받았다
            본다('19초 지나도 그대로', 품절통째(쪽) == 처음 + 1, 품절통째(쪽))
            쪽.screenshot(path=str(여기 / ('품절-%s.png' % 이름)), full_page=False)
            본다('콘솔 빨간 에러 0', not 오류, 오류)
            ctx.close()
    finally:
        브.close()
        서버.terminate()

print('\n지시구독 시험 %d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
