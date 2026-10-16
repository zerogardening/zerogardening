# -*- coding: utf-8 -*-
# 23단계 품절 탭(+후속: 옛 줄 마켓 7줄 · 간격) · 06k 순서 · 학명 복사 — python3 v3/검수/23-품절탭/품절-시험.py [실줄.json]
# 🔴 supabase CDN 을 막고 가짜 클라이언트를 끼운다 — 진짜 서버에 아무것도 안 쓴다.
#    실줄.json(있으면) = `v3_지시` 마켓품절·판매 줄을 읽기만 해서 뜬 것. 옛 줄 모양 확인용.
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '23-품절탭'
실줄 = json.loads(pathlib.Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else None
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

지금 = int(time.time() * 1000)
분 = 60000
def 줄(id앞, 코드, 갈래, 상태, 마켓=None, 답장='', 폴더=''):
    내 = {'누가': '시스템', '갈래': 갈래, '품목코드': 코드, '폴더': 폴더 or 코드, '상태': 상태, '보낸때': id앞}
    if 마켓 is not None: 내['마켓'] = 마켓
    if 답장: 내['답장'] = 답장
    return {'id': '%d-%s' % (id앞, 코드[:8]), '내용': 내, '삭제됨': False}
def 칸(상태, 사유='', 때=None): return {'상태': 상태, '사유': 사유, '때': 때 or 지금}
M7 = ['카페24', '심폴', '스마트스토어', '쿠팡', 'G마켓', '롯데ON', '11번가']
다 = lambda 상태: {m: 칸(상태) for m in M7}
가짜줄 = [
    줄(지금 - 3 * 분, 'GEN01-10', '마켓품절', '대기', {'카페24': 칸('완료')}),
    줄(지금 - 5 * 분, 'CHR01-10', '마켓판매', '하는중', {'카페24': 칸('완료')}),
    줄(지금 - 12 * 분, 'HEP01-15', '마켓품절', '실패', dict(다('완료'), **{'11번가': 칸('실패', '로그인이 풀려 있음'), '롯데ON': 칸('없음')})),
    줄(지금 - 60 * 분, 'ANH01-15', '마켓품절', '실패', None, '아네모네 하이브리드 품절 처리 일부 실패\n❌ 키체인에 심폴 로그인이 없다 — `python3 상품/_도구/심폴열쇠.py 넣기` 를 먼저 돌린다.\n'
         '🔴 전송요청 창이 안 떴다 — 아무것도 안 나갔다\n🔴 WING 로그인이 풀려 쿠팡을 확인 못 했다 — 9225 크롬 창에서 로그인 후 다시 본다', '아네모네 하이브리드'),
    줄(지금 - 150 * 분, 'CAR01-10', '마켓품절', '됨', 다('완료')),
    줄(지금 - 200 * 분, 'ANP01-15', '마켓품절', '됨', None, '추명국 품절 처리 완료', '추명국 핑크터치'),
    줄(지금 - 1300 * 분, 'MON01-15', '마켓품절', '됨', dict(다('완료'), 심폴=칸('없음'))),
    줄(지금 - 2000 * 분, 'HEP01-15', '마켓품절', '됨', 다('완료')),       # 같은 품목 옛 줄 — 안 보여야 한다
]
품목 = [
    {'품목코드': 'HEP01-15', '유통명': "휴케라 '팰리스퍼플'", '학명': "Heuchera micrantha 'Palace Purple'", '규격': '15cm 포트', '등록일시': 지금 - 1},
    {'품목코드': 'CHR01-10', '유통명': '구절초 노랑 10cm', '학명': 'Dendranthema zawadskii', '규격': '10cm 포트', '등록일시': 지금 - 2},
    {'품목코드': 'GEN01-10', '유통명': '용담 보라 10cm', '학명': 'Gentiana scabra', '규격': '10cm 포트', '등록일시': 지금 - 3},
    {'품목코드': 'MON01-15', '유통명': '몬스테라 15cm화분', '학명': 'Monstera deliciosa', '규격': '15cm 화분', '등록일시': 지금 - 4},
    {'품목코드': 'CAR01-10', '유통명': '청사초', '학명': '', '규격': '10cm 포트', '등록일시': 지금 - 5},
]
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "localStorage.setItem('zg.v3.품목', %s);" % json.dumps(json.dumps(품목, ensure_ascii=False), ensure_ascii=False))

