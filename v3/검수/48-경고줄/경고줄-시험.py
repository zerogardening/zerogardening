# -*- coding: utf-8 -*-
# 11/10 화면 맨 위 경고 띠 걷기 → 서버 「경고:<기기>」 한 줄 — python3 v3/검수/48-경고줄/경고줄-시험.py
# 🔴 실서버 안 씀 — 가짜 Supabase 가 쓴 것(upsert)을 window.__쓴 에 모은다. 연결 끊김은 supabase CDN 을 막아 흉내
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
# 가짜 서버 — 표 줄 upsert 는 window.__막기 면 실패(밀림 흉내) · 공유설정 upsert 는 늘 받아 적는다
가짜 = """(() => {
  window.__쓴 = [];
  function 답(표, 일) {
    const 이름 = 일.map(x => x[0]);
    const up = 일.find(x => x[0] === 'upsert');
    if (up) { if (표 === 'v3_공유설정') { window.__쓴.push(JSON.parse(JSON.stringify([].concat(up[1][0])[0]))); return { data: null, error: null }; }
              return window.__막기 ? { data: null, error: { message: '막음' } } : { data: null, error: null }; }
    if (이름.some(n => /insert|update|delete/.test(n))) return { data: null, error: null };
    const eq = 일.find(x => x[0] === 'eq');
    if (표 === 'v3_공유설정' && eq && eq[1][1] === '서버상태') return { data: { 내용: { 올림완료: true } }, error: null };
    if (이름.includes('maybeSingle') || 이름.includes('single')) return { data: null, error: null };
    return { data: [], error: null, count: 0 };
  }
  function 체인(표, 일) {
    return new Proxy(function () {}, { get(_, k) {
      if (k === 'then') return (ok, no) => Promise.resolve(답(표, 일)).then(ok, no);
      return (...a) => 체인(표, 일.concat([[k, a]]));
    } });
  }
  const 채널 = () => ({ on() { return this; }, subscribe(cb) { if (cb) setTimeout(() => cb('SUBSCRIBED'), 0); return this; }, unsubscribe() { return Promise.resolve(); } });
  const 손 = { from: (표) => 체인(표, []), channel: 채널, removeChannel: () => Promise.resolve(), getChannels: () => [],
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't', user: { id: 'u' } } } }),
            getUser: () => Promise.resolve({ data: { user: { id: 'u' } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    functions: { invoke: () => Promise.resolve({ data: { ok: true }, error: null }) }, storage: { from: () => 체인('storage', []) } };
  Object.defineProperty(window, 'supabase', { value: { createClient: () => 손 }, writable: false });
})();"""
띠있나 = "() => !!document.querySelector('.zg-못올림, .zg-서버띠') || [...document.body.children].slice(0, 3).some(e => /rgb\\(215, 0, 21\\)/.test(getComputedStyle(e).backgroundColor))"

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), '8855', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
밑 = 'http://localhost:8855/%EC%A3%BC%EB%AC%B8.html'
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (True, False):
            틀 = '폰' if 폰 else 'PC'
            print('\n[' + 틀 + ']')
            ctx = 브.new_context(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000}, service_workers='block')
            오류 = []
            def 새쪽(앞):
                쪽 = ctx.new_page()
                쪽.on('pageerror', lambda e: 오류.append(str(e)))
                쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort()); 쪽.route('**supabase.co**', lambda r: r.abort())
                쪽.add_init_script(앞 + 심기)
                쪽.goto(밑); 쪽.wait_for_function('!!(window.ZG && ZG.보내기 && ZG.주문)', timeout=20000); 쪽.wait_for_timeout(3800)
                return 쪽
            # ① 서버 연결 끊김(supabase 부품을 못 받음) — 띠 없음 · 끊긴 시각만 이 기기에
            쪽 = 새쪽('')
            본다('끊김 — 맨 위 빨간 띠 없음', not 쪽.evaluate(띠있나) and '서버 연결 안 됨' not in 쪽.inner_text('body'))
            끊 = 쪽.evaluate("() => JSON.parse(localStorage.getItem('zg.v3.끊김기록') || 'null')")
            본다('끊김 — 시각을 이 기기에 적어 둠', bool(끊 and 끊.get('처음') and not 끊.get('풀림')), 끊)
            쪽.screenshot(path=str(여기 / ('1-끊김-' + 틀 + '.png')), animations='disabled')
            쪽.close()
            # ② 다시 이어짐 — 「끊겼던 시각~」 한 줄
            쪽 = 새쪽(가짜); 쪽.wait_for_function("() => window.__쓴.length > 0", timeout=10000)
            쓴 = 쪽.evaluate("() => window.__쓴")
            기기 = 쪽.evaluate("() => ZG.보내기.기기()")
            본다('다시 이어지면 경고 줄 「서버 연결 끊겼었음 …~…」', len(쓴) >= 1 and 쓴[-1]['id'] == '경고:' + 기기 and not 쓴[-1]['삭제됨'] and '서버 연결 끊겼었음' in 쓴[-1]['내용']['글'], 쓴[-1:] )
            본다('경고 줄 칸 — 글·건수·처음·마지막·기기', set(쓴[-1]['내용'].keys()) >= {'글', '건수', '처음', '마지막', '기기'})
            # ③ 수집 실패 — 띠 없음 · 줄에 더해짐 · 풀리면 다시 씀
            n = len(쓴)
            쪽.evaluate("() => ZG.보내기.수집결과('심폴', '로그인 실패')"); 쪽.wait_for_timeout(300)
            쓴 = 쪽.evaluate("() => window.__쓴")
            본다('수집 실패 — 경고 줄에 「심폴 주문 수집 실패 — 로그인 실패」 · 띠 없음', len(쓴) == n + 1 and '심폴 주문 수집 실패 — 로그인 실패' in 쓴[-1]['내용']['글'] and not 쪽.evaluate(띠있나))
            쪽.evaluate("() => { ZG.보내기.표시(); ZG.보내기.표시(); }"); 쪽.wait_for_timeout(300)
            본다('바뀐 게 없으면 다시 안 씀', len(쪽.evaluate("() => window.__쓴")) == n + 1)
            # ④ 1분 넘게 못 나간 기록 — 표 줄 보내기를 막고 오래된 큐 한 줄
            쪽.evaluate("() => { window.__막기 = true; const k = 'zg.v3.보낼것', q = JSON.parse(localStorage.getItem(k) || '{}'); q['메모|x1'] = { 표: '메모', id: 'x1', 값: { id: 'x1' }, 시각: Date.now() - 120000 }; localStorage.setItem(k, JSON.stringify(q)); }")
            쪽.close()
            쪽 = 새쪽(가짜 + "window.__막기 = true;"); 쪽.wait_for_function("() => window.__쓴.some(x => (x.내용.글 || '').indexOf('못 올라간') >= 0)", timeout=15000)
            쓴 = 쪽.evaluate("() => window.__쓴")
            본다('밀림 — 「서버에 못 올라간 기록 1건」 · 건수 1 · 띠 없음', 쓴 and '서버에 못 올라간 기록 1건' in 쓴[-1]['내용']['글'] and 쓴[-1]['내용']['건수'] == 1 and not 쪽.evaluate(띠있나), 쓴[-1:])
            본다('30초마다 다시 보내기·수집 실패 기록(이 기기)은 그대로', 쪽.evaluate("() => typeof ZG.보내기.깨우기 === 'function' && !!JSON.parse(localStorage.getItem('zg.v3.수집실패') || '{}')['심폴']"))
            쪽.screenshot(path=str(여기 / ('2-밀림-' + 틀 + '.png')), animations='disabled')
            # ⑤ 다 풀림 — 줄 비움(삭제됨)
            쪽.evaluate("""() => { window.__막기 = false; localStorage.setItem('zg.v3.끊김기록', 'null'); ZG.보내기.수집결과('심폴', null); }""")
            쪽.evaluate("() => ZG.보내기.깨우기()"); 쪽.wait_for_timeout(800)
            쪽.evaluate("() => ZG.보내기.표시()"); 쪽.wait_for_timeout(400)
            쓴 = 쪽.evaluate("() => window.__쓴")
            본다('다 풀리면 경고 줄 비움(삭제됨 · 내용 {})', 쓴[-1]['삭제됨'] is True and 쓴[-1]['내용'] == {}, 쓴[-1])
            본다('페이지 에러 0', not 오류, 오류[:3])
            쪽.close(); ctx.close()
        브.close()
finally:
    서버.kill()
print('\n%d/%d' % (sum(결과), len(결과)))
