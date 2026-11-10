# -*- coding: utf-8 -*-
# 43 가볍게 받기(11/10) — 화면마다 필요한 표만 받기 · 수집 뒤 주문 표만 다시 · 엑셀 도구 쓸 때만 · 시드 안 싣기
#   python3 받기-시험.py <전 v3 뿌리> [표본.json]
#     전 = 고치기 전 사본(`git archive <커밋> v3 | tar -x -C <임시>`) · 후 = 지금 v3 · 같은 시험을 양쪽에 돌려 맞댄다
#     표본.json = 표마다 진짜 모양 줄 몇 개({표: [{id,내용,삭제됨,수정시각}]}) — 손님 자료라 저장소에 안 둔다. 없으면 시드만
# 🔴 실서버 안 씀 — supabase CDN·주소를 막고 가짜 클라이언트(받은 표·구독 표·함수 호출을 적는다)를 심는다
import json, pathlib, re, subprocess, sys, time
from urllib.parse import unquote
from playwright.sync_api import sync_playwright

후뿌리 = pathlib.Path(__file__).resolve().parents[2]
전뿌리 = pathlib.Path(sys.argv[1])
표본 = json.loads(pathlib.Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else {}
여기 = pathlib.Path(__file__).resolve().parent
표들 = ['품목', '입고', '출고', '재고조정', '업체', '주문', '주문묶음', '명세서', '명세서줄', '견적요청', '즐겨찾기', '분류폴더',
        '심폴짝', '운임손질', '고객', '문자', '메모', '제작요청', '블로그', '문자주문']
쪽들 = ['index.html', '주문.html', '메모.html', '소싱.html', '업체.html', '지시.html', '현황판.html', '이사.html']
탭고르개 = '.pc-tabs button, .toggle button, .stabs button, .subtabs button'
글뽑기 = """() => document.body.innerText.replace(/\\d{1,2}:\\d{2}(:\\d{2})?/g, 'HH:MM').replace(/\\d+초 전|\\d+분 전/g, 'N전')"""
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

# 가짜 Supabase — 체인 아무 함수나 받고 then 에서 답한다. 표받기(range) 만 「받은 표」로 센다
가짜 = """(() => {
  const 자료 = window.__가짜자료 || {}, 기록 = window.__기록 = { 받은: [], 구독: [], 함수: [], 읽은: {} };
  const 옛 = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) { if (String(k).startsWith('zg.v3.')) 기록.읽은[k.slice(6)] = 1; return 옛.call(this, k); };
  function 답(표, 일) {
    const 이름 = 일.map(x => x[0]);
    if (이름.some(n => /upsert|insert|update|delete/.test(n))) return { data: null, error: null };
    const eq = 일.find(x => x[0] === 'eq');
    if (표 === 'v3_공유설정' && eq && eq[1][1] === '서버상태') return { data: { 내용: { 올림완료: true } }, error: null };
    if (이름.includes('maybeSingle') || 이름.includes('single')) return { data: null, error: null };
    const r = 일.find(x => x[0] === 'range');
    if (!r) return { data: [], error: null, count: 0 };
    기록.받은.push(표.replace('v3_', ''));
    return { data: (자료[표.replace('v3_', '')] || []).slice(r[1][0], r[1][1] + 1), error: null };
  }
  function 체인(표, 일) {
    return new Proxy(function () {}, { get(_, k) {
      if (k === 'then') return (ok, no) => Promise.resolve(답(표, 일)).then(ok, no);
      return (...a) => 체인(표, 일.concat([[k, a]]));
    } });
  }
  const 채널 = (이름) => ({ on(ev, 거름, cb) { if (거름 && 거름.table) 기록.구독.push(거름.table.replace('v3_', '')); return this; },
    subscribe(cb) { if (cb) setTimeout(() => cb('SUBSCRIBED'), 0); return this; }, unsubscribe() { return Promise.resolve(); } });
  const 손 = {
    from: (표) => 체인(표, []), channel: 채널, removeChannel: () => Promise.resolve(), getChannels: () => [],
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't', user: { id: 'u' } } } }),
            getUser: () => Promise.resolve({ data: { user: { id: 'u' } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    functions: { invoke: (n, o) => { 기록.함수.push(n); return Promise.resolve({ data: { ok: true, 새것: 1 }, error: null }); } },
    storage: { from: () => 체인('storage', []) }
  };
  Object.defineProperty(window, 'supabase', { value: { createClient: () => 손 }, writable: false });
})();"""
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"

def 기대표(뿌리, h):
    m = re.search(r'01b-서버\.js[^"]*"(?:\s+data-표="([^"]*)")?', (뿌리 / h).read_text())
    return None if m.group(1) is None else [t for t in m.group(1).split(',') if t]

def 자료만들기(브, 포트):
    """시드(00-시드.js)로 품목·입고·주문 등을 만들고 표본 줄을 더한다 → {표: [서버 줄]}"""
    쪽 = 브.new_page(); 쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.goto(f'http://localhost:{포트}/login.html')
    for f in ['01-저장소.js', '02-품목코드.js', '00-시드.js']:
        쪽.add_script_tag(url=f'http://localhost:{포트}/js/{f}')
    자 = 쪽.evaluate("""(표들) => { ZG.시드.심기(); const o = {};
      표들.forEach(t => { o[t] = ZG.저장소.읽기('zg.v3.' + t).map(r => ({ id: String(t === '품목' ? r.품목코드 : t === '즐겨찾기' ? r.키워드 : t === '분류폴더' ? r.이름 : r.id),
        내용: r, 삭제됨: false, 수정시각: '2026-11-10T00:00:00.000000+00:00' })); }); return o; }""", 표들)
    쪽.close()
    for t, 줄들 in 표본.items(): 자[t] = 자.get(t, []) + 줄들
    return 자

def 새쪽(브, 폰, 자):
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                     device_scale_factor=1, service_workers='block', reduced_motion='reduce', accept_downloads=True)
    쪽._오류, 쪽._받은파일 = [], []
    쪽.on('pageerror', lambda e: 쪽._오류.append('pageerror ' + str(e)))
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text
          and 'Failed to load resource' not in m.text else None)
    쪽.on('request', lambda q: 쪽._받은파일.append(unquote(q.url.split('?')[0].rsplit('/', 1)[-1])))
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script('window.__가짜자료 = ' + json.dumps(자, ensure_ascii=False) + ';' + 가짜 + 심기)
    return 쪽

