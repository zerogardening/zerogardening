# -*- coding: utf-8 -*-
# 13단계 상세페이지·식물정보 요청 검수
#   python3 v3/검수/제작요청-시험.py     ← 그대로 돌리면 된다 (playwright 필요)
# 샷은 이 파일 옆 「샷-13단계-제작요청/」에 떨어진다.
import json, sys, time, pathlib
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[1]
샷 = pathlib.Path(__file__).resolve().parent / '샷-13단계-제작요청'
샷.mkdir(exist_ok=True)
주소 = (뿌리 / 'index.html').as_uri()

# 로그인 게이트만 통과시킨다(검수용 가짜 세션).
# 🔴 로그인한 것으로 치면 00-시드는 안 심는다(서버 것을 기다린다) — 품목을 직접 심는다.
세션 = {"access_token": "검수용", "token_type": "bearer", "expires_in": 3600,
        "expires_at": int(time.time()) + 3600, "refresh_token": "검수용",
        "user": {"id": "00000000-0000-0000-0000-000000000000",
                 "aud": "authenticated", "role": "authenticated", "email": "검수@zg"}}

def 품목(코드, 유통명, 학명, 규격, 단가):
    return {"품목코드": 코드, "접두": 코드[:5], "학명3": 코드[:3], "일련번호": 코드[3:5],
            "규격cm": 규격, "규격": "%dcm 포트" % 규격, "유통명": 유통명, "학명": 학명,
            "학명키": 학명.lower(), "매입단가": 단가, "과세구분": "면세", "상태": "판매중",
            "특성": None, "등록일시": 1755000000000, "수정일시": 1755000000000}

def 입고(코드, 수량, 단가):
    return {"id": "rc_" + 코드, "입고일": "2026-08-01", "입고업체": "한아름농원", "품목코드": 코드,
            "유통명": "", "학명": "", "규격": "", "수량": 수량, "매입단가": 단가,
            "과세구분": "면세", "메모": "", "등록일시": 1755000000000}

품목들 = [품목("PER03-15", "수크령 '레드헤드'", "Pennisetum alopecuroides 'Red Head'", 15, 2800),
          품목("CAR01-10", "청사초", "Carex breviculmis", 10, 1900),
          품목("HEP01-15", "휴케라 '팰리스퍼플'", "Heuchera micrantha 'Palace Purple'", 15, 2900)]
입고들 = [입고("PER03-15", 120, 2800), 입고("CAR01-10", 80, 1900), 입고("HEP01-15", 40, 2900)]

심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token', %s);"
        "localStorage.setItem('zg.v3.품목', %s);"
        "localStorage.setItem('zg.v3.입고', %s);"
        % (json.dumps(json.dumps(세션)), json.dumps(json.dumps(품목들, ensure_ascii=False)),
           json.dumps(json.dumps(입고들, ensure_ascii=False))))
주소 = 주소 + '#재고'

결과, 에러 = [], []
def 본다(이름, 참, 덧=''):
    결과.append((참, 이름, 덧))

def 요청들(쪽):
    return json.loads(쪽.evaluate("localStorage.getItem('zg.v3.제작요청') || '[]'"))

def 고르기(쪽, 몇개):
    칸들 = 쪽.locator('tbody tr input[type=checkbox]')
    for i in range(몇개):
        칸들.nth(i).check()

def 눌러확인(쪽, 단추글, 샷이름=None):
    쪽.get_by_role('button', name=단추글, exact=True).first.click()
    쪽.wait_for_selector('.askbox')
    if 샷이름:
        쪽.wait_for_timeout(400)      # 확인창이 스르르 뜬다 — 다 뜬 뒤에 찍는다
        쪽.screenshot(path=str(샷 / 샷이름))
    쪽.locator('.askbox button.btn.main').click()
    쪽.wait_for_timeout(400)