# 가짜 supabase — select 는 주어진 줄, upsert·invoke 는 기록만. 20초 기다림은 50ms 로 줄인다
가짜 = """(줄들) => {
  window.__쓴것 = []; window.__부른것 = []; window.__줄들 = 줄들;
  window.__invoke = () => Promise.resolve({ data: { ok: true, 카페24: { 됨: true, 사유: '' } } });
  const 질의 = (t) => { const q = { _gte: null,
    select(){return q}, eq(){return q}, in(){return q}, order(){return q}, limit(){return q},
    gte(k, v){ q._gte = v; return q },
    upsert(r){ window.__부른것.push('upsert:' + t); window.__쓴것.push(r); return Promise.resolve({ error: null }); },
    then(ok, no){ const rows = t === 'v3_지시' ? window.__줄들.filter(r => !q._gte || r.id >= q._gte) : [];
                  return Promise.resolve({ data: rows, error: null }).then(ok, no); } }; return q; };
  ZG.서버.켜짐 = true;
  ZG.서버.클라이언트 = { from: (t) => 질의(t),
    functions: { invoke: (n, o) => { window.__부른것.push('invoke:' + n); return window.__invoke(o); } } };
  ZG.품절자료.새로();
}"""

# 기본 http.server 는 대기열이 5라 스크립트 90여 개를 한꺼번에 받으면 끊긴다(ERR_CONNECTION_RESET) — 늘린다
서버 = subprocess.Popen([sys.executable, '-c', 'import functools, http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; '
                         'h.ThreadingHTTPServer(("", 8793), functools.partial(h.SimpleHTTPRequestHandler, directory=%r)).serve_forever()' % str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8793/index.html'

def 열기(브, 폰, 해시):
    ctx = 브.new_context(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1500},
                         device_scale_factor=2 if 폰 else 1, permissions=['clipboard-read', 'clipboard-write'], service_workers='block')
    쪽 = ctx.new_page()
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소 + 해시); 쪽.wait_for_timeout(1500)
    return ctx, 쪽, 오류

def 새로(쪽, 줄들):
    쪽.evaluate("(r) => { window.__줄들 = r; ZG.품절자료.새로(); }", 줄들); 쪽.wait_for_timeout(400)

