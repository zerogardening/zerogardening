# -*- coding: utf-8 -*-
# 11/11 문자 붙여넣기 나누기 다시 짬(11/11 신고 「입금했어요 ○○시 …N번길N 이름입니다」) — python3 v3/검수/51-붙여넣기나누기/나누기-시험.py [--실카카오]
# ① 사례.json(지어낸 어려운 경우) ② 변형(군말 줄 앞뒤·줄 순서 뒤집기 — 처음 보는 모양) ③ 실제 사례(백업/수동 · 깃 제외 · 있으면)
# ④ 화면 — 이름·상세·검색어 · 0건이면 다음 검색어 · 노란 확인 필요 · ✓ 일치 와 같이
# 🔴 로컬 전용 — supabase·카카오를 막고 카카오 우편번호는 가짜. --실카카오 는 새 주소(t1.kakaocdn.net)를 진짜로 한 번 불러 검색 건수만 본다
import re, json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
실제 = 뿌리.parent / '백업' / '수동' / '2026-11-11-붙여넣기' / '실제사례.json'
심기 = """localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{"a":1}'); sessionStorage.setItem('zg.새판시도','2');
window.daum = { Postcode: function (o) { this.embed = function (el, op) { window.__우편 = { o: o, op: op, 몇: (window.__우편 ? window.__우편.몇 : 0) + 1 }; }; } };
Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.resolve(window.__붙일글 || ''), writeText: () => Promise.resolve() } });"""
심기 += (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

사례 = json.loads((여기 / '사례.json').read_text(encoding='utf-8'))
# 처음 보는 모양 — 확인 없이 깔끔했던 여러 줄 사례에 군말 줄을 앞뒤로 붙이고, 줄 순서를 뒤집어도 같은 답이어야 한다
변형 = []
for 글, 이, 주, 상, 확, 뜻 in 사례:
    if 확: continue
    변형.append(['네 입금했어요\n' + 글 + '\n감사합니다^^', 이, 주, 상, False, 뜻 + ' + 군말 줄'])
    줄 = 글.split('\n')
    if len(줄) > 1 and not any(re.fullmatch(r'[\d\s동호층-]+|.*(동|호|층)', x) for x in 줄) and '보내는' not in 글:
        변형.append(['\n'.join(reversed(줄)), 이, 주, 상, False, 뜻 + ' + 줄 뒤집기'])

def 채점(쪽, 묶음, 제목, 다보임=True):
    답 = 쪽.evaluate("cs => cs.map(c => ZG.문자붙여넣기.나누기(c[0]))", 묶음)
    맞 = 0
    for c, r in zip(묶음, 답):
        ok = r['이름'] == c[1] and r['주소'] == c[2] and r['상세'] == c[3] and (c[4] is None or bool(r['확인']) == c[4])
        맞 += ok
        if 다보임 or not ok: 본다(제목 + ' · ' + c[5], ok, [r['이름'], r['주소'], r['상세'], r['확인']] if not ok else '')
    if not 다보임: 본다(제목 + ' %d/%d' % (맞, len(묶음)), 맞 == len(묶음))
    return 답

카_박 = {'zonecode': '31545', 'userSelectedType': 'R', 'query': '아산시 선장면 부엉산길200번길7', 'roadAddress': '충남 아산시 선장면 부엉산길200번길 7', 'roadname': '부엉산길200번길',
        'jibunAddress': '충남 아산시 선장면 신동리 1-1', 'sido': '충남', 'sigungu': '아산시', 'apartment': 'N', 'buildingName': ''}
카_세종 = {'zonecode': '03172', 'userSelectedType': 'R', 'query': '서울 종로구 세종대로 175', 'roadAddress': '서울 종로구 세종대로 175', 'roadname': '세종대로',
         'jibunAddress': '서울 종로구 세종로 1-68', 'sido': '서울', 'sigungu': '종로구', 'apartment': 'N', 'buildingName': ''}

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), '8853', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            쪽.goto('http://localhost:8853/%EC%A3%BC%EB%AC%B8.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.문자붙여넣기)', timeout=20000)

            # ── ①②③ 나누기만
            if 폰:
                채점(쪽, 사례, '사례')
                채점(쪽, 변형, '변형(처음 보는 모양)', False)
                if 실제.exists(): 채점(쪽, json.loads(실제.read_text(encoding='utf-8')), '실제 v3 문자주문 모양', False)
                else: print('  -- 실제 사례 파일 없음(깃 제외 자료) — 건너뜀')
                r = 쪽.evaluate("() => ZG.문자붙여넣기.나누기('충북 청주시 흥덕구 사운로 359-13 우림아파트 107동 1505호 김인순').검색어들")
                본다('359-13 → 검색어 후보에 「사운로359번길 13」', '충북 청주시 흥덕구 사운로359번길 13' in r, r)

            # ── ④ 화면
            쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }")
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(400)
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            판 = '.문자주문'
            이름칸, 주소칸, 상세칸 = 판 + ' input[placeholder="받는 분"]', 판 + ' [placeholder="주소"]', 판 + ' input[placeholder="상세주소"]'
            노랑 = 판 + ' .확인줄.비교안됨'
            def 새로(이름=''):
                쪽.evaluate("이 => { const s = ZG.문자주문새문자.상태; Object.assign(s, { 받는분: 이, 전화: '', 주소: '', 상세주소: '', 우편: '', 원문주소: '', 주소확인: '' }); window.__우편 = null; ZG.주문.다시그리기(); }", 이름)
                쪽.wait_for_timeout(250)
            def 붙이기(글):
                쪽.evaluate("g => { window.__붙일글 = g; }", 글)
                쪽.click(판 + ' button:has-text("손님 문자 붙여넣기")'); 쪽.wait_for_timeout(400)
            def 우편(): return 쪽.evaluate("() => window.__우편 && { q: window.__우편.op.q, 몇: window.__우편.몇 }")
            def 노란글(): return 쪽.inner_text(노랑) if 쪽.query_selector(노랑) and 쪽.is_visible(노랑) else ''

            새로(); 붙이기(사례[0][0])
            본다('박순자 — 받는 분 채움 · 상세 빈칸', 쪽.input_value(이름칸) == '박순자' and 쪽.input_value(상세칸) == '', [쪽.input_value(이름칸), 쪽.input_value(상세칸)])
            본다('박순자 — 주소칸·검색어에 「입금했어요」 없음', 쪽.input_value(주소칸) == '아산시 선장면 부엉산길200번길7' and 우편()['q'] == '아산시 선장면 부엉산길200번길7', [쪽.input_value(주소칸), 우편()])
            본다('박순자 — 노란 확인 필요 없음', 노란글() == '')
            쪽.evaluate("(d) => window.__우편.o.oncomplete(d)", 카_박); 쪽.wait_for_timeout(300)
            본다('박순자 — 고르면 ✓ 일치 · 상세 빈칸 그대로', 쪽.is_visible(판 + ' .확인줄.맞음') and 쪽.input_value(상세칸) == '' and 노란글() == '')

            # 0건 → 다음 검색어 · 손으로 친 검색은 안 건드림
            새로(); 붙이기('박옥순아산시 선장면 부엉산길200번길7')
            u0 = 우편()
            본다('붙은 이름 — 받는 분 비움 · 노란 「받는 분을 못 찾았습니다」', 쪽.input_value(이름칸) == '' and '받는 분을 못 찾았습니다' in 노란글(), 노란글().replace('\n', ' / '))
            쪽.evaluate("(q) => window.__우편.o.onsearch({ q: q, count: 0 })", u0['q']); 쪽.wait_for_timeout(200)
            u1 = 우편()
            본다('검색 0건 → 다음 검색어로 다시 펼침', u1['몇'] == u0['몇'] + 1 and u1['q'] == '선장면 부엉산길200번길7', [u0, u1])
            쪽.evaluate("() => window.__우편.o.onsearch({ q: '내가 친 글', count: 0 })"); 쪽.wait_for_timeout(200)
            본다('손으로 친 검색 0건 — 그대로', 우편()['몇'] == u1['몇'])
            쪽.evaluate("() => window.__우편.o.onsearch({ q: '선장면 부엉산길200번길7', count: 1 })"); 쪽.wait_for_timeout(200)
            본다('1건이면 멈춤', 우편()['몇'] == u1['몇'])
            쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")

            # 이름 둘 — 비우고 노랑 · 주소를 골라도 노랑은 남고 ✓ 와 같이
            새로(); 붙이기('김철수 이영희 서울 종로구 세종대로 175')
            본다('이름 둘 — 비움 · 노란 「김철수 · 이영희 중 누구?」', 쪽.input_value(이름칸) == '' and '김철수 · 이영희' in 노란글(), 노란글().replace('\n', ' / '))
            쪽.evaluate("(d) => window.__우편.o.oncomplete(d)", 카_세종); 쪽.wait_for_timeout(300)
            본다('골라도 ✓ 일치 아래 노란 확인 필요가 남음', 쪽.is_visible(판 + ' .확인줄.맞음') and '누구?' in 노란글())
            쪽.screenshot(path=str(여기 / ('1-확인필요-' + 틀 + '.png')), full_page=폰, animations='disabled')

            # 이름이 이미 적혀 있으면 이름 쪽은 묻지 않는다
            새로('홍길동'); 붙이기('충남 공주시 막골길 39')
            본다('이름 적힌 채 주소만 붙임 — 노랑 없음', 쪽.input_value(이름칸) == '홍길동' and 노란글() == '')
            쪽.evaluate("() => document.querySelectorAll('.pcscrim').forEach(e => { if (e.nextElementSibling) e.nextElementSibling.remove(); e.remove(); })")

            # 고르지 않고 닫음 — 빨간 안뜸 줄 + 노랑 같이
            새로(); 붙이기('안녕하세요 사장님~ 작약 2개 주문했던 사람이에요 주소는 경남 창원시 의창구 중앙대로 151 입니다 이름은 서지혜요')
            본다('군말 많음 — 서지혜 · 주소만 검색', 쪽.input_value(이름칸) == '서지혜' and 우편()['q'] == '경남 창원시 의창구 중앙대로 151', 우편())
            쪽.locator('button:has-text("✕ 닫기")').last.click(); 쪽.wait_for_timeout(300)
            본다('닫음 — 빨간 안뜸 줄과 노란 「못 넣은 글 — 작약」', 쪽.is_visible(판 + ' .확인줄.안뜸') and '작약' in 노란글())
            쪽.screenshot(path=str(여기 / ('2-안뜸과확인-' + 틀 + '.png')), full_page=폰, animations='disabled')

            본다('콘솔 빨간 에러 0 (' + 틀 + ')', not 오류, 오류[:3])
            쪽.close()

        # ── 진짜 카카오(새 주소) 한 번 — 스크립트가 kakaocdn 에서 오고 검색 건수가 온다
        if '--실카카오' in sys.argv:
            print('\n[실카카오]')
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844}, service_workers='block')
            for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**'): 쪽.route(길, lambda r: r.abort())
            받은 = []
            쪽.on('request', lambda r: 받은.append(r.url) if 'postcode' in r.url else None)
            쪽.add_init_script(심기.split('window.daum')[0] + "Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.resolve(window.__붙일글 || '') } });" + (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8'))
            쪽.goto('http://localhost:8853/%EC%A3%BC%EB%AC%B8.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.문자붙여넣기)', timeout=20000)
            쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }")
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(400)
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)
            쪽.evaluate("g => { window.__붙일글 = g; }", '입금했어요 서울 종로구 세종대로 175 홍길동입니다')
            쪽.click('.문자주문 button:has-text("손님 문자 붙여넣기")')
            쪽.wait_for_function("() => !!document.querySelector('iframe[src*=\"postcode\"], iframe')", timeout=15000); 쪽.wait_for_timeout(3000)
            본다('우편번호 스크립트 = t1.kakaocdn.net', any('t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js' in u for u in 받은) and not any('daumcdn' in u for u in 받은), [u[:70] for u in 받은][:3])
            쪽.screenshot(path=str(여기 / '3-실카카오-폰.png'), animations='disabled')
            쪽.close()
        브.close()
finally:
    서버.kill()
print('\n%d/%d' % (sum(결과), len(결과)))