with sync_playwright() as p:
    브 = p.chromium.launch()

    # ── PC ─────────────────────────────────────────────────────────────
    쪽 = 브.new_page(viewport={'width': 1440, 'height': 960})
    쪽.on('console', lambda m: 에러.append(m.text) if m.type == 'error' else None)
    쪽.on('pageerror', lambda e: 에러.append(str(e)))
    쪽.add_init_script(심기)
    쪽.goto(주소)
    쪽.wait_for_selector('tbody tr')

    # ① 두 종 골라 상세페이지 요청
    고르기(쪽, 2)
    본다('고르면 선택바가 뜬다', 쪽.locator('.선택바.보임').count() == 1)
    쪽.screenshot(path=str(샷 / '00-선택바.png'))
    눌러확인(쪽, '상세페이지', '00b-확인창.png')
    줄 = 요청들(쪽)
    본다('상세페이지 2줄이 쌓인다', len(줄) == 2, str(len(줄)))
    본다('종류·상태가 맞다',
         all(r['종류'] == '상세페이지' and r['상태'] == '대기' for r in 줄))
    본다('품목코드·유통명·규격이 실린다',
         all(r.get('품목코드') and r.get('유통명') and r.get('규격cm') for r in 줄))
    본다('표에 「상세 요청」 칩이 뜬다', 쪽.locator('.chip.요청').count() == 2,
         str(쪽.locator('.chip.요청').count()))
    쪽.screenshot(path=str(샷 / '01-상세페이지-요청됨.png'), full_page=True)

    # ② 같은 것을 다시 — 늘지 않아야 한다 (일괄이라 중복이 제일 흔한 사고다)
    고르기(쪽, 2)
    쪽.get_by_role('button', name='상세페이지', exact=True).first.click()
    쪽.wait_for_timeout(400)
    본다('이미 요청한 것은 확인창도 안 뜬다', 쪽.locator('.askbox').count() == 0)
    본다('줄이 늘지 않는다', len(요청들(쪽)) == 2, str(len(요청들(쪽))))
    막토스트 = 쪽.locator('.toast').last.text_content() or '(토스트 없음)'
    본다('「이미 요청」이라 알려준다', '이미 요청' in 막토스트, 막토스트)
    쪽.screenshot(path=str(샷 / '02-이미-요청됨.png'), full_page=True)

    # ③ 같은 품목에 식물정보는 따로 걸린다
    쪽.locator('.선택바 button:has-text("선택 해제")').click()
    고르기(쪽, 1)
    눌러확인(쪽, '식물정보')
    줄 = 요청들(쪽)
    본다('식물정보가 따로 한 줄 더 쌓인다', len(줄) == 3, str(len(줄)))
    본다('종류가 식물정보다', sum(1 for r in 줄 if r['종류'] == '식물정보') == 1)
    본다('한 품목에 칩이 둘 붙는다', 쪽.locator('tbody tr:has(.chip.요청) .chip.요청').count() == 3,
         str(쪽.locator('.chip.요청').count()))
    쪽.screenshot(path=str(샷 / '03-식물정보까지.png'), full_page=True)

    # ④ 「받음」으로 바뀌면 진행중으로 보인다 (맥 스크립트가 하는 일을 손으로 흉내낸다)
    쪽.evaluate("""() => {
      /* 저장소를 거쳐 바꾼다 — localStorage 를 직접 쓰면 이 탭 캐시가 안 갈린다.
         실제로는 맥 스크립트가 PATCH 한 것이 Realtime 으로 같은 자리에 들어온다 */
      var 키 = ZG.저장소.키.제작요청;
      var 첫줄 = ZG.저장소.읽기(키)[0];
      ZG.저장소.바꾸기(키, 첫줄.id, { 상태: '받음' });
      ZG.앱.다시그리기();
    }""")
    쪽.wait_for_timeout(300)
    본다('받아 가면 「진행중」으로 바뀐다', 쪽.locator('.chip.요청.진행').count() == 1,
         str(쪽.locator('.chip.요청.진행').count()))
    쪽.screenshot(path=str(샷 / '04-진행중.png'), full_page=True)

    # ── 폰 ─────────────────────────────────────────────────────────────
    폰 = 브.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    폰.on('console', lambda m: 에러.append('폰: ' + m.text) if m.type == 'error' else None)
    폰.on('pageerror', lambda e: 에러.append('폰: ' + str(e)))
    폰.add_init_script(심기)
    폰.goto(주소)
    폰.wait_for_selector('.ph-card')
    폰.get_by_role('button', name='선택', exact=True).click()
    폰.wait_for_timeout(200)
    본다('폰: 고르기 전에는 막대가 안 보인다', 폰.locator('.ph-작업막대.보임').count() == 0)
    폰.locator('.ph-card.고르는중').first.click()
    폰.wait_for_timeout(200)
    막대 = 폰.locator('.ph-작업막대.보임')
    본다('폰: 고르면 작업막대가 뜬다', 막대.count() == 1)
    본다('폰: 단추가 셋이다 (상세페이지·식물정보·삭제)', 막대.locator('button').count() == 3,
         str(막대.locator('button').count()))
    본다('폰: 삭제 단추에 개수가 붙는다', '1종 삭제' in (막대.locator('button.삭제').text_content() or ''),
         막대.locator('button.삭제').text_content() or '')
    폰.screenshot(path=str(샷 / '05-폰-작업막대.png'), full_page=True)
    폰.get_by_role('button', name='식물정보', exact=True).click()
    폰.wait_for_selector('.askbox')
    폰.locator('.askbox button.btn.main').click()
    폰.wait_for_timeout(400)
    본다('폰에서도 요청이 쌓인다', len(요청들(폰)) == 1, str(len(요청들(폰))))
    폰.screenshot(path=str(샷 / '06-폰-요청됨.png'), full_page=True)

    브.close()

본다('콘솔 에러 0', not 에러, ' / '.join(에러[:3]))

통과 = sum(1 for 참, _, _ in 결과 if 참)
for 참, 이름, 덧 in 결과:
    print(('  ✅ ' if 참 else '  ❌ ') + 이름 + (' — ' + 덧 if 덧 and not 참 else ''))
print('%d/%d · 샷 %s' % (통과, len(결과), 샷))
sys.exit(0 if 통과 == len(결과) else 1)
