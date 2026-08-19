# -*- coding: utf-8 -*-
# 재고 탭 입고 거르개 검수 (2026-08-19 우람님 지시 「입고 날짜별·업체별 필터」)
#   python3 v3/검수/재고거르개-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 안 막으면 01b-서버의 로그인 문지기가
#    `../index.html` 로 보내는데, 시험 서버는 v3 가 뿌리라 자기 자신으로 되돌아 무한 새로고침이 된다.
# ① 거르기 로직 — 날짜·업체가 같은 입고 기록 하나에서 동시에 맞아야 하는가
# ② 실제 화면 — PC·폰 재고 탭에 거르개가 뜨고 골랐을 때 목록이 실제로 줄어드는가
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')

품목 = [
  {'품목코드': 'AAA01-15', '접두': 'AAA01', '유통명': '몬스테라', '학명': 'Monstera', '규격': '15cm', '상태': '판매중'},
  {'품목코드': 'BBB01-15', '접두': 'BBB01', '유통명': '스킨답서스', '학명': 'Epipremnum', '규격': '15cm', '상태': '판매중'},
  {'품목코드': 'CCC01-15', '접두': 'CCC01', '유통명': '입고없음', '학명': 'Nihil', '규격': '15cm', '상태': '판매중'},
]
입고 = [
  {'id': 'r1', '품목코드': 'AAA01-15', '입고일': '2026-08-05', '입고업체': '한아름농원', '수량': 10, '등록일시': 1},
  {'id': 'r2', '품목코드': 'AAA01-15', '입고일': '2026-08-10', '입고업체': '푸른들농원', '수량': 5,  '등록일시': 2},
  {'id': 'r3', '품목코드': 'BBB01-15', '입고일': '2026-08-10', '입고업체': '한아름농원', '수량': 7,  '등록일시': 3},
]
심기 = ("localStorage.setItem('zg.v3.품목', %s);"
        "localStorage.setItem('zg.v3.입고', %s);"
        "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        % (json.dumps(json.dumps(품목, ensure_ascii=False)), json.dumps(json.dumps(입고, ensure_ascii=False))))

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(참); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8778', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8778/index.html#재고'   # 07-앱 해시 라우팅으로 바로 재고 탭

def 거른다(쪽, 조건):
    return 쪽.evaluate("""(조건) => {
      const 목 = ZG.재고목록, 상 = 목.상태;
      const 전 = { 업체: 상.업체, 입고부터: 상.입고부터, 입고까지: 상.입고까지 };
      Object.assign(상, { 업체: '', 입고부터: '', 입고까지: '' }, 조건);
      const r = 목.거르기(목.전부요약()).map(요 => 요.품목.품목코드).sort().join(',');
      Object.assign(상, 전);
      return r;
    }""", 조건)

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        # ── ① 거르기 로직 ──
        print('\n① 거르기 로직')
        쪽 = 브.new_page(viewport={'width': 1440, 'height': 900})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())   # 로컬 전용으로 띄운다
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(2000)

        표 = [
          ('거르개 안 걸면 전부',                {},                                                        'AAA01-15,BBB01-15,CCC01-15'),
          ('업체 = 한아름농원',                  {'업체': '한아름농원'},                                     'AAA01-15,BBB01-15'),
          ('업체 = 푸른들농원',                  {'업체': '푸른들농원'},                                     'AAA01-15'),
          ('입고일 8/6 이후',                    {'입고부터': '2026-08-06'},                                 'AAA01-15,BBB01-15'),
          ('입고일 8/6 이전',                    {'입고까지': '2026-08-06'},                                 'AAA01-15'),
          ('8/1~8/6 + 한아름 (같은 기록에서 일치)', {'입고부터': '2026-08-01', '입고까지': '2026-08-06', '업체': '한아름농원'}, 'AAA01-15'),
          ('🔴 8/1~8/6 + 푸른들 → 푸른들 입고는 8/10뿐이라 0건', {'입고부터': '2026-08-01', '입고까지': '2026-08-06', '업체': '푸른들농원'}, ''),
          ('날짜를 걸면 입고 없는 품목은 빠진다', {'입고부터': '2026-08-01', '입고까지': '2026-08-31'},        'AAA01-15,BBB01-15'),
        ]
        for 이름, 조건, 기대 in 표:
            got = 거른다(쪽, 조건)
            본다(이름, got == 기대, 'got=[%s] want=[%s]' % (got, 기대))

        본다('업체 목록은 실제 입고 기록에서 뽑는다',
             쪽.evaluate("[...document.querySelectorAll('.입고거르개 select option')].map(o=>o.textContent).join(',')")
             == '전체 업체,푸른들농원,한아름농원')

        # ── ② PC 실화면 ──
        print('\n② PC 실화면 (1440)')
        본다('재고 탭에 거르개가 떴다', 쪽.locator('.입고거르개').count() == 1)
        본다('입고업체·시작일·종료일 세 칸이 있다',
             쪽.locator('.입고거르개 select').count() == 1 and 쪽.locator('.입고거르개 input[type=date]').count() == 2)
        줄수 = lambda: 쪽.locator('.table-card tbody tr').count()
        전체 = 줄수()
        쪽.select_option('.입고거르개 select', '푸른들농원'); 쪽.wait_for_timeout(400)
        본다('업체를 고르면 목록이 실제로 줄어든다', 줄수() < 전체, '%d줄 → %d줄' % (전체, 줄수()))
        본다('고른 값이 다시 그려도 남아 있다', 쪽.locator('.입고거르개 select').input_value() == '푸른들농원')
        쪽.fill('.입고거르개 input[type=date] >> nth=0', '2026-08-01')
        쪽.fill('.입고거르개 input[type=date] >> nth=1', '2026-08-06')
        쪽.wait_for_timeout(400)
        본다('🔴 날짜+업체가 어긋나면 0건 (표에 「없습니다」)', 쪽.locator('.table-card tbody').inner_text().find('없') >= 0,
             쪽.locator('.table-card tbody').inner_text()[:40])
        쪽.click('.입고거르개 button'); 쪽.wait_for_timeout(400)
        본다('「조건 초기화」로 전부 되돌아온다', 줄수() == 전체, '%d줄' % 줄수())
        본다('가로 넘침 없음', 쪽.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
        본다('콘솔 에러 0', len(오류) == 0, 오류[:2])
        쪽.close()

        # ── ③ 폰 실화면 ──
        print('\n③ 폰 실화면 (390)')
        폰오류 = []
        폰 = 브.new_page(viewport={'width': 390, 'height': 844})
        폰.on('pageerror', lambda e: 폰오류.append(str(e)))
        폰.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        폰.add_init_script(심기)
        폰.goto(주소); 폰.wait_for_timeout(2000)
        본다('폰 재고 탭에도 거르개가 떴다', 폰.locator('.입고거르개').count() == 1)
        폰카드 = lambda: 폰.locator('.ph-list .ph-card').count()
        폰전체 = 폰카드()
        폰.select_option('.입고거르개 select', '푸른들농원'); 폰.wait_for_timeout(400)
        본다('폰에서도 업체로 줄어든다', 폰카드() < 폰전체, '%d장 → %d장' % (폰전체, 폰카드()))
        본다('폰 가로 넘침 없음', 폰.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
             폰.evaluate("document.documentElement.scrollWidth"))
        본다('폰 콘솔 에러 0', len(폰오류) == 0, 폰오류[:2])
        폰.close()
        브.close()
finally:
    서버.terminate()

print('\n%d/%d 통과' % (sum(1 for r in 결과 if r), len(결과)))
sys.exit(0 if all(결과) else 1)