def 돌리기(뿌리, 포트, 출):
    출.mkdir(parents=True, exist_ok=True)
    서버 = subprocess.Popen([sys.executable, str(pathlib.Path(__file__).resolve().parents[1] / '_시험서버.py'), str(포트), str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2); 주 = f'http://localhost:{포트}/'; 판 = {}
    def 찍기(쪽, 이름):
        쪽.wait_for_timeout(600)
        쪽.evaluate("""() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
          while ((n = w.nextNode())) if (/NO\\. \\d{8}-\\d{4}/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/(NO\\. \\d{8})-\\d{4}/, '$1-시각'); }""")   # 명세서 번호 = 만든 시각
        판['글:' + 이름] = 쪽.evaluate(글뽑기)
        판['수:' + 이름] = 쪽.evaluate("() => [...document.querySelectorAll('*')].filter(e => e.tagName !== 'SCRIPT').length")
        파일 = re.sub(r'[^\w가-힣.-]', '_', 이름) + '.png'; 쪽.screenshot(path=str(출 / 파일)); 판['그림:' + 이름] = 파일
    try:
        with sync_playwright() as p:
            브 = p.chromium.launch(); 자 = 자료만들기(브, 포트)
            for 폰 in (False, True):
                for h in 쪽들:
                    쪽 = 새쪽(브, 폰, 자); 틀 = ('폰' if 폰 else 'PC') + ':' + h
                    쪽.goto(주 + h); 쪽.wait_for_timeout(2500); 찍기(쪽, 틀)
                    n = 쪽.locator(탭고르개).count()
                    for i in range(min(n, 12)):
                        탭 = 쪽.locator(탭고르개).nth(i)
                        if not 탭.is_visible(): continue
                        글 = (탭.inner_text() or '').strip().replace('\n', ' ')[:12]
                        탭.click(); 찍기(쪽, f'{틀}:탭{i}:{글}')
                    판['기록:' + 틀] = 쪽.evaluate('() => __기록'); 판['파일:' + 틀] = sorted(set(쪽._받은파일)); 판['오류:' + 틀] = 쪽._오류
                    쪽.close()
            # 상품 — 품목 골라 지우기: 딸린 주문 줄 수가 확인창에 나와야 한다(주문 표를 그때 받는다)
            쪽 = 새쪽(브, False, 자); 쪽.goto(주 + 'index.html'); 쪽.wait_for_timeout(2500)
            코드 = 쪽.evaluate("() => { const 주 = ZG.저장소.읽기(ZG.저장소.키.품목).map(p => p.품목코드); return 주[0]; }")
            앞 = 쪽.evaluate('() => __기록.받은.length')
            쪽.evaluate("(c) => { ZG.재고목록.상태.선택[c] = true; ZG.재고수정.선택삭제(); }", 코드); 쪽.wait_for_timeout(800)
            판['지우기:확인창'] = 쪽.locator('.askbox').first.inner_text() if 쪽.locator('.askbox').count() else '없음'
            판['지우기:더받은표'] = 쪽.evaluate('(n) => __기록.받은.slice(n)', 앞); 판['오류:지우기'] = 쪽._오류; 쪽.close()
            # 주문 — 「새로 받기」(카페24·심폴 수집) 뒤 다시 받는 표
            쪽 = 새쪽(브, False, 자); 쪽.goto(주 + '주문.html'); 쪽.wait_for_timeout(2500)
            앞 = 쪽.evaluate('() => __기록.받은.length')
            단 = 쪽.locator('button', has_text=re.compile('주문수집'))
            판['수집:단추수'] = 단.count()
            if 단.count(): 단.first.click(); 쪽.wait_for_timeout(3000)
            판['수집:부른함수'] = 쪽.evaluate('() => __기록.함수')
            판['수집:더받은표'] = sorted(set(쪽.evaluate('(n) => __기록.받은.slice(n)', 앞)))
            판['오류:수집'] = 쪽._오류; 쪽.close()
            # 주문 — 엑셀 도구: 화면 열 때는 안 받고, 배송완료 창·고른 주문 로젠 파일을 누를 때 받는다
            쪽 = 새쪽(브, False, 자); 쪽.goto(주 + '주문.html'); 쪽.wait_for_timeout(2500)
            판['엑셀:열때받음'] = 'xlsx.min.js' in 쪽._받은파일
            쪽.evaluate('() => ZG.주문파일.배송완료()'); 쪽.wait_for_function('() => !!window.XLSX && !!document.querySelector(".pcscrim")', timeout=15000)
            판['엑셀:배송완료창'] = 쪽.locator('.pcscrim').count() > 0
            쪽.evaluate('() => ZG.배송완료창.닫기()')
            판['엑셀:창뒤XLSX'] = 쪽.evaluate('() => typeof XLSX.writeFile')
            판['오류:엑셀'] = 쪽._오류; 쪽.close()
            쪽 = 새쪽(브, False, 자); 쪽.goto(주 + '주문.html'); 쪽.wait_for_timeout(2500)
            쪽.evaluate("""() => ZG.주문올리기.로젠만들기(ZG.저장소.읽기(ZG.저장소.키.주문).filter(r => r.수령인 && r.수령인주소).slice(0, 2))""")
            쪽.wait_for_timeout(500)
            with 쪽.expect_download(timeout=20000) as 받:
                쪽.locator('button', has_text='로젠 대량등록 파일 내려받기').click()
            판['엑셀:로젠파일'] = 받.value.suggested_filename.endswith('.xlsx')
            판['오류:로젠'] = 쪽._오류; 쪽.close()
            브.close()
    finally:
        서버.terminate(); 서버.wait()
    (출 / '결과.json').write_text(json.dumps(판, ensure_ascii=False, indent=1))
    return 판

if __name__ == '__main__':
    from PIL import Image, ImageChops
    전 = 돌리기(전뿌리, 8841, 여기 / '전'); 후 = 돌리기(후뿌리, 8842, 여기 / '후')

    print('① 화면마다 받은 표·구독 표 = html data-표 (없으면 전부) · 읽은 표도 그 안')
    for k in [k for k in 후 if k.startswith('기록:')]:
        h = k.split(':')[2]; 기 = 기대표(후뿌리, h); 기 = 표들 + ['공유설정'] if 기 is None else 기
        r = 후[k]
        본다(f'{k[3:]} 받은 표', sorted(set(r['받은'])) == sorted(기), f"{len(set(r['받은']))}개")
        본다(f'{k[3:]} 구독 표', sorted(set(t for t in r['구독'] if t in 표들 + ['공유설정'])) == sorted(기))
        밖 = [t for t in r['읽은'] if t in 표들 and t not in 기]
        본다(f'{k[3:]} 안 받은 표를 안 읽음', not 밖, 밖)
    print('화면 그림·글자 — 전/후 같음')
    같, 다른 = 0, []
    for k in [k for k in 전 if k[:2] in ('글', '수', '그림')]:
        x, y = 전.get(k), 후.get(k)
        if k.startswith('그림:') and x and y:
            a, b = Image.open(여기 / '전' / x).convert('RGB'), Image.open(여기 / '후' / y).convert('RGB')
            same = a.size == b.size and sum(ImageChops.difference(a.convert('L'), b.convert('L')).histogram()[41:]) == 0   # 글꼴 가장자리 잡티는 빼고
        else: same = x == y
        if same: 같 += 1
        else: 다른.append(k)
    본다(f'화면 {같}/{같 + len(다른)} 같음', not 다른, 다른[:8])
    print('상품 골라 지우기')
    본다('확인창 글 전/후 같음(딸린 주문 줄 수 포함)', 전['지우기:확인창'] == 후['지우기:확인창'], 후['지우기:확인창'][:90].replace('\n', ' '))
    본다('그때 주문 표만 받음', 후['지우기:더받은표'] == ['주문'], 후['지우기:더받은표'])
    print('주문 새로 받기')
    본다('카페24·심폴 수집 함수를 부름', {'order-collect', 'simpol-collect'} <= set(후['수집:부른함수']), 후['수집:부른함수'])
    본다('수집 뒤 주문·주문묶음만 다시 받음', 후['수집:더받은표'] == ['주문', '주문묶음'], f"전 {len(전['수집:더받은표'])}개 → 후 {후['수집:더받은표']}")
    print('엑셀 도구')
    본다('주문 화면 열 때 xlsx 안 받음', 후['엑셀:열때받음'] is False, f"전 {전['엑셀:열때받음']} → 후 {후['엑셀:열때받음']}")
    본다('배송완료 창 — 누르면 받아서 열림', 후['엑셀:배송완료창'] and 후['엑셀:창뒤XLSX'] == 'function')
    본다('고른 주문 로젠 파일 — 엑셀 받아 내려받기', 후['엑셀:로젠파일'] is True)
    print('시드')
    본다('어느 화면도 00-시드.js 안 받음', not any('00-시드.js' in v for k, v in 후.items() if k.startswith('파일:')))
    오 = {k: v for k, v in 후.items() if k.startswith('오류:') and v}
    본다('콘솔 빨간 에러 0 (후)', not 오, json.dumps(오, ensure_ascii=False)[:400])
    print(f'{sum(결과)}/{len(결과)}')
    sys.exit(0 if all(결과) else 1)
