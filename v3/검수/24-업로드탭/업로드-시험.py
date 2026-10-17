# -*- coding: utf-8 -*-
# 24단계 업로드 탭(작업중·완료) · 품절 「실패만 다시」·쿠팡 미확인 — python3 v3/검수/24-업로드탭/업로드-시험.py [실품절.json] [실업로드.json]
# 🔴 supabase CDN 을 막고 가짜 클라이언트를 끼운다 — 진짜 서버에 아무것도 안 쓴다. 실데이터 json 은 읽기만 해서 뜬 것.
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '24-업로드탭'
실품절 = json.loads(pathlib.Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else None
실업로드 = json.loads(pathlib.Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else None
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

지금 = int(time.time() * 1000)
분 = 60000
M7 = ['카페24', '심폴', '스마트스토어', '쿠팡', 'G마켓', '롯데ON', '11번가']
def 칸(상태, 사유='', 번호=None):
    k = {'상태': 상태, '사유': 사유, '때': 지금 - 분}
    if 번호: k['번호'] = 번호
    return k
def 줄(id앞, 코드, 갈래, 상태, 마켓=None, 답장=''):
    내 = {'누가': '시스템', '갈래': 갈래, '품목코드': 코드, '폴더': 코드, '상태': 상태, '보낸때': id앞, '답한때': id앞 + 분}
    if 마켓 is not None: 내['마켓'] = 마켓
    if 답장: 내['답장'] = 답장
    return {'id': '%d-%s' % (id앞, 코드[:8]), '내용': 내, '삭제됨': False}
다 = lambda 상태: {m: 칸(상태) for m in M7}

품목 = [
    {'품목코드': 'HEP01-15', '유통명': "휴케라 '팰리스퍼플'", '학명': 'Heuchera', '규격': '15cm 포트', '등록일시': 지금 - 1, '사진뺌': True},
    {'품목코드': 'CHR01-10', '유통명': '구절초 노랑 10cm', '학명': 'Dendranthema', '규격': '10cm 포트', '등록일시': 지금 - 2, '사진뺌': True},
    {'품목코드': 'CAR01-10', '유통명': '청사초', '학명': 'Carex', '규격': '10cm 포트', '등록일시': 지금 - 3, '사진뺌': True},
    {'품목코드': 'MON01-15', '유통명': '몬스테라 15cm화분', '학명': 'Monstera', '규격': '15cm 화분', '등록일시': 지금 - 4, '사진뺌': True},
    {'품목코드': 'GEN01-10', '유통명': '용담 보라 10cm', '학명': 'Gentiana', '규격': '10cm 포트', '등록일시': 지금 - 5},
    {'품목코드': 'SPD01-0', '유통명': "조팝나무 '더블플레이 두지'", '학명': 'Spiraea', '규격': 'C3', '등록일시': 지금 - 6},
]
업로드줄 = [
    줄(지금 - 30 * 분, 'HEP01-15', '카페24올리기', '실패', dict(카페24=칸('완료', 번호='312'), 심폴=칸('완료'), 쿠팡=칸('완료'),
                                                         G마켓=칸('실패', '전송불가 1건 — 원산지 입력 필요'))),
    줄(지금 - 60 * 분, 'CHR01-10', '카페24올리기', '됨', dict(카페24=칸('완료', 번호='313'), 심폴=칸('완료'), 쿠팡=칸('없음', '구근은 쿠팡에 안 올린다'))),
    줄(지금 - 900 * 분, 'CAR01-10', '카페24올리기', '됨', None, '청사초 업로드 완료'),
]
머리 = [{'id': 'CAR01-10', '내용': {'품목코드': 'CAR01-10', '카페24번호': '99', '올린때': 지금 - 900 * 분}}]
품절줄 = [
    # 10/17 SPD01 — 지시 「실패」(전송불가 11건 오판 + WING 로그인 풀림)지만 칸은 다 됐다 → 완료 · 쿠팡 노랑
    줄(지금 - 10 * 분, 'SPD01-0', '마켓품절', '실패', dict(다('완료'), 쿠팡=칸('실패', 'WING 확인 🔴 (아직 판매중이거나 로그인 풀림)')),
       "조팝나무 품절 처리 일부 실패\n🔴 전송불가 11건 — 그 마켓은 안 바뀌었다\n🔴 WING 로그인이 풀려 쿠팡을 확인 못 했다 — 9225"),
    줄(지금 - 12 * 분, 'HEP01-15', '마켓품절', '실패', dict(다('완료'), **{'11번가': 칸('실패', '로그인이 풀려 있음'), '롯데ON': 칸('실패', '응답 없음')})),
    줄(지금 - 14 * 분, 'GEN01-10', '마켓품절', '실패', dict(다('완료'), 카페24=칸('실패', '자사몰 응답 없음'))),
    줄(지금 - 16 * 분, 'MON01-15', '마켓판매', '됨', dict(다('완료'), 쿠팡=칸('미확인', '전송 완료 · 쿠팡 확인 못 함 (WING)'))),
]
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "if(!sessionStorage.getItem('심음')){sessionStorage.setItem('심음','1');localStorage.setItem('zg.v3.품목', %s);}"
        % json.dumps(json.dumps(품목, ensure_ascii=False), ensure_ascii=False))

# 가짜 supabase — 갈래(eq·in)로 거르고, upsert·invoke 는 기록만
가짜 = """([지시, 머리]) => {
  window.__쓴것 = []; window.__부른것 = []; window.__지시 = 지시; window.__머리 = 머리;
  const 질의 = (t) => { const q = { _갈: null, _gte: null,
    select(){return q}, order(){return q}, limit(){return q},
    eq(k, v){ if (k === '내용->>갈래') q._갈 = [v]; return q }, in(k, v){ if (k === '내용->>갈래') q._갈 = v; return q },
    gte(k, v){ q._gte = v; return q },
    upsert(r){ window.__부른것.push('upsert:' + t); window.__쓴것.push(r); return Promise.resolve({ error: null }); },
    then(ok, no){
      const rows = t === 'v3_지시' ? window.__지시.filter(r => (!q._갈 || q._갈.includes(r.내용.갈래)) && (!q._gte || r.id >= q._gte))
        : t === 'v3_원고' ? window.__머리 : [];
      return Promise.resolve({ data: rows, error: null }).then(ok, no); } }; return q; };
  ZG.서버.켜짐 = true;
  ZG.서버.클라이언트 = { from: (t) => 질의(t), storage: { from: () => ({ getPublicUrl: (k) => ({ data: { publicUrl: '/시안/_사진예시/' + (k.charCodeAt(0) % 3 + 1) + '.jpg' } }), list: () => Promise.resolve({ data: [] }) }) },
    functions: { invoke: (n, o) => { window.__부른것.push('invoke:' + n); return Promise.resolve({ data: { ok: true, 카페24: { 됨: true, 사유: '' } } }); } } };
  ZG.품절자료.새로(); ZG.품절자료.업로드새로();
}"""

서버 = subprocess.Popen([sys.executable, '-c', 'import functools, http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; '
                         'h.ThreadingHTTPServer(("", 8794), functools.partial(h.SimpleHTTPRequestHandler, directory=%r)).serve_forever()' % str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8794/index.html'

def 열기(브, 폰, 해시):
    ctx = 브.new_context(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1300},
                         device_scale_factor=2 if 폰 else 1, service_workers='block')
    쪽 = ctx.new_page()
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소 + 해시); 쪽.wait_for_timeout(1500)
    쪽.evaluate(가짜, [업로드줄 + 품절줄, 머리]); 쪽.wait_for_timeout(900)
    return ctx, 쪽, 오류

def 업로드탭(브, 폰):
    이름 = '폰' if 폰 else 'PC'
    print('\n── ' + 이름 + ' 업로드 탭')
    ctx, 쪽, 오류 = 열기(브, 폰, '#작업중')
    탭 = 쪽.eval_on_selector_all('.속탭 button' if 폰 else '.pc-tabs button', 'bs => bs.map(b => b.childNodes[0].textContent)')
    본다('탭 — 작업중 → 업로드', 탭 == (['입고', '재고', '품절', '업로드'] if 폰 else ['입고', '재고', '품절', '업로드', '이미지', '블로그']), 탭)
    켜 = 쪽.inner_text('.속탭 button.on' if 폰 else '.pc-tabs button.on')
    본다('옛 주소 #작업중 → 업로드 탭', 켜.startswith('업로드'), 켜)
    if not 폰: 본다('PC 경로 작업중', 쪽.inner_text('.pc-head .path') == '상품 › 업로드 › 작업중', 쪽.inner_text('.pc-head .path'))
    본다('작업중엔 정렬 숨김', 쪽.eval_on_selector('.사진거름 .정렬', 'e => e.hidden'))
    쪽.click('.갈래칩 .fchip:nth-child(2)'); 쪽.wait_for_timeout(900)
    if not 폰: 본다('PC 경로 완료', 쪽.inner_text('.pc-head .path') == '상품 › 업로드 › 완료', 쪽.inner_text('.pc-head .path'))
    본다('완료엔 정렬 보임', not 쪽.eval_on_selector('.사진거름 .정렬', 'e => e.hidden'))
    카 = '.업로드탭 ' + ('.sc' if 폰 else '.pcr')
    코드 = 쪽.eval_on_selector_all(카 + ' .cd', 'es => es.map(e => e.textContent)')
    본다('완료 품목만 · 올린 날 순', 코드[:3] == ['HEP01-15', 'CHR01-10', 'CAR01-10'] and 'GEN01-10' not in 코드, 코드)
    막대 = 쪽.eval_on_selector_all(카, '(cs, 폰) => cs.map(c => [...c.querySelectorAll(폰 ? ".bar i" : ".bar .sg")].map(i => i.className.replace("sg ", "").replace(" w", "")).join(","))', 폰)
    본다('7칸 — 새 카드(실패 1·기록 없음 3)', 막대[0] == 'ok,ok,unk,ok,fail,unk,unk', 막대[0])
    본다('7칸 — 옛 카드 = 카페24만 올림', 막대[2] == 'ok,' + ','.join(['unk'] * 6), 막대[2])
    분수 = 쪽.eval_on_selector_all(카 + ' .frac', 'es => es.map(e => e.textContent)')
    본다('분수 — 쿠팡 안 올림은 분모에서 뺌 · 옛은 기록 없음', 분수[:3] == ['3/7', '2/6', '기록 없음'], 분수)
    본다('실패 카드 빨간 테두리 · 「실패 1」', 쪽.eval_on_selector(카, 'c => c.classList.contains("bad")') and '실패 1' in 쪽.inner_text(카))
    본다('「올림」 날짜', '올림' in 쪽.inner_text(카 + ' .tt'))
    if 폰: 본다('폰 카드는 민칸(밀면 ↺)', 쪽.query_selector('.업로드탭 .민칸 .sc') is not None)
    쪽.screenshot(path=str(여기 / (이름 + '-1-완료목록.png')))
    손 = '' if 폰 else ' .hd'
    쪽.click(카 + ':nth-of-type(1)' + 손 if not 폰 else '.업로드탭 .민칸:nth-child(1) .sc'); 쪽.wait_for_timeout(900)
    열 = 카 + '.open'
    줄식 = '.mrow' if 폰 else 'table.mt tr:not(:first-child)'
    줄들 = 쪽.eval_on_selector_all(열 + ' ' + 줄식, 'rs => rs.map(r => r.innerText.replace(/\\s+/g, " ").trim())')
    본다('펼침 7줄 · 올림/실패/기록 없음', len(줄들) == 7 and '올림' in 줄들[0] and '실패' in 줄들[4] and '기록 없음' in 줄들[2], 줄들)
    본다('G마켓 사유', '원산지 입력 필요' in 쪽.inner_text(열))
    링 = 쪽.eval_on_selector_all(열 + ' a.lk', 'as => as.map(a => [a.getAttribute("href"), a.classList.contains("off")])')
    본다('카페24만 상품 보기 켜짐(주소) · 나머지 꺼짐',
         링[0] == ['https://www.zerogardening.com/product/detail.html?product_no=312', False] and all(x[1] for x in 링[1:]) and len(링) == 7, 링)
    본다('업로드엔 [다시]·실패만 다시 없음', not 쪽.query_selector(열 + ' [data-다시]'))
    if not 폰: 본다('PC ↺ 작업중으로 — 펼침 안쪽', 쪽.query_selector(열 + ' .되돌') is not None)
    쪽.screenshot(path=str(여기 / (이름 + '-2-펼침.png')))
    # 옛 카드 펼침
    if 폰: 쪽.click('.업로드탭 .민칸:nth-child(3) .sc')
    else: 쪽.click(카 + ':nth-of-type(3) .hd')
    쪽.wait_for_timeout(700)
    옛 = 쪽.eval_on_selector_all(카 + '.open', '(cs) => cs.map(c => c.querySelector("a.lk").getAttribute("href"))')
    본다('옛 카드 카페24 = 머리 번호 주소', 옛[-1] == 'https://www.zerogardening.com/product/detail.html?product_no=99', 옛)
    쪽.screenshot(path=str(여기 / (이름 + '-3-옛카드.png')))
    # 정렬 — 실패 먼저
    쪽.select_option('.사진거름 .정렬', '실패먼저'); 쪽.wait_for_timeout(400)
    본다('실패 먼저 정렬', 쪽.eval_on_selector_all(카 + ' .cd', 'es => es.map(e => e.textContent)')[0] == 'HEP01-15')
    # 검색
    if not 폰:
        쪽.click('.사진대기 .search .inp'); 쪽.keyboard.type('Carex'); 쪽.wait_for_timeout(600)
        본다('학명 검색 → 청사초', 쪽.eval_on_selector_all(카 + ' .cd', 'es => es.map(e => e.textContent)') == ['CAR01-10'])
        쪽.click('.사진대기 .search .지움'); 쪽.wait_for_timeout(400)
        # ↺ — 작업중으로 되돌리기 (로컬 저장소만)
        쪽.click(카 + '.open .되돌'); 쪽.wait_for_timeout(600)
        남 = 쪽.eval_on_selector_all(카 + ' .cd', 'es => es.map(e => e.textContent)')
        본다('↺ 누르면 완료에서 빠짐', 'HEP01-15' not in 남, 남)
    본다('콘솔 에러 없음', not 오류, 오류)
    if 실업로드:
        쪽.evaluate("(p) => { localStorage.setItem('zg.v3.품목', JSON.stringify(p)); ZG.저장소.부팅 && 0; }", 실업로드['품목'])
        쪽.reload(); 쪽.wait_for_timeout(1500)
        쪽.evaluate(가짜, [실업로드['지시'], 실업로드['원고']]); 쪽.wait_for_timeout(600)
        쪽.click('.갈래칩 .fchip:nth-child(2)'); 쪽.wait_for_timeout(1200)
        n = len(쪽.query_selector_all(카))
        완 = 쪽.evaluate("() => ZG.사진수집.대기품목(true, false).length")
        옛 = 쪽.eval_on_selector_all(카 + ' .frac', 'es => es.filter(e => e.textContent === "기록 없음").length')
        번호 = sum(1 for r in 실업로드['원고'] if (r.get('내용') or {}).get('카페24번호'))
        켜짐 = 쪽.evaluate("() => ZG.품절자료.업로드카드들().filter(c => c.칸[0].주소).length")
        본다('실데이터 — 완료 %d장 전부 옛 카드' % 완, n == 완 and 옛 == n, (n, 완, 옛))
        본다('실데이터 — 카페24 링크 = 머리 번호 있는 것만(%d)' % 번호, 켜짐 <= 번호 and 켜짐 > 0, 켜짐)
        쪽.evaluate('() => window.scrollTo(0, 0)')
        쪽.screenshot(path=str(여기 / (이름 + '-4-실데이터.png')))
        본다('실데이터 콘솔 에러 없음', not 오류, 오류)
    ctx.close()

def 품절탭(브, 폰):
    이름 = '폰' if 폰 else 'PC'
    print('\n── ' + 이름 + ' 품절 탭 — 실패만 다시')
    ctx, 쪽, 오류 = 열기(브, 폰, '#품절')
    카 = '.품절탭 ' + ('.sc' if 폰 else '.pcr')
    코드 = 쪽.eval_on_selector_all(카 + ' .cd', 'es => es.map(e => e.textContent)')
    본다('SPD01(칸 다 됨 · 쿠팡 미확인)은 실패 아님 → 완료 쪽', 코드.index('SPD01-0') > 코드.index('GEN01-10'), 코드)
    막 = 쪽.eval_on_selector_all(카, '(cs, 폰) => cs.map(c => [c.querySelector(".cd").textContent, [...c.querySelectorAll(폰 ? ".bar i" : ".bar .sg")].map(i => i.className.replace("sg ", "").replace(" w", "")).join(",")])', 폰)
    막 = dict(막)
    본다('옛 WING 오판 → 쿠팡 노랑(chk)', 막['SPD01-0'] == 'ok,ok,ok,chk,ok,ok,ok', 막['SPD01-0'])
    본다('미확인 상태 → 노랑', 막['MON01-15'] == 'ok,ok,ok,chk,ok,ok,ok', 막['MON01-15'])
    배 = 쪽.eval_on_selector('[data-품절배지]', 'b => b.textContent')
    본다('배지 = 진짜 실패 2장(HEP·GEN)', 배 == '2', 배)
    손 = '' if 폰 else ' .hd'
    i = 코드.index('HEP01-15') + 1
    쪽.click(카 + ':nth-child(%d)' % i + 손); 쪽.wait_for_timeout(900)
    열 = 카 + '.open'
    단 = 쪽.eval_on_selector_all(열 + ' .redo button', 'bs => bs.map(b => b.innerText.replace(/\\s+/g, ""))')
    본다('두 단추 — 순서 ' + ('폰 주·보조' if 폰 else 'PC 보조·주'), 단 == (['실패만다시(2곳)', '품절전체다시'] if 폰 else ['품절전체다시', '실패만다시(2곳)']), 단)
    본다('실패 줄마다 [다시]', len(쪽.query_selector_all(열 + ' .btn.rd')) == 2)
    쪽.screenshot(path=str(여기 / (이름 + '-5-품절실패만다시.png')))
    쪽.click(열 + ' .redo .btn.warn'); 쪽.wait_for_timeout(300)
    제 = 쪽.inner_text('.askbox')
    본다('확인창 — 고른 마켓 이름', '롯데ON · 11번가 다시 보냅니다' in 제, 제)
    쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(500)
    쓴 = 쪽.evaluate('() => window.__쓴것.filter(x => x[0] && x[0].내용 && x[0].내용.갈래).map(x => x[0].내용)')
    부 = 쪽.evaluate('() => window.__부른것')
    u = 쓴[-1] if 쓴 else {}
    본다('실패만 다시 — 대상만 · 카페24 Edge 안 부름', u.get('대상') == ['롯데ON', '11번가'] and u.get('갈래') == '마켓품절' and 'invoke:market-soldout' not in 부, (u.get('대상'), 부))
    본다('대상 밖 칸은 원줄에서 옮김 · 대상 칸은 비움', set(u.get('마켓', {})) == {'카페24', '심폴', '스마트스토어', '쿠팡', 'G마켓'} and u.get('상태') == '대기', u.get('마켓'))
    # 카페24 [다시] — Edge 먼저
    쪽.click(열 + ' .chev' if 폰 else 열 + ' .hd'); 쪽.wait_for_timeout(400)
    j = 코드.index('GEN01-10') + 1
    쪽.click(카 + ':nth-child(%d)' % j + 손); 쪽.wait_for_timeout(900)
    쪽.click(카 + '.open .btn.rd'); 쪽.wait_for_timeout(300)
    쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(600)
    쓴 = 쪽.evaluate('() => window.__쓴것.filter(x => x[0] && x[0].내용 && x[0].내용.갈래).map(x => x[0].내용)')
    부 = 쪽.evaluate('() => window.__부른것')
    u = 쓴[-1]
    본다('카페24 [다시] — Edge 먼저 · 맥 몫 없으니 바로 됨', 'invoke:market-soldout' in 부 and u.get('대상') == ['카페24']
         and u['마켓']['카페24']['상태'] == '완료' and u.get('상태') == '됨', (부, u.get('상태')))
    본다('콘솔 에러 없음', not 오류, 오류)
    if 실품절:
        쪽.evaluate("(r) => { window.__지시 = r; ZG.품절자료.새로(); }", 실품절); 쪽.wait_for_timeout(700)
        스 = 쪽.evaluate("() => ZG.품절자료.카드들().filter(c => c.품목코드 === 'SPD01-0' || c.품목코드 === 'ASJ01-15').map(c => [c.품목코드, c.무리, c.칸[3].값])")
        본다('실데이터 — SPD01·ASJ01 쿠팡 노랑 · 실패 아님', all(x[1] != '실패' and x[2] == 'chk' for x in 스) and len(스) == 2, 스)
        쪽.evaluate('() => window.scrollTo(0, 0)')
        쪽.screenshot(path=str(여기 / (이름 + '-6-품절실데이터.png')))
    ctx.close()

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            업로드탭(브, 폰)
            품절탭(브, 폰)
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
