# -*- coding: utf-8 -*-
# 현황판 카드 펼침(설명·진행) · 「급함 푸시」 (10/23 우람님) — python3 v3/검수/35-현황판카드/카드-시험.py
# 🔴 supabase 를 가짜로 바꿔 끼운다(25-현황판 시험 틀) — 실서버에 안 쓴다. 판 = 실지시로그로 만든 /tmp 사본(읽기만)
import importlib, io, json, pathlib, subprocess, sys, time, contextlib
from playwright.sync_api import sync_playwright

제로 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝')
뿌리 = 제로 / '통합관리' / 'v3'
여기 = 뿌리 / '검수' / '35-현황판카드'
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

# ── ① 파이썬: 판에 긴설명·진행이 실린다 · 허브가 급함을 읽는 두 길 ──
print('파이썬')
subprocess.run([sys.executable, str(제로 / '_도구' / '현황판올리기.py'), '--시험'], check=True, capture_output=True)
판 = json.loads(pathlib.Path('/tmp/zg-현황판-시험.json').read_text())
열 = [h for h in 판['항목'] if h['단계'] != '완료']
본다('판 항목마다 긴설명·진행 칸', all('긴설명' in h and '진행' in h for h in 판['항목']), len(판['항목']))
긴 = [h for h in 열 if len(h['긴설명']) > len(h['설명'])]
본다('잘린 설명(40자)보다 긴 설명이 실림', len(긴) >= 1, (긴[0]['설명'], len(긴[0]['긴설명'])) if 긴 else '')
sys.path.insert(0, str(제로 / '_도구')); sys.path.insert(0, str(제로 / '통합관리' / '도구'))
import 현황판올리기 as 올, 현황판 as 판모듈
고른 = 열[1]
올.급함목록 = lambda: [{'항목': 고른['id'], '제목': 고른['제목'], '설명': 고른['긴설명'], '팀': 고른['팀'], '누른때': '2026-10-23T00:30:00Z'}]
열린, 끝난 = 판모듈.읽기()
n = 판모듈.급함붙이기(열린)
본키 = {}
표시 = [올.키id(올.줄키('열', r, 본키)) for r in 열린 if r.get('급함')]
본다('현황판.py — 같은 항목 id 에 급함 1건(앱 판과 같은 키)', n == 1 and 표시 == [고른['id']], (n, 고른['제목']))
import 지시함
글 = io.StringIO()
with contextlib.redirect_stdout(글):
    지시함.급함찍기()
본다('지시함.py 허브/보기 맨 위 「■ 🔴 급함」 + 제목 + 한국시각', '■ 🔴 급함(우람님 푸시) 1건' in 글.getvalue() and 고른['제목'] in 글.getvalue() and '10/23 09:30' in 글.getvalue(), 글.getvalue().strip()[:150])