def 품절탭(브, 폰):
    이름 = '폰' if 폰 else 'PC'
    print('\n── ' + 이름 + ' 품절 탭')
    ctx, 쪽, 오류 = 열기(브, 폰, '#품절')
    빈 = 쪽.inner_text('.품절탭')
    본다('서버 꺼짐이면 오류 글 · 배지 숨김', '인터넷이 안 닿습니다' in 빈 and 쪽.eval_on_selector('[data-품절배지]', 'b => b.hidden'), 빈)
    쪽.evaluate(가짜, 가짜줄); 쪽.wait_for_timeout(900)
    탭 = 쪽.eval_on_selector_all('.속탭 button' if 폰 else '.pc-tabs button', 'bs => bs.map(b => b.childNodes[0].textContent)')
    본다('탭 순서', 탭 == (['입고', '재고', '품절', '작업중'] if 폰 else ['입고', '재고', '품절', '작업중', '이미지', '블로그']), 탭)
    배 = 쪽.eval_on_selector('[data-품절배지]', 'b => [b.hidden, b.textContent, b.classList.contains("빨강")]')
    본다('배지 = 실패 카드 수(빨강)', 배 == [False, '2', True], 배)
    if 폰:
        본다('폰 제목 「상품」', 쪽.inner_text('.ph-top h1') == '상품')
        본다('아래 탭 「상품」', '상품' in 쪽.inner_text('.ph-nav button.on'))
    else:
        알 = 쪽.evaluate("() => { const b = document.querySelector('.pc-tabs button.on'), i = document.querySelector('.pc-tabs .ind'); return [b.offsetWidth, parseFloat(i.style.width)]; }")
        본다('알약 너비 = 켜진 탭(배지 포함)', abs(알[0] - 알[1]) < 1, 알)
    칩 = 쪽.eval_on_selector_all('.품절탭 .fchip', 'bs => bs.map(b => b.innerText.replace(/\\s+/g, ""))')
    본다('칩 넷 숫자', 칩 == ['전체7', '실패2', '진행중2', '완료3'], 칩)
    카 = '.sc' if 폰 else '.pcr'
    코드 = 쪽.eval_on_selector_all('.품절탭 ' + 카 + ' .cd', 'es => es.map(e => e.textContent)')
    본다('정렬 실패(최근)→진행중(먼저)→완료(최근) · 같은 품목 한 장', 코드 == ['HEP01-15', 'ANH01-15', 'CHR01-10', 'GEN01-10', 'CAR01-10', 'ANP01-15', 'MON01-15'], 코드)
    막대 = 쪽.eval_on_selector_all('.품절탭 ' + 카, '(cs, 폰) => cs.map(c => [...c.querySelectorAll(폰 ? ".bar i" : ".bar .sg")].map(i => i.className.replace("sg ", "")).join(","))', 폰)
    본다('7칸 — 실패카드', 막대[0] == 'ok,ok,ok,ok,ok,none,fail', 막대[0])
    본다('7칸 — 진행중(하는중)', 막대[2] == 'ok,run,run,run,run,run,run', 막대[2])
    본다('7칸 — 대기', 막대[3] == 'ok,wait,wait,wait,wait,wait,wait', 막대[3])
    본다('7칸 — 옛 줄 됨 = 기록 없음', 막대[5] == ','.join(['unk'] * 7), 막대[5])
    본다('7칸 — 옛 줄 실패 = 답장에 이름 찍힌 마켓만 실패, 나머지 기록 없음', 막대[1] == 'unk,fail,unk,fail,unk,unk,unk', 막대[1])
    본다('옛 줄 실패 칩 = 뽑은 실패 수', '실패 2' in 쪽.inner_text('.품절탭 ' + 카 + ':nth-child(2)'))
    분수 = 쪽.eval_on_selector_all('.품절탭 ' + 카 + ' .frac', 'es => es.map(e => e.textContent)')
    본다('분수 — 없음은 분모에서 뺌 · 옛 줄은 기록 없음', 분수 == ['5/6', '기록 없음', '1/7', '1/7', '7/7', '기록 없음', '6/6'], 분수)
    if 폰:
        간 = 쪽.evaluate("() => { const t = document.querySelector('.속탭').getBoundingClientRect(), c = document.querySelector('.품절탭 .fchips').getBoundingClientRect(), k = document.querySelector('.품절탭 .sc').getBoundingClientRect(); return [c.top - t.bottom, k.top - c.bottom]; }")
        본다('간격 — 속탭→칩 ≥ 24 · 칩→첫 카드 ≥ 12', 간[0] >= 24 and 간[1] >= 12, 간)
    else:
        간 = 쪽.evaluate("() => { const t = document.querySelector('.pc-tabs').getBoundingClientRect(), d = document.querySelector('.품절탭 .card').getBoundingClientRect(), h = document.querySelector('.품절탭 .ch').getBoundingClientRect(), k = document.querySelector('.품절탭 .pcr').getBoundingClientRect(); return [d.top - t.bottom, k.top - h.bottom]; }")
        본다('간격 — 탭→카드 ≥ 24 · 머리→첫 행 ≥ 22', 간[0] >= 24 and 간[1] >= 22, 간)
    본다('실패 칩 「실패 1」', '실패 1' in 쪽.inner_text('.품절탭 ' + 카 + ':nth-child(1)'))
    본다('다시 판매 꼬리표', 쪽.inner_text('.품절탭 ' + 카 + ':nth-child(3) .ktag') == '다시 판매')
    쪽.screenshot(path=str(여기 / ('후속-' + 이름 + '-1-목록.png')))

    손 = '' if 폰 else ' .hd'
    쪽.click('.품절탭 ' + 카 + ':nth-child(1)' + 손); 쪽.wait_for_timeout(900)
    if 폰:
        줄들 = 쪽.eval_on_selector_all('.품절탭 .sc.open .mrow', 'rs => rs.map(r => r.innerText.replace(/\\s+/g, " "))')
        본다('펼침 7줄 · 방식 글', len(줄들) == 7 and '재고 0' in 줄들[0] and '판매중지' in 줄들[6], 줄들)
        본다('실패 사유 줄', '로그인이 풀려 있음' in 쪽.inner_text('.품절탭 .sc.open .why'))
    else:
        줄들 = 쪽.eval_on_selector_all('.품절탭 .pcr.open table.mt tr', 'rs => rs.map(r => r.innerText.replace(/\\s+/g, " "))')
        본다('펼침 표 머리+7줄 · 사유', len(줄들) == 8 and '로그인이 풀려 있음' in 줄들[7], 줄들)
    본다('chev ⌃', 쪽.inner_text('.품절탭 ' + 카 + '.open .chev') == '⌃')
    쪽.screenshot(path=str(여기 / ('후속-' + 이름 + '-2-펼침.png')))
    # 폴링 다시그리기에도 펼침 유지
    새로(쪽, [dict(r) for r in 가짜줄] + [줄(지금 - 4000 * 분, 'ZZZ01-1', '마켓품절', '됨', 다('완료'))])
    본다('폴링 다시 그려도 펼친 채', 쪽.query_selector('.품절탭 ' + 카 + '.open') is not None)
    새로(쪽, 가짜줄)
    # 옛 줄 펼침 — 답장 원문 대신 마켓 7줄, 사유는 그 마켓 한 줄만
    쪽.click('.품절탭 ' + 카 + ':nth-child(1)' + 손)
    쪽.click('.품절탭 ' + 카 + ':nth-child(2)' + 손); 쪽.click('.품절탭 ' + 카 + ':nth-child(6)' + 손); 쪽.wait_for_timeout(900)
    줄식 = '.mrow' if 폰 else 'table.mt tr:not(:first-child)'
    옛 = 쪽.eval_on_selector_all('.품절탭 ' + 카 + '.open', '(cs, s) => cs.map(c => [...c.querySelectorAll(s)].map(r => r.innerText.replace(/\\s+/g, " ").trim()))', 줄식)
    본다('옛 줄 둘 다 마켓 7줄', len(옛) == 2 and all(len(x) == 7 for x in 옛), 옛)
    본다('옛 실패 — 심폴·쿠팡만 실패 · 나머지 기록 없음', 옛 and '실패' in 옛[0][1] and '실패' in 옛[0][3] and '기록 없음' in 옛[0][0] and '기록 없음' in 옛[0][2], 옛 and 옛[0])
    사유 = 쪽.inner_text('.품절탭 ' + 카 + ':nth-child(2)')
    본다('사유는 짧은 한 줄 — 원문·명령·이름 없는 줄 안 보임', '키체인에 심폴 로그인이 없다' in 사유 and 'WING 로그인이 풀려 쿠팡을 확인 못 했다' in 사유
         and 'python3' not in 사유 and '전송요청' not in 사유 and '일부 실패' not in 사유, 사유)
    본다('옛 됨 — 7줄 모두 기록 없음', 옛 and all('기록 없음' in x for x in 옛[1]), 옛 and 옛[1])
    본다('답장 원문 칸 없음', not 쪽.query_selector('.품절탭 .옛답'))
    쪽.screenshot(path=str(여기 / ('후속-' + 이름 + '-3-옛줄.png')))
    # 칩 · 검색
    for c in 쪽.query_selector_all('.품절탭 ' + 카 + '.open' + 손): c.click()
    쪽.wait_for_timeout(300)
    쪽.click('.품절탭 .fchip:nth-child(2)'); 쪽.wait_for_timeout(300)
    본다('칩 실패 → 2장', len(쪽.query_selector_all('.품절탭 ' + 카)) == 2)
    쪽.click('.품절탭 .fchip:nth-child(1)'); 쪽.wait_for_timeout(300)
    if not 폰:
        쪽.click('.품절탭 .srch'); 쪽.keyboard.type('Gentiana'); 쪽.wait_for_timeout(500)
        본다('학명 검색 → 용담 하나', 쪽.eval_on_selector_all('.품절탭 .pcr .cd', 'es => es.map(e => e.textContent)') == ['GEN01-10'])
        쪽.fill('.품절탭 .srch', ''); 쪽.keyboard.type('없는것'); 쪽.wait_for_timeout(500)
        본다('없으면 「찾는 품목이 없습니다」', '찾는 품목이 없습니다' in 쪽.inner_text('.품절탭'))
        쪽.fill('.품절탭 .srch', ''); 쪽.keyboard.press('Backspace'); 쪽.wait_for_timeout(400)
    # 배지 — 진행중만 · 전부 완료
    새로(쪽, [r for r in 가짜줄 if r['내용']['상태'] in ('대기', '하는중')])
    배 = 쪽.eval_on_selector('[data-품절배지]', 'b => [b.hidden, b.textContent, b.classList.contains("빨강")]')
    본다('진행중만 → 회색 2', 배 == [False, '2', False], 배)
    새로(쪽, [r for r in 가짜줄 if r['내용']['상태'] == '됨'])
    본다('전부 완료 → 배지 숨김', 쪽.eval_on_selector('[data-품절배지]', 'b => b.hidden'))
    새로(쪽, [])
    본다('없으면 「최근 30일 품절 요청이 없습니다」', '최근 30일 품절 요청이 없습니다' in 쪽.inner_text('.품절탭'))
    if 실줄 is not None:
        새로(쪽, 실줄)
        n = len(쪽.query_selector_all('.품절탭 ' + 카))
        기 = 쪽.eval_on_selector_all('.품절탭 ' + 카 + ' .frac', 'es => es.filter(e => e.textContent === "기록 없음").length')
        본다('실데이터 %d줄 → 카드 %d장, 모두 「기록 없음」' % (len(실줄), n), n > 0 and 기 == n, (n, 기))
        막 = 쪽.eval_on_selector_all('.품절탭 ' + 카, '(cs, 폰) => cs.map(c => [...c.querySelectorAll(폰 ? ".bar i" : ".bar .sg")].map(i => i.className.replace("sg ", "")))', 폰)
        본다('실데이터 — 7칸 전부 빨간 카드 없음', not any(all(v == 'fail' for v in x) for x in 막), 막)
        본다('실데이터 — 답장에서 뽑힌 칸이 있다', any(v in ('ok', 'fail', 'none') for x in 막 for v in x))
        for i in range(n):
            쪽.click('.품절탭 ' + 카 + ':nth-child(%d)' % (i + 1) + 손)
        쪽.wait_for_timeout(900)
        수 = 쪽.eval_on_selector_all('.품절탭 ' + 카 + '.open', '(cs, s) => cs.map(c => c.querySelectorAll(s).length)', 줄식)
        본다('실데이터 — 펼치면 모두 마켓 7줄', len(수) == n and set(수) == {7}, 수)
        긴 = 쪽.eval_on_selector_all('.품절탭 .why', 'es => es.map(e => e.innerText).filter(t => t.length > 60 || t.indexOf("\\n") >= 0)')
        본다('실데이터 — 사유 칸에 긴 글·여러 줄 없음', not 긴, 긴)
        쪽.evaluate('() => window.scrollTo(0, 0)')
        쪽.screenshot(path=str(여기 / ('후속-' + 이름 + '-4-실데이터.png')))
    나무 = ('**② 마켓플러스**\n```\n■ X\n   ├ 스마트스토어 1행 — 판매중으로 0행 되살리고, 재고를 9999 로\n   │    스마트스토어 (ncp)     지금 판매중\n'
          '   ├ 그 밖 4행 — 중지해제 할 것 1행\n   │    쿠팡 (zg)         지금 판매중지\n   └ 이미 그 상태라 안 건드림 : 3행\n        롯데ON (zg1)      판매중\n'
          '        G마켓 (0g)           판매중\n        11번가 (zg)       판매중\n\n   ▶ 그 밖 넷 — 중지해제 …\n      ✅ 전송했다 — 전송 요청\n\n'
          '   🔴 카페24가 판매안함(또는 미진열)이라 중지해제를 할 수 없다 — 건드리지 않는다.\n\n   ▶ 스마트스토어 — 재고를 9999 로 …\n'
          '      🔴 마켓플러스가 아무 말도 안 했다 — 화면을 보셔야 한다\n\n   말:\n      [confirm] x\n```\n심폴 상품 139개 중 이름이 맞는 것 0개\n   심폴에 없다.')
    뽑 = 쪽.evaluate("(t) => ZG.품절자료.옛칸들(t)", 나무)
    본다('나무 모양 — 이미=완료 · 할 것=▶구역 결과 · 심폴 없음 · 카페24 안 건드림',
         {k: v['값'] for k, v in 뽑.items()} == {'롯데ON': 'ok', 'G마켓': 'ok', '11번가': 'ok', '쿠팡': 'fail', '스마트스토어': 'fail', '심폴': 'none'}
         and 뽑['쿠팡']['사유'] == '카페24가 판매안함(또는 미진열)이라 중지해제를 할 수 없다', 뽑)
    본다('콘솔 에러 없음', not 오류, 오류)
    ctx.close()

