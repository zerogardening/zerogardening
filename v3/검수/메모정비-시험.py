# -*- coding: utf-8 -*-
# 메모 화면 정비 검수 (2026-08-19 우람님 지시 7건)
#   python3 v3/검수/메모정비-시험.py     ← 그대로 돌리면 된다 (playwright 필요)
# 샷은 이 파일 옆 「샷-메모정비/」에 떨어진다.
import json, sys, pathlib
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
샷 = pathlib.Path(__file__).resolve().parent / '샷-메모정비'
샷.mkdir(exist_ok=True)
주소 = (뿌리 / '메모.html').as_uri()

def 메모(i, 상태, 날짜, 제목, 폴더=''):
    return {"id": "m-%s" % i, "종류": "메모", "날짜": 날짜, "상태": 상태, "폴더": 폴더,
            "본문": "<div>%s</div><div>본문 %s</div>" % (제목, i), "제목": 제목,
            "사진들": [], "만든때": 1755000000000 + i * 1000, "고친때": 1755000000000 + i * 1000}

씨앗 = [
    메모(1, "진행중", "2026-08-10", "가 진행중 오래된것", "밭"),
    메모(2, "완료",   "2026-08-18", "나 완료 최신"),
    메모(3, "보류",   "2026-08-15", "다 보류", "하우스"),
    메모(4, "진행중", "2026-08-17", "라 진행중 최신", "밭"),
    메모(5, "끝",     "2026-08-16", "마 옛끝→완료"),
    메모(6, "할일",   "2026-08-14", "바 옛할일→진행중"),
    메모(7, "",       "2026-08-12", "사 빈칸→진행중"),
]

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append((참, 이름, 덧))
    print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

# 🔴 01b-서버 는 토큰이 없으면 화면을 그리기 전에 로그인으로 튕긴다 — 검수용 가짜 토큰을 먼저 심는다.
# 바깥 통신은 통째로 막는다(supabase-js CDN 포함) — 로컬 전용으로 떨어져 화면은 그대로 뜬다
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token', '{\"검수용\":true}');"
        "localStorage.setItem('zg.v3.메모', %s);"
        # supabase-js 가 없는 것으로 만든다 — 01b 가 스스로 「로컬 전용」으로 떨어지는 길이다.
        # 안 막으면 가짜 토큰으로 getSession() 이 돌다 「세션 없음」으로 로그인 화면에 튕긴다
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});"
        ) % json.dumps(json.dumps(씨앗, ensure_ascii=False))

