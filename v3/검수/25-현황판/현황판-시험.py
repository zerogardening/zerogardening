# -*- coding: utf-8 -*-
# 25단계 현황판 — python3 v3/검수/25-현황판/현황판-시험.py [판.json]
# 🔴 supabase CDN 을 가짜로 바꿔 끼운다 — 진짜 서버에 아무것도 안 쓴다.
#    판.json = `현황판올리기.py --시험` 이 쓴 /tmp/zg-현황판-시험.json (실지시로그에서 만든 사본, 읽기만)
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '25-현황판'
실판 = json.loads(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/zg-현황판-시험.json').read_text())
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

def 항(i, 단, 제목, 설명, 팀, 날, 률=None, 막힘=False):
    return {'id': 'x%02d' % i, '단계': 단, '막힘': 막힘, '제목': 제목, '설명': 설명, '팀': 팀, '날': 날, '률': 률}
# 시안과 같은 6장 + 완료 7줄 — 시안 그림과 나란히 놓고 보려고
시안판 = {'판': 1, '갱신': '2026-10-18 02:10', '항목': [
    항(1, '컨펌대기', '로그인 풀림', '재부팅마다 쿠팡·스스 로그인이 풀리는 원인', '개발', '2026-10-17', 30),
    항(2, '컨펌대기', '품절 탭 수정', '실패한 마켓만 따로 다시 보내는 단추', '개발', '2026-10-17', 95),
    항(3, '컨펌대기', '스스 전시 카테고리', '새벽마다 새 상품 자동으로 넣기', '상품', '2026-10-15'),
    항(4, '작업중', '작약 전 마켓', '레드참·코랄참 나머지 마켓도 올리기', '상품', '2026-10-18', 10),
    항(5, '작업중', '모음 업로드', '구근 모음 쿠팡 가격·배송비 맞춰 올리기', '상품', '2026-10-16', 70, True),
    항(6, '준비', '현황판 정리', '옛 줄 제목 달기', '허브', '2026-10-18', 0),
    항(7, '완료', '업로드 완료 탭', '마켓 7곳 올림·실패 기록 보이기', '개발', '2026-10-17'),
    항(8, '완료', '쿠팡 정사각 사진', '정사각 대표사진 만드는 도구 완성', '상품', '2026-10-17'),
    항(9, '완료', '작약 5종 상세', '양쪽 맞춤 판으로 다시 정리', '상품', '2026-10-17'),
    항(10, '완료', '작업중 복사 단추', '유통명·학명 한 번에 복사', '개발', '2026-10-16'),
    항(11, '완료', '스스 전용 크롬', '스마트스토어센터 창 따로 띄우기', '개발', '2026-10-16'),
    항(12, '완료', '노라 사진 채우기', '1·4구역 비었던 사진 다시 넣기', '상품', '2026-10-15'),
    항(13, '완료', '품절 탭', '품절 상품을 한곳에 모으기', '개발', '2026-10-15'),
]}

가짜 = r"""
window.__줄 = window.__시작줄 || []; window.__쓴것 = []; window.__모드 = window.__모드 || '';
window.supabase = { createClient: function () { return {
  from: function (t) { return {
    select: function () {
      if (window.__모드 === '표없음') return Promise.resolve({ data: null, error: { message: "Could not find the table 'public.v3_현황판' in the schema cache", code: 'PGRST205' } });
      return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__줄)), error: null }); },
    upsert: function (r) { window.__쓴것.push(r);
      if (window.__모드 === '쓰기실패') return Promise.resolve({ error: { message: 'Failed to fetch' } });
      r.forEach(function (x) { window.__줄 = window.__줄.filter(function (y) { return y.id !== x.id; }).concat([x]); });
      return Promise.resolve({ error: null }); } }; },
  channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
  auth: { onAuthStateChange: function () {}, getSession: function () { return new Promise(function () {}); } }
}; } };
"""

서버 = subprocess.Popen([sys.executable, '-c', 'import functools, http.server as h; '
                         'h.ThreadingHTTPServer(("", 8795), functools.partial(h.SimpleHTTPRequestHandler, directory=%r)).serve_forever()' % str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8795/현황판.html'

def 열기(br, 폭, 판, 모드='', 숨김=()):
    폰 = 폭 < 700
    ctx = br.new_context(viewport={'width': 폭, 'height': 844 if 폰 else 1000}, device_scale_factor=2,
                         has_touch=폰, is_mobile=폰)
    줄 = [{'id': '판', '내용': 판, '삭제됨': False}] + [
        {'id': '숨김:' + i, '내용': {'항목': i, '제목': '', '숨긴때': '2026-10-18T00:00:00Z'}, '삭제됨': False} for i in 숨김]
    ctx.add_init_script("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
                        "window.__시작줄 = %s; window.__모드 = %s;" % (json.dumps(줄, ensure_ascii=False), json.dumps(모드)))
    ctx.route('**/supabase-js@2*', lambda r: r.fulfill(status=200, content_type='application/javascript', body=가짜))
    p = ctx.new_page()
    에러 = []
    p.on('console', lambda m: 에러.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: 에러.append(str(e)))
    p.goto(주소); p.wait_for_timeout(600)
    return ctx, p, 에러

def 수(p, sel): return p.eval_on_selector_all(sel, 'e => e.length')
def 흐름수(p): return p.eval_on_selector_all('.fs b', 'e => e.map(x => +x.textContent)')
def 칩수(p): return p.eval_on_selector_all('.tchips .fchip', 'e => e.map(x => x.textContent)')

with sync_playwright() as pw:
    br = pw.chromium.launch()
    실열 = [h for h in 실판['항목'] if h['단계'] != '완료']
    숨길 = 실열[0]['id']

    print('[폰 390 · 실판]')
    ctx, p, 에러 = 열기(br, 390, 실판, 숨김=[숨길])
    본다('처음 = 완료 뺀 셋(숨김 1 뺌)', 수(p, '.tk') == len(실열) - 1, '%d장' % 수(p, '.tk'))
    본다('숨긴 항목은 숫자에서도 빠짐', sum(흐름수(p)[:3]) == len(실열) - 1, 흐름수(p))
    본다('갱신 글', '갱신 ' in p.inner_text('.upd'), p.inner_text('.upd'))
    p.screenshot(path=str(여기 / '폰-1-실판-처음.png'))
    첫순 = p.eval_on_selector_all('.tk .sp', 'e => e.map(x => x.textContent)')
    본다('컨펌대기 → 작업중 → 준비 순', 첫순 == sorted(첫순, key=lambda s: {'컨펌대기': 0, '작업중': 1, '준비': 2}[s]))
    p.click('.fs.me'); p.wait_for_timeout(100)
    본다('컨펌대기만', set(p.eval_on_selector_all('.tk .sp', 'e => e.map(x => x.textContent)')) == {'컨펌대기'})
    본다('켠 칸 on · 나머지 dim', 수(p, '.fs.on') == 1 and 수(p, '.fs.dim') == 3)
    본다('칩 전체 = 컨펌대기 수', 칩수(p)[0] == '전체' + str(흐름수(p)[2]), 칩수(p))
    p.click('.fs.me'); p.wait_for_timeout(100)
    본다('같은 칸 다시 → 기본', 수(p, '.fs.on') == 0 and 수(p, '.tk') == len(실열) - 1)
    p.click('.tchips .fchip:has-text("개발")'); p.wait_for_timeout(100)
    본다('개발 칩 → 흐름 숫자가 개발 기준', sum(흐름수(p)[:3]) == 수(p, '.tk') and set(p.eval_on_selector_all('.tk .team', 'e=>e.map(x=>x.textContent)')) == {'개발'}, 흐름수(p))
    p.click('.tchips .fchip:has-text("전체")'); p.click('.fs.dn'); p.wait_for_timeout(100)
    본다('완료 = 날짜 무리', 수(p, '.dh') > 0 and 수(p, '.dr') == 흐름수(p)[3], '%d무리 %d줄' % (수(p, '.dh'), 수(p, '.dr')))
    p.screenshot(path=str(여기 / '폰-2-실판-완료.png'))
    본다('콘솔 빨간 줄 없음', not 에러, 에러)
    ctx.close()

    print('[폰 390 · 시안판]')
    ctx, p, 에러 = 열기(br, 390, 시안판)
    본다('카드 6 · 흐름 1/2/3/7', 수(p, '.tk') == 6 and 흐름수(p) == [1, 2, 3, 7], 흐름수(p))
    본다('률 null = 막대 없음', 수(p, '.pg-none') == 1)
    본다('률 0 = 빈 막대 + 0%', '0%' in p.eval_on_selector_all('.pct', 'e=>e.map(x=>x.textContent)'))
    본다('막힘 배지', 수(p, '.blkm') == 1)
    본다('허브 카드 제목에 꼬리표 없음', '[' not in p.inner_text('.tks'))
    p.screenshot(path=str(여기 / '폰-3-시안판-처음.png'))
    p.click('.fs.me'); p.wait_for_timeout(100)
    본다('③ 칩 「전체 3」 · 허브 0 zero', 칩수(p)[:2] == ['전체3', '허브0'] and 수(p, '.fchip.zero') == 3, 칩수(p))
    p.screenshot(path=str(여기 / '폰-4-시안판-컨펌대기.png'))
    p.click('.fs.me'); p.click('.fs.dn'); p.wait_for_timeout(100)
    본다('완료 머리 「10/17 토」', p.inner_text('.dh') == '10/17 토', p.inner_text('.dh'))
    p.screenshot(path=str(여기 / '폰-5-시안판-완료.png'))
    p.click('.fs.dn'); p.wait_for_timeout(100)
    # 밀기 — 세 번째 카드
    박스 = p.locator('.쓸줄').nth(2).bounding_box()
    y = 박스['y'] + 박스['height'] / 2
    p.evaluate("""([x, y]) => { const el = document.querySelectorAll('.쓸줄 > .tk')[2];
      const ev = (t, x) => el.dispatchEvent(new PointerEvent(t, {clientX: x, clientY: y, pointerId: 1, bubbles: true, pointerType: 'touch'}));
      ev('pointerdown', x); ev('pointermove', x - 30); ev('pointermove', x - 90); ev('pointerup', x - 90); }""", [박스['x'] + 300, y])
    p.wait_for_timeout(350)
    본다('밀면 빨간 「정리」', p.locator('.쓸줄').nth(2).locator('.쓸단추').is_visible())
    p.screenshot(path=str(여기 / '폰-6-밀어서정리.png'))
    p.locator('.쓸줄').nth(2).locator('.쓸단추 button').click(); p.wait_for_timeout(500)
    쓴 = p.evaluate('window.__쓴것')
    본다('정리 → 숨김 줄 upsert', len(쓴) == 1 and 쓴[0][0]['id'] == '숨김:x03' and 쓴[0][0]['내용']['항목'] == 'x03', 쓴)
    본다('카드 빠지고 숫자 줄어듦', 수(p, '.tk') == 5 and 흐름수(p)[2] == 2)
    본다('토스트 「정리했습니다」', '정리했습니다' in p.inner_text('#토스트칸'))
    본다("'판' 줄은 안 씀", all(r['id'] != '판' for b in 쓴 for r in b))
    p.click('.rf'); p.wait_for_timeout(300)
    본다('↻ 다시 읽어도 숨은 채', 수(p, '.tk') == 5)
    p.click('.ph-nav button:has-text("더보기")'); p.wait_for_timeout(400)
    시트 = p.inner_text('.askbox')
    본다('더보기 시트에 현황판 · 안내 문구 없음', '현황판' in 시트 and '자리가 없어' not in 시트 and 수(p, '.askbox p') == 0, 시트.replace('\n', ' '))
    p.screenshot(path=str(여기 / '폰-7-더보기.png'))
    본다('콘솔 빨간 줄 없음', not 에러, 에러)
    ctx.close()

    print('[폰 · 실패 길]')
    ctx, p, 에러 = 열기(br, 390, 시안판, 모드='쓰기실패')
    p.evaluate("document.querySelector('.쓸단추 button').click()"); p.wait_for_timeout(500)
    본다('못 쓰면 되넣음 + 토스트', 수(p, '.tk') == 6 and '정리 못 했습니다' in p.inner_text('#토스트칸'), p.inner_text('#토스트칸'))
    ctx.close()
    ctx, p, 에러 = 열기(br, 390, 시안판, 모드='표없음')
    본다('표 없음 문구', '25단계-현황판.sql' in p.inner_text('.ph-body'))
    ctx.close()
    ctx, p, 에러 = 열기(br, 390, {'판': 1, '갱신': '', '항목': []})
    본다('빈 판 문구', '아직 올라온 판이 없습니다' in p.inner_text('.ph-body'))
    ctx.close()

    print('[PC 1440]')
    ctx, p, 에러 = 열기(br, 1440, 시안판)
    본다('옆칸 현황판 켜짐', p.inner_text('.pc-side button.on') == '현황판')
    본다('2열 그리드', p.eval_on_selector('.tks', 'e => getComputedStyle(e).gridTemplateColumns').count('px') == 2)
    p.screenshot(path=str(여기 / 'PC-1-시안판.png'))
    p.hover('.tk.go'); p.wait_for_timeout(100)
    본다('마우스 올린 카드에만 정리', p.locator('.tk.go .btn.cl').first.is_visible() and not p.locator('.tk.me .btn.cl').first.is_visible())
    p.screenshot(path=str(여기 / 'PC-2-마우스정리.png'))
    p.locator('.tk.go .btn.cl').first.click(); p.wait_for_timeout(500)
    본다('PC 정리 → upsert', p.evaluate('window.__쓴것.length') == 1 and 수(p, '.tk') == 5)
    p.click('.fs.dn'); p.wait_for_timeout(100)
    본다('완료 pcdone', 수(p, '.pcdone .dr') == 7)
    p.screenshot(path=str(여기 / 'PC-3-완료.png'))
    본다('콘솔 빨간 줄 없음', not 에러, 에러)
    ctx.close()
    ctx, p, 에러 = 열기(br, 1440, 실판)
    p.screenshot(path=str(여기 / 'PC-4-실판.png'))
    본다('실판 PC 콘솔 빨간 줄 없음', not 에러, 에러)
    ctx.close()
    br.close()
서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