def 작업중(브, 폰):
    이름 = '폰' if 폰 else 'PC'
    print('\n── ' + 이름 + ' 작업중 학명 복사')
    ctx, 쪽, 오류 = 열기(브, 폰, '#작업중')
    단 = 쪽.query_selector_all('.사진대기 .cpy')
    본다('학명 있는 4줄에만 [복사]', len(단) == 4, len(단))
    본다('학명 빈 줄은 div.sci', 쪽.query_selector('.사진대기 div.sci') is not None)
    if 폰:
        본다('폰 단추 높이 30', 쪽.eval_on_selector('.사진대기 .cpy', 'b => b.offsetHeight') == 30)
    else:
        본다('PC 학명 기울임', 쪽.eval_on_selector('.사진대기 td .scirow .sci', 'e => getComputedStyle(e).fontStyle') == 'italic')
    쪽.click('.사진대기 .cpy >> nth=1'); 쪽.wait_for_timeout(200)
    b = 쪽.query_selector('.사진대기 .cpy >> nth=1')
    본다('누르면 ✓ 복사됨 + done', b.inner_text() == '✓ 복사됨' and 'done' in b.get_attribute('class'))
    본다('클립보드 = 학명 원문', 쪽.evaluate('() => navigator.clipboard.readText()') == 'Dendranthema zawadskii')
    본다('사진창 안 열림', 쪽.query_selector('.사진창') is None)
    쪽.screenshot(path=str(여기 / ('후속-' + 이름 + '-5-작업중-복사.png')))
    쪽.wait_for_timeout(1500)
    본다('1.5초 뒤 ⧉ 복사', b.inner_text() == '⧉ 복사' and 'done' not in b.get_attribute('class'))
    # 검색으로 <mark> 가 끼어도 복사는 원문
    if not 폰:
        쪽.click('.사진대기 .search input'); 쪽.keyboard.type('Gent'); 쪽.wait_for_timeout(500)
        쪽.click('.사진대기 .cpy'); 쪽.wait_for_timeout(200)
        본다('검색 중에도 원문 복사', 쪽.evaluate('() => navigator.clipboard.readText()') == 'Gentiana scabra')
    본다('콘솔 에러 없음', not 오류, 오류)
    ctx.close()