def 새쪽(브, 폭, 높이):
    쪽 = 브.new_page(viewport={'width': 폭, 'height': 높이})
    에러 = []
    쪽._에러 = 에러
    쪽.on('console', lambda m: 에러.append(m.text) if m.type == 'error' else None)
    쪽.on('pageerror', lambda e: 에러.append('pageerror: %s' % e))
    쪽.route('http://**', lambda r: r.abort())
    쪽.route('https://**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소)
    return 쪽

with sync_playwright() as p:
    브 = p.chromium.launch()
    for 폭, 높이, 판 in [(390, 844, '폰'), (1440, 900, 'PC')]:
        쪽 = 새쪽(브, 폭, 높이)
        에러 = 쪽._에러
        쪽.wait_for_selector('.mcard', timeout=8000)
        print('\n══════ %s (%dpx) ══════' % (판, 폭))

        # 1) 상단 진행상황 거르개 칩줄이 없다
        # PC 는 오른쪽에 쓰기 칸이 늘 열려 있다 — 거기 진행상황 칩은 있어야 맞다. 목록 쪽만 본다
        목록범위 = '.cols .left' if 판 == 'PC' else '.ph-body'
        칩글 = [t.strip() for t in 쪽.locator(목록범위 + ' .fchip').all_inner_texts()]
        본다('%s 상단 거르개에 진행상황 칩이 없다(폴더만)' % 판,
             not any(('할일' == t or '하는중' == t or '끝' == t or t.startswith('진행중')
                      or t.startswith('보류') or t.startswith('완료')) for t in 칩글), 칩글)
        # 5) 날짜 색인(날짜 머리줄 · 달 넘기기) 없음
        본다('%s 날짜 머리줄 없음' % 판, 쪽.locator('.mlist-wrap .ph-sec').count() == 0)
        본다('%s 달 넘기개(.mnav) 없음' % 판, 쪽.locator('.mnav').count() == 0)

        # 3) 차례 = 진행중 → 보류 → 완료, 각 칸 안은 작성일자 순(새것부터)
        제목들 = 쪽.locator('.mcard .mt').all_inner_texts()
        기대 = ['라 진행중 최신', '바 옛할일→진행중', '사 빈칸→진행중', '가 진행중 오래된것',
                '다 보류', '나 완료 최신', '마 옛끝→완료']
        본다('%s 카드 차례' % 판, 제목들 == 기대, 제목들)

        결 = 쪽.eval_on_selector_all('.mcard', "els => els.map(e => e.className)")
        바탕 = 쪽.eval_on_selector_all('.mcard', "els => els.map(e => getComputedStyle(e).backgroundColor)")
        본다('%s 진행중=흰바탕' % 판, 바탕[0] == 'rgb(255, 255, 255)', 바탕[0])
        본다('%s 보류=연한초록' % 판, 바탕[4] == 'rgb(233, 246, 236)', 바탕[4])
        본다('%s 완료=연한빨강' % 판, 바탕[5] == 'rgb(255, 241, 240)', 바탕[5])

        # 4) 꾹 누르면 수정모드
        상자 = 쪽.locator('.mcard').first.bounding_box()
        쪽.mouse.move(상자['x'] + 60, 상자['y'] + 20)
        쪽.mouse.down(); 쪽.wait_for_timeout(750); 쪽.mouse.up()
        쪽.wait_for_timeout(200)
        본다('%s 꾹누르기 → 수정모드' % 판, 쪽.locator('.editbar').count() == 1)
        본다('%s 카드마다 체크박스' % 판, 쪽.locator('.mcard .pick').count() == 7)
        본다('%s 카드마다 위아래 단추' % 판, 쪽.locator('.mcard .movers').count() == 7)
        본다('%s 꾹눌러도 메모가 안 열린다' % 판, 쪽.locator('.mcard').count() == 7)
        쪽.screenshot(path=str(샷 / ('%s-수정모드.png' % 판)), full_page=True)

        # 순서 바꾸기 — 1번 카드를 아래로
        쪽.locator('.mcard').nth(0).locator('.movers button').nth(1).click()
        쪽.wait_for_timeout(150)
        새제목 = 쪽.locator('.mcard .mt').all_inner_texts()
        본다('%s ↓ 로 카드 자리 바뀜' % 판,
             새제목[0] == '바 옛할일→진행중' and 새제목[1] == '라 진행중 최신', 새제목[:3])
        # 칸을 못 넘는다 — 진행중 맨 아래에서 ↓ 를 눌러도 보류로 안 내려간다
        쪽.locator('.mcard').nth(3).locator('.movers button').nth(1).click()
        쪽.wait_for_timeout(150)
        본다('%s 진행중 칸을 넘어가지 않는다' % 판,
             쪽.locator('.mcard .mt').all_inner_texts()[4] == '다 보류')

        # 일괄 진행상태 변경 — 맨 위 두 개를 보류로
        쪽.locator('.mcard .pick').nth(0).click()
        쪽.locator('.mcard .pick').nth(1).click()
        쪽.wait_for_timeout(100)
        쪽.locator('.editbar button', has_text='보류').first.click()
        쪽.wait_for_timeout(250)
        옮긴뒤 = 쪽.locator('.mcard .mt').all_inner_texts()
        # 보류로 옮기면 옛 순서를 버리고 그 칸에서 작성일자 순(새것부터)으로 다시 선다
        본다('%s 일괄 보류 — 두 건이 보류 칸으로' % 판,
             옮긴뒤 == ['사 빈칸→진행중', '가 진행중 오래된것',
                        '라 진행중 최신', '다 보류', '바 옛할일→진행중',
                        '나 완료 최신', '마 옛끝→완료'], 옮긴뒤)

        # 일괄 삭제 — 완료 두 건
        쪽.locator('.mcard .pick').nth(5).click()
        쪽.locator('.mcard .pick').nth(6).click()
        쪽.wait_for_timeout(100)
        쪽.locator('.editbar button', has_text='삭제').first.click()
        쪽.wait_for_selector('.askbox')
        쪽.locator('.askbox button', has_text='지우기').click()
        쪽.wait_for_timeout(300)
        본다('%s 일괄 삭제' % 판, 쪽.locator('.mcard').count() == 5, 쪽.locator('.mcard').count())

        쪽.locator('.editbar button', has_text='끝내기').click()
        쪽.wait_for_timeout(200)
        본다('%s 끝내기 → 수정모드 꺼짐' % 판, 쪽.locator('.editbar').count() == 0 and 쪽.locator('.mcard .pick').count() == 0)
        본다('%s 수정모드 끄면 카드가 다시 열린다' % 판, 쪽.locator('.mcard').first.get_attribute('class') is not None)

        쪽.screenshot(path=str(샷 / ('%s-메모목록.png' % 판)), full_page=True)

        # 2·7) 메모 쓰기 화면 — 폴더 드롭다운 + ＋ · 진행상황 3가지
        if 판 == '폰':
            쪽.locator('.ph-fab').click()
        else:
            쪽.locator('button', has_text='＋ 새 메모').first.click()
        쪽.wait_for_selector('.foldrow select')
        고름 = 쪽.locator('.foldrow select')
        본다('%s 폴더는 드롭다운(select)' % 판, 고름.count() == 1)
        본다('%s 폴더 목록에 기존 폴더가 있다' % 판,
             '밭' in 고름.locator('option').all_inner_texts(), 고름.locator('option').all_inner_texts())
        본다('%s 폴더 손입력 칸이 없다' % 판, 쪽.locator('.foldrow input').count() == 0)

        상태칩 = [t.strip() for t in 쪽.locator('.field', has_text='진행상황').locator('.fchip').all_inner_texts()]
        본다('%s 진행상황 = 진행중·완료·보류' % 판, 상태칩 == ['진행중', '완료', '보류'], 상태칩)
        본다('%s 새 메모 기본값 = 진행중' % 판,
             쪽.locator('.field', has_text='진행상황').locator('.fchip.on').inner_text().strip() == '진행중')

        # ＋ 로 새 폴더
        쪽.locator('.foldrow button').click()
        쪽.wait_for_selector('.askbox input')
        쪽.locator('.askbox input').fill('온실')
        쪽.locator('.askbox button', has_text='만들기').click()
        쪽.wait_for_timeout(250)
        본다('%s ＋ 로 새 폴더가 만들어져 골라진다' % 판,
             쪽.locator('.foldrow select').input_value() == '온실', 쪽.locator('.foldrow select').input_value())

        # 6) 폰 글자칸 16px (아이폰 확대 방지)
        if 판 == '폰':
            쪽.locator('.edit').click()
            쪽.keyboard.type('키보드 시험')
            크기 = 쪽.eval_on_selector_all(
                '.inp, .edit, .sisan, textarea, select',
                "els => els.map(e => parseFloat(getComputedStyle(e).fontSize))")
            본다('폰 글자칸이 전부 16px 이상', all(v >= 16 for v in 크기), 크기)
            쪽.screenshot(path=str(샷 / '폰-메모쓰기.png'), full_page=True)
        else:
            쪽.screenshot(path=str(샷 / 'PC-메모쓰기.png'), full_page=True)

        본다('%s 콘솔 에러 없음' % 판, len(에러) == 0, 에러[:3])
        쪽.close()

    # 영농일지 탭이 안 깨졌나 (달력은 그대로 있어야 한다)
    쪽 = 새쪽(브, 390, 844)
    에러 = 쪽._에러
    쪽.wait_for_selector('.mcard')
    쪽.locator('.toggle button', has_text='영농일지').click()
    쪽.wait_for_selector('.cal')
    본다('영농일지 달력 정상(회귀)', 쪽.locator('.cal .d').count() > 28 and 쪽.locator('.calhd .m').count() == 1)
    본다('영농일지 에러 없음(회귀)', len(에러) == 0, 에러[:3])
    쪽.screenshot(path=str(샷 / '폰-영농일지.png'), full_page=True)
    # ── 6) 확대 문제 — 다섯 화면 전부 폰 폭에서 글자칸을 훑는다 ──
    print('\n══════ 폰 글자칸 16px (모든 탭) ══════')
    for 파일 in ['index.html', '주문.html', '업체.html', '소싱.html', '메모.html']:
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('http://**', lambda r: r.abort()); 쪽.route('https://**', lambda r: r.abort())
        쪽.add_init_script(심기)
        쪽.goto((뿌리 / 파일).as_uri())
        쪽.wait_for_timeout(1200)
        크기 = 쪽.eval_on_selector_all(
            "input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]), textarea, select, .edit, .sisan, .inp",
            "els => [...new Set(els.map(e => parseFloat(getComputedStyle(e).fontSize)))]")
        본다('%s — 글자칸 전부 16px 이상' % 파일, 크기 and all(v >= 16 for v in 크기), 크기)
        본다('%s — 에러 없음' % 파일, len(오류) == 0, 오류[:2])
        쪽.close()

    브.close()

안된것 = [r for r in 결과 if not r[0]]
print('\n═══ %d/%d 통과 ═══' % (len(결과) - len(안된것), len(결과)))
sys.exit(1 if 안된것 else 0)