가짜 = r"""
window.__줄 = window.__시작줄 || []; window.__쓴것 = []; window.__모드 = window.__모드 || '';
window.supabase = { createClient: function () { return {
  from: function (t) { return {
    select: function () { return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__줄)), error: null }); },
    upsert: function (r) { window.__쓴것.push(r);
      if (window.__모드 === '쓰기실패') return Promise.resolve({ error: { message: 'Failed to fetch' } });
      r.forEach(function (x) { window.__줄 = window.__줄.filter(function (y) { return y.id !== x.id; }).concat([x]); });
      return Promise.resolve({ error: null }); } }; },
  channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
  auth: { onAuthStateChange: function () {}, getSession: function () { return new Promise(function () {}); } }
}; } };
"""
서버 = subprocess.Popen([sys.executable, '-c', 'import functools, http.server as h; '
                         'h.ThreadingHTTPServer(("", 8834), functools.partial(h.SimpleHTTPRequestHandler, directory=%r)).serve_forever()' % str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8834/현황판.html'

def 열기(br, 폭, 모드='', 급함=()):
    폰 = 폭 < 700
    ctx = br.new_context(viewport={'width': 폭, 'height': 844 if 폰 else 1000}, device_scale_factor=2, has_touch=폰, is_mobile=폰,
                         reduced_motion='reduce')
    줄 = [{'id': '판', '내용': 판, '삭제됨': False}] + [
        {'id': '급함:' + i, '내용': {'항목': i, '제목': '', '누른때': '2026-10-23T00:00:00Z'}, '삭제됨': False} for i in 급함]
    ctx.add_init_script("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
                        "window.__시작줄 = %s; window.__모드 = %s;" % (json.dumps(줄, ensure_ascii=False), json.dumps(모드)))
    ctx.route('**/supabase-js@2*', lambda r: r.fulfill(status=200, content_type='application/javascript', body=가짜))
    p = ctx.new_page(); 에러 = []
    p.on('console', lambda m: 에러.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: 에러.append(str(e)))
    p.goto(주소); p.wait_for_selector('.tk', timeout=15000); p.wait_for_timeout(400)
    return ctx, p, 에러

try:
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        미리급 = 열[-1]   # 판 맨 뒤 카드를 미리 급함으로
        for 폭 in (1440, 390):
            이름 = 'PC' if 폭 > 700 else '폰'; print('\n' + 이름)
            ctx, p, 에러 = 열기(br, 폭, 급함=[미리급['id']])
            첫 = p.locator('.tk').first
            본다('급함 카드가 맨 위 · 「급함」 표 · 단추 「급함 해제」', 미리급['제목'] in 첫.inner_text() and 첫.locator('.urg').count() == 1
                 and 첫.locator('.btn.push.on').inner_text() == '급함 해제', 첫.inner_text().split('\n')[:2])
            본다('다른 카드는 「급함 푸시」', p.locator('.tk .btn.push:not(.on)').count() == len(열) - 1, p.locator('.tk .btn.push').count())
            # 펼침 — 카드 제목을 누르면 긴 설명·진행
            대상 = 긴[0]
            카 = p.locator('.tk', has_text=대상['제목']).first
            카.locator('.tt').click(); p.wait_for_timeout(300)
            카 = p.locator('.tk', has_text=대상['제목']).first
            본다('카드 누름 → 긴 설명 전부', 카.locator('.more .long').count() == 1 and 카.locator('.more .long').inner_text() == 대상['긴설명'], len(대상['긴설명']))
            본다('진행 칸 요약도 보임', not 대상['진행'] or 카.locator('.more .prog').inner_text() == 대상['진행'], 대상['진행'][:40])
            p.screenshot(path=str(여기 / ('1-펼침-' + 이름 + '.png')), full_page=폭 > 700)
            카.locator('.tt').click(); p.wait_for_timeout(300)
            본다('다시 누르면 접힘', p.locator('.tk .more').count() == 0)
            # 급함 푸시
            둘 = 열[0]
            카 = p.locator('.tk', has_text=둘['제목']).first
            카.locator('.btn.push').click(); p.wait_for_timeout(400)
            쓴 = p.evaluate('() => window.__쓴것')
            본다('푸시 → 서버에 「급함:id」 한 줄(삭제됨=false · 제목·팀·누른때)', len(쓴) == 1 and 쓴[0][0]['id'] == '급함:' + 둘['id'] and 쓴[0][0]['삭제됨'] is False
                 and 쓴[0][0]['내용']['제목'] == 둘['제목'] and 쓴[0][0]['내용']['누른때'], 쓴[0][0]['id'] if 쓴 else '')
            본다('「판」 줄은 안 씀', all(x['id'] != '판' for r in 쓴 for x in r))
            본다('푸시한 카드 위로 · 단추 「급함 해제」 · 펼쳐지지 않음', p.locator('.tk.urgent').count() == 2 and
                 p.locator('.tk.urgent', has_text=둘['제목']).locator('.btn.push.on').count() == 1 and p.locator('.tk .more').count() == 0
                 and p.locator('.tk').nth(1).inner_text().find(둘['제목']) >= 0 or p.locator('.tk').nth(0).inner_text().find(둘['제목']) >= 0)
            p.screenshot(path=str(여기 / ('2-급함-' + 이름 + '.png')), full_page=폭 > 700)
            p.locator('.tk', has_text=둘['제목']).first.locator('.btn.push').click(); p.wait_for_timeout(400)
            쓴 = p.evaluate('() => window.__쓴것')
            본다('다시 누름 → 해제(삭제됨=true · 지우지 않음)', len(쓴) == 2 and 쓴[1][0]['삭제됨'] is True and p.locator('.tk.urgent').count() == 1)
            p.click('.ph-top .rf' if 폭 < 700 else '.rfb'); p.wait_for_timeout(500)
            본다('다시 읽어도 급함 1건(미리 둔 것) 그대로', p.locator('.tk.urgent').count() == 1)
            본다('콘솔 빨간 에러 0(누른 뒤)', not 에러, 에러[:2])
            ctx.close()
        # 쓰기 실패면 되돌림
        ctx, p, 에러 = 열기(br, 1440, 모드='쓰기실패')
        p.locator('.tk').first.locator('.btn.push').click(); p.wait_for_timeout(500)
        본다('서버에 못 쓰면 되돌리고 알림', p.locator('.tk.urgent').count() == 0 and '못 바꿨습니다' in p.inner_text('body'))
        ctx.close()
        br.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
