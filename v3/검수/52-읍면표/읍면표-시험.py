# -*- coding: utf-8 -*-
# 11/13 「전남 함평군 해보면」 신고 — python3 v3/검수/52-읍면표/읍면표-시험.py
# ① 나누기 — 읍·면 이름표(20l · 시군구 범위) · 「~하면·~보면」 어미 · 지번 「690~2」「690.2」 · 이름표에서 뽑은 헷갈리는 면 이름
# ② 화면(08c) — 원문에 시·군·구가 없으면 검색 후보 1개일 때만 ✓ 일치 · 지번을 골라도 주소칸은 도로명
# 🔴 로컬 전용 — supabase·카카오를 막고 우편번호는 가짜. 손님 이름·전화는 지어낸 것, 주소는 공개 지명·도로명
import re, json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
심기 = """localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{"a":1}'); sessionStorage.setItem('zg.새판시도','2');
window.daum = { Postcode: function (o) { this.embed = function (el, op) { window.__우편 = { o: o, op: op }; }; } };
Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.resolve(window.__붙일글 || ''), writeText: () => Promise.resolve() } });"""
심기 += (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

# [글, 이름, 주소, 상세, 확인있나(None=안 봄), 뜻]
사례 = [
    ['홍길순입니다 전남 함평군 해보면 상곡길 12 보내 주세요', '홍길순', '전남 함평군 해보면 상곡길 12', '', False, '함평군 + 해보면 = 지명'],
    ['전남 함평군 해보면 문장리690~2 하나마트 홍길순', '홍길순', '전남 함평군 해보면 문장리690-2', '하나마트', False, '지번 물결 붙여 씀(11/12 실제 꼴)'],
    ['전남 함평군 해보면 문장리 690.2\n홍길순', '홍길순', '전남 함평군 해보면 문장리 690-2', '', False, '지번 점'],
    ['해보면 상곡길 12 홍길순', '홍길순', '해보면 상곡길 12', '', False, '시군구 없이 해보면 — 전국 이름표에 있음'],
    ['확인해보면 충남 천안시 서북구 두정공원2길 50 홍길순', '홍길순', '충남 천안시 서북구 두정공원2길 50', '', False, '「확인해보면」 어미 — 주소에 안 붙음'],
    ['해보면 알겠지만 홍길순 경기 양평군 서종면 북한강로 112', '홍길순', '경기 양평군 서종면 북한강로 112', '', None, '양평군엔 해보면 없음 — 어미'],
    ['경북 상주시 해보면 문장리 690-2 홍길순', '홍길순', '문장리 690-2', '', True, '다른 시의 면 이름 — 확인 필요'],
    ['홍길순 서울 강남구 테헤란로 12 없으면 문앞에 두세요', '홍길순', '서울 강남구 테헤란로 12', '', None, '「없으면」 상세에 안 들어감'],
    ['홍길순 서울 강남구 테헤란로 12 1층\n오시면 전화주세요', '홍길순', '서울 강남구 테헤란로 12', '1층', None, '「오시면」 상세에 안 들어감'],
    ['홍길순입니다 도착하면 전화 주세요 서울 강남구 테헤란로 12', '홍길순', '서울 강남구 테헤란로 12', '', False, '「도착하면」 못 넣은 글 아님'],
    ['홍길순 세종 조치원읍 신흥리 12', '홍길순', '세종 조치원읍 신흥리 12', '', False, '세종 — 시군구 없음'],
    ['홍길순 11.13 입금', '홍길순', '', '', True, '날짜 11.13 은 번지 아님'],
    ['보내는 사람 김철수\n받는 사람 이영희 서울 강남구 테헤란로 12', '이영희', '서울 강남구 테헤란로 12', '', False, '받는 사람 라벨 — 같은 줄 「강남구」는 이름 아님'],
    ['받는분 김영동 경기 양평군 서종면 북한강로 112', '김영동', '경기 양평군 서종면 북한강로 112', '', False, '받는분 라벨 — 「양평군·서종면」 이름 아님'],
    ['연락 주세요 홍길순 서울 강남구 테헤란로 12', '홍길순', '서울 강남구 테헤란로 12', '', False, '「연락」 이름 아님'],
    ['전화 주시고 홍길순 서울 강남구 테헤란로 12', '홍길순', '서울 강남구 테헤란로 12', '', None, '「주시고」 이름 아님'],
]
기본수 = len(사례)
# 이름표에서 「~하면·~보면·~가면」 꼴 실제 면을 뽑아 — 시군구와 같이 · 시군구 없이 둘 다 지명이어야
표글 = (뿌리 / 'js' / '20l-읍면표.js').read_text(encoding='utf-8')
표 = json.loads(표글[표글.index('ZG.읍면표 = ') + len('ZG.읍면표 = '):].rstrip().rstrip(';'))
헷 = [(d, k, m) for d, x in 표.items() for k, v in x.items() for m in v.split() if re.search(r'(하|되|보|으|시|가|오|이|려|라|니)면$', m)]
for d, k, m in 헷:
    군 = '' if k == '-' else k + ' '
    사례.append(['홍길순 %s %s%s 신흥리 12' % (d, 군, m), '홍길순', '%s %s%s 신흥리 12' % (d, 군, m), '', False, '%s%s' % (군, m)])
    사례.append(['홍길순 %s 신흥리 12' % m, '홍길순', '%s 신흥리 12' % m, '', False, m + ' (시군구 없이)'])

def 카(도로, 길, 시군구, 지번='', 시도=''):
    return {'zonecode': '00000', 'userSelectedType': 'R', 'query': '', 'roadAddress': 도로, 'roadname': 길, 'jibunAddress': 지번,
            'sido': 시도, 'sigungu': 시군구, 'apartment': 'N', 'buildingName': ''}
카_대전 = 카('대전 중구 중앙로 10', '중앙로', '중구', '대전 중구 은행동 1-1', '대전')
카_두정 = 카('충남 천안시 서북구 두정공원2길 50', '두정공원2길', '천안시 서북구', '충남 천안시 서북구 두정동 1-1', '충남')
카_지번 = dict(카_두정, userSelectedType='J')

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), '8854', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (True, False):
            틀 = '폰' if 폰 else 'PC'
            print('\n[' + 틀 + ']')
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1400}, device_scale_factor=2 if 폰 else 1, service_workers='block')
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**', '**daumcdn.net**', '**kakaocdn.net**'): 쪽.route(길, lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto('http://localhost:8854/%EC%A3%BC%EB%AC%B8.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.문자붙여넣기 && ZG.읍면표)', timeout=20000)

            if 폰:
                답 = 쪽.evaluate("cs => cs.map(c => ZG.문자붙여넣기.나누기(c[0]))", 사례)
                맞 = 0
                for i, (c, r) in enumerate(zip(사례, 답)):
                    ok = r['이름'] == c[1] and r['주소'] == c[2] and r['상세'] == c[3] and (c[4] is None or bool(r['확인']) == c[4])
                    if i >= 기본수: 맞 += ok
                    if i < 기본수 or not ok: 본다('나누기 · ' + c[5], ok, [r['이름'], r['주소'], r['상세'], r['확인']] if not ok else '')
                본다('이름표에서 뽑은 헷갈리는 면 %d곳 × 2 — %d/%d' % (len(헷), 맞, len(사례) - 기본수), 맞 == len(사례) - 기본수)

            쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }")
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(400)
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            판 = '.문자주문'
            주소칸 = 판 + ' [placeholder="주소"]'
            def 해보기(글, 몇, d):
                쪽.evaluate("() => { const s = ZG.문자주문새문자.상태; Object.assign(s, { 받는분: '', 전화: '', 주소: '', 상세주소: '', 우편: '', 원문주소: '', 주소확인: '' }); window.__우편 = null; ZG.주문.다시그리기(); }")
                쪽.wait_for_timeout(250)
                쪽.evaluate("g => { window.__붙일글 = g; }", 글)
                쪽.click(판 + ' button:has-text("손님 문자 붙여넣기")'); 쪽.wait_for_timeout(400)
                if 몇 is not None: 쪽.evaluate("([q, n]) => window.__우편.o.onsearch({ q: q, count: n })", [쪽.evaluate("() => window.__우편.op.q"), 몇])
                쪽.evaluate("(d) => window.__우편.o.oncomplete(d)", d); 쪽.wait_for_timeout(300)
                맞음 = 쪽.query_selector(판 + ' .확인줄.맞음') is not None and 쪽.is_visible(판 + ' .확인줄.맞음')
                노 = 쪽.query_selector(판 + ' .확인줄.비교안됨')
                return 맞음, 쪽.inner_text(판 + ' .확인칸') if 노 else '', 쪽.input_value(주소칸), 쪽.evaluate("() => ZG.문자주문새문자.상태.주소확인")
            r = 해보기('홍길순 중앙로 10', 5, 카_대전)
            본다('시군구 없는 「중앙로 10」 · 후보 5개 → ✓ 아님 · 「시·군·구가 원문에 없고 후보가 여럿」', not r[0] and '시·군·구가 원문에 없고' in r[1] and r[3] == '비교안됨', r)
            쪽.screenshot(path=str(여기 / ('1-후보여럿-' + 틀 + '.png')), full_page=폰, animations='disabled')
            r = 해보기('홍길순 중앙로 10', None, 카_대전)
            본다('후보 수 모름 → ✓ 아님', not r[0] and r[3] == '비교안됨', r)
            r = 해보기('홍길순 두정공원2길 50', 1, 카_두정)
            본다('시군구 없는 「두정공원2길 50」 · 후보 1개 → ✓ 일치', r[0] and r[3] == '일치', r)
            r = 해보기('홍길순 대전 중구 중앙로 10', 5, 카_대전)
            본다('시군구 있는 「대전 중구 중앙로 10」 · 후보 5개 → ✓ 일치', r[0] and r[3] == '일치', r)
            r = 해보기('홍길순 천안 서북구 두정공원2길 50', 3, 카_두정)
            본다('「천안」(시 뗌) → 시군구 있음 → ✓ 일치', r[0] and r[3] == '일치', r)
            r = 해보기('홍길순 신흥리 12', 9, 카_지번)
            본다('리 이름만(여러 군에 있음) · 지번 골라도 → ✓ 아님 · 주소칸은 도로명', not r[0] and r[3] == '비교안됨' and r[2].startswith('충남 천안시 서북구 두정공원2길 50'), r)
            쪽.screenshot(path=str(여기 / ('2-지번골라도도로명-' + 틀 + '.png')), full_page=폰, animations='disabled')
            본다('콘솔 빨간 에러 0 (' + 틀 + ')', not 오류, 오류[:3])
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