def 마켓품절(브):
    print('\n── 06k 순서 (Edge → 지시 줄)')
    ctx, 쪽, 오류 = 열기(브, False, '#재고')
    쪽.evaluate(가짜, []); 쪽.wait_for_timeout(300)
    품 = {'품목코드': 'TST01-1', '유통명': '시험품목'}
    def 한번(invoke식, 기다림=600):
        쪽.evaluate("() => { window.__부른것 = []; window.__쓴것 = []; }")
        쪽.evaluate("(식) => { window.__invoke = eval(식); }", invoke식)
        쪽.evaluate("(p) => ZG.마켓품절.밀기(p, true)", 품); 쪽.wait_for_timeout(기다림)
        return 쪽.evaluate("() => [window.__부른것.filter(x => x !== 'upsert:v3_공유설정'), window.__쓴것.map(r => r[0].내용)]")
    부, 쓴 = 한번("() => new Promise(r => setTimeout(() => r({ data: { ok: true, 카페24: { 됨: true, 사유: '' } } }), 200))")
    본다('Edge 먼저, upsert 나중', 부 == ['invoke:market-soldout', 'upsert:v3_지시'], 부)
    본다('카페24 완료 칸', 쓴 and 쓴[0]['마켓']['카페24']['상태'] == '완료' and 쓴[0]['상태'] == '대기', 쓴 and 쓴[0].get('마켓'))
    부, 쓴 = 한번("() => Promise.resolve({ data: { ok: false, 오류: 'x', 카페24: { 됨: false, 사유: '재고를 못 바꿨다' } } })")
    본다('거절이어도 쌓고 사유 실림', 쓴 and 쓴[0]['마켓']['카페24'] == {**쓴[0]['마켓']['카페24'], '상태': '실패', '사유': '재고를 못 바꿨다'}, 쓴 and 쓴[0]['마켓'])
    부, 쓴 = 한번("() => Promise.resolve({ error: new Error('boom') })")
    본다('Edge 오류 → 응답 없음 사유', 쓴 and 쓴[0]['마켓']['카페24']['사유'] == '자사몰 응답 없음 — 손으로 확인', 쓴 and 쓴[0]['마켓'])
    쪽.evaluate("() => { const o = window.setTimeout; window.setTimeout = (f, ms, ...a) => o(f, ms === 20000 ? 50 : ms, ...a); }")
    부, 쓴 = 한번("() => new Promise(() => {})", 400)
    본다('20초 넘으면(줄여 시험) 그래도 쌓음', 부 == ['invoke:market-soldout', 'upsert:v3_지시'] and 쓴[0]['마켓']['카페24']['상태'] == '실패', (부, 쓴 and 쓴[0]['마켓']))
    본다('콘솔 에러 없음', not 오류, 오류)
    ctx.close()

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            품절탭(브, 폰)
            작업중(브, 폰)
        마켓품절(브)
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
