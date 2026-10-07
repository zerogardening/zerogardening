# -*- coding: utf-8 -*-
# 문자주문 검수 — 로컬 서버 + headless 크롬, 바깥 접속 전부 막음, localStorage 시드만
import pathlib, shutil, subprocess, sys, tempfile, time, json, urllib.parse
from playwright.sync_api import sync_playwright

원본 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
샷 = 원본 / '검수' / '문자주문'
샷.mkdir(parents=True, exist_ok=True)
PORT = 8833
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});"
        "Object.defineProperty(navigator,'serviceWorker',{get:()=>undefined});"
        "window.__sms=[];window.print=function(){window.__printed=(window.__printed||0)+1;};")
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append((bool(참), 이름, 덧))
    print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

터 = pathlib.Path(tempfile.mkdtemp(prefix='zg-sm-'))
사본 = 터 / 'v3'
shutil.copytree(원본, 사본, ignore=shutil.ignore_patterns('검수', '시안', '설계', '.git'))
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', str(사본)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
밑 = 'http://127.0.0.1:%d/' % PORT

CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
def 단계(s):
    c = ord(s) - 0xAC00
    if c < 0 or c > 11171: return [s]
    cho, jung, jong = c // 588, (c % 588) // 28, c % 28
    st = [CHO[cho], chr(0xAC00 + cho * 588 + jung * 28)]
    if jong: st.append(s)
    return st

def 한글(쪽, cdp, 글, 끝조합남김=False):
    for i, s in enumerate(글):
        for t in 단계(s):
            cdp.send('Input.imeSetComposition', {'text': t, 'selectionStart': len(t), 'selectionEnd': len(t)})
            쪽.wait_for_timeout(40)
        if 끝조합남김 and i == len(글) - 1: break
        cdp.send('Input.insertText', {'text': s})
        쪽.wait_for_timeout(40)

def 고쳐쓰기(쪽, loc, 값):
    loc.click(); 쪽.wait_for_timeout(50)
    for _ in range(14): 쪽.keyboard.press('Backspace')
    if 값: 쪽.keyboard.type(값, delay=20)
    쪽.wait_for_timeout(250)

def 새쪽(브, 폰):
    ctx = 브.new_context(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 900},
                        device_scale_factor=2 if 폰 else 1, has_touch=폰, is_mobile=False)
    def 길(route):
        u = route.request.url
        if u.startswith(밑): route.continue_()
        else: route.abort()
    ctx.route('**/*', 길)
    ctx.add_init_script(심기)
    쪽 = ctx.new_page()
    쪽.__dict__['오류'] = []
    쪽.on('pageerror', lambda e: 쪽.__dict__['오류'].append('pageerror: ' + str(e)))
    쪽.on('console', lambda m: 쪽.__dict__['오류'].append('console.' + m.type + ': ' + m.text) if m.type == 'error' and 'net::ERR' not in m.text and 'Failed to load resource' not in m.text else None)
    return ctx, 쪽

def 시드(쪽, 계좌=True):
    쪽.evaluate("""(계좌) => {
      const 저 = ZG.저장소;
      if (!저.품목들().length) ZG.시드.심기();
      if (계좌 && !ZG.업체자료.자사()) 저.덧붙이기(저.키.업체, {id:'c_self', 이름:'제로가드닝', 내업체:true, 전화:'010-1111-2222', 입금계좌:'  농협 351-1390-7063-23 김두용(제로가드닝)  '});
      // 튤립 5개입 판매단가 — 개당 계산 확인용
      저.바꾸기(저.키.품목, 'ECP01-15', {판매단가: 15000, 판매단위: 5});
      // 같은 날 번호 최댓값 확인용 — 오늘 번호 05 하나 미리
      const 오늘 = ZG.ui.오늘문자(), 앞 = 오늘.slice(2,4)+오늘.slice(5,7)+오늘.slice(8,10);
      저.덧붙이기(저.키.주문, {id:'o_seed', 주문번호: 앞+'-05', 주문일: 오늘, 판매처:'전화주문', 품목코드:'CAR01-10', 유통명:'청사초', 주문수량:1, 단가:1000, 수령인:'시드', 출처:'수동', 등록일시: Date.now()});
      // 원래 문자주문 시험 줄들 (제목 순서 확인)
      const 지금 = Date.now();
      const p = (c,n,q,d) => ({품목코드:c, 유통명:n, 학명:'', 규격:'15cm', 수량:q, 단가:d});
      [
        {id:'sm_t1', 받는분:'김정원', 전화:'01012345678', 메모:'', 품목:[p('HEP01-15',"휴케라 '팰리스퍼플'",3,5800)], 배송비:4500, 상태:'저장'},
        {id:'sm_t2', 받는분:'', 전화:'01099998888', 메모:'메모있음', 품목:[p('CAR01-10','청사초',2,3800)], 배송비:0, 상태:'보냄', 보낸일시:지금},
        {id:'sm_t3', 받는분:'', 전화:'', 메모:'화단 손님', 품목:[p('CAR01-10','청사초',2,3800)], 배송비:4500, 상태:'저장'},
        {id:'sm_t4', 받는분:'', 전화:'', 메모:'', 품목:[p('CAR01-10','청사초',1,3800), p('FES01-10','털수염풀',2,2800), p('SAC01-15','숙근사루비아',1,4600)], 배송비:4500, 상태:'저장'},
        {id:'sm_t5', 받는분:'', 전화:'', 메모:'', 품목:[p('CAR01-10','청사초',1,3800)], 배송비:4500, 상태:'저장'},
      ].forEach((r,i) => { r.날짜 = 오늘; r.주소=''; r.등록일시 = 지금 - (i+1)*60000; r.수정일시 = r.등록일시; 저.덧붙이기(저.키.문자주문, r); });
      // 지난달 하나 — 달력 점 확인
      저.덧붙이기(저.키.문자주문, {id:'sm_old', 날짜:'2026-09-15', 받는분:'박지난', 전화:'01055556666', 메모:'', 주소:'', 품목:[p('CAR01-10','청사초',1,3800)], 배송비:4500, 상태:'보냄', 등록일시: 지금-86400000*22, 수정일시: 지금-86400000*22});
    }""", 계좌)

def 재고표(쪽):
    return 쪽.evaluate("""() => { const 저=ZG.저장소, k=저.키; return JSON.stringify([k.입고,k.출고,k.재고조정,k.품목].map(x => 저.읽기(x))); }""")

def 문자탭(쪽):
    쪽.locator('[role=tab]', has_text='문자주문').first.click()
    쪽.wait_for_timeout(300)

def 잡기(쪽):
    # 문자열기 감싸기 — 실제 sms: 링크 대신 기록만
    쪽.evaluate("""() => { const 원 = ZG.문자주문자료.문자열기; ZG.문자주문자료.문자열기 = function(전화, 글){ window.__sms.push({전화, 글, 링크: 'sms:' + ZG.문자주문자료.숫자만(전화) + '?body=' + encodeURIComponent(글)}); }; }""")

with sync_playwright() as p:
    브 = p.chromium.launch()
    try:
        # ════════ 폰 ════════
        print('\n[폰 390]')
        ctx, 쪽 = 새쪽(브, True)
        cdp = ctx.new_cdp_session(쪽)
        쪽.goto(밑 + '주문.html')
        쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.주문)', timeout=20000)
        쪽.wait_for_timeout(600)
        시드(쪽)
        재고전 = 재고표(쪽)
        쪽.evaluate('ZG.주문.다시그리기()')
        문자탭(쪽)
        잡기(쪽)
        쪽.screenshot(path=str(샷 / '폰-1-새문자-빈.png'), full_page=True)
        본다('폰 새 문자 화면이 뜬다', 쪽.locator('.문자주문 .말풍선').count() == 1)
        본다('빈 상태: 저장·문자 단추 잠김', 쪽.locator('.보냄줄 button').first.is_disabled() and 쪽.locator('.보냄줄 button').nth(1).is_disabled())
        배송값 = 쪽.locator('.배송줄 input').input_value()
        본다('배송비 기본 4,500', 배송값 == '4,500', 배송값)

        # 검색칸 한글 조합
        검색 = 쪽.locator('.문자주문 input[type=search]')
        검색.click()
        한글(쪽, cdp, '휴케라')
        쪽.wait_for_timeout(400)
        본다('검색칸 한글 조합 안 깨짐(휴케라)', 검색.input_value() == '휴케라', 검색.input_value())
        n후보 = 쪽.locator('.문자주문 .ac .it').count()
        본다('후보가 뜬다', n후보 >= 1, n후보)
        쪽.screenshot(path=str(샷 / '폰-2-검색후보.png'), full_page=True)
        쪽.locator('.문자주문 .ac .it').first.click()
        쪽.wait_for_timeout(200)
        검색.click(); 한글(쪽, cdp, '에키'); 쪽.wait_for_timeout(400)
        쪽.locator('.문자주문 .ac .it').first.click()
        쪽.wait_for_timeout(200)
        # 에키네시아 판매단가 15000 / 판매단위 5 → 개당 3000
        담은 = 쪽.evaluate('JSON.stringify(ZG.문자주문새문자.상태.담은것)')
        본다('개당 단가 = 판매단가÷판매단위 (15,000÷5=3,000)', '"단가":3000' in 담은, 담은)
        본다('판매단가 없으면 매입×2 (휴케라 2,900→5,800)', '"단가":5800' in 담은)
        # 같은 것 또 고르면 +1
        검색.click(); 한글(쪽, cdp, '에키'); 쪽.wait_for_timeout(400)
        쪽.locator('.문자주문 .ac .it').first.click(); 쪽.wait_for_timeout(200)
        담은 = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문새문자.상태.담은것)'))
        본다('같은 품목 다시 고르면 수량+1', len(담은) == 2 and any(r['수량'] == 2 for r in 담은), 담은)
        # 검색칸 글로 품목 안 만듦
        검색.click(); 한글(쪽, cdp, '없는식물'); 쪽.wait_for_timeout(400)
        검색.press('Enter'); 쪽.wait_for_timeout(200)
        본다('없는 글 엔터 → 품목 안 생김', len(json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문새문자.상태.담은것)'))) == 2)
        검색.fill(''); 쪽.wait_for_timeout(300)

        말 = lambda: 쪽.locator('.말풍선').inner_text()
        글 = 말()
        print('    미리보기(이름 없음):\n' + '\n'.join('      | ' + x for x in 글.split('\n')))
        본다('이름 없으면 머리 「🌱 [제로가드닝]\\n주문 내역 안내」', 글.startswith('🌱 [제로가드닝]\n주문 내역 안내\n'))
        본다('단위 「개」', '개X' in 글 and '주' not in 글.replace('주문', ''), '')
        본다('배송비 4,500 줄', '배송비 4,500원' in 글)
        본다('합계 = 5,800×1+3,000×2+4,500 = 16,300', '합계: 16,300원' in 글)
        본다('입금계좌 들어감(다듬음)', '💰입금계좌\n농협 351-1390-7063-23 김두용(제로가드닝)' in 글 and not 글.endswith(' '))
        # 단가 고치기
        고쳐쓰기(쪽, 쪽.locator('.ph-card.담음').first.locator('input.won'), '6000')
        본다('단가 고치면 합계 반영(6,000+6,000+4,500=16,500)', '합계: 16,500원' in 말())
        # 배송비 0 / 빈칸
        배 = 쪽.locator('.배송줄 input')
        고쳐쓰기(쪽, 배, '0')
        본다('배송비 0 → 줄 빠짐·합계 12,000', '배송비' not in 말() and '합계: 12,000원' in 말())
        고쳐쓰기(쪽, 배, '')
        본다('배송비 빈칸 → 줄 빠짐', '배송비' not in 말())
        고쳐쓰기(쪽, 배, '3000')
        본다('배송비 고쳐 쓰기 3,000 반영', '배송비 3,000원' in 말() and '합계: 15,000원' in 말())
        # 이름: 한글 조합
        받 = 쪽.locator('.field', has_text='받는 분').locator('input')
        받.click(); 한글(쪽, cdp, '홍길동'); 쪽.wait_for_timeout(300)
        본다('받는 분 한글 조합(홍길동)', 받.input_value() == '홍길동', 받.input_value())
        본다('이름 있으면 「홍길동 님 주문 안내」', 말().startswith('🌱 [제로가드닝]\n홍길동 님 주문 안내\n'))
        본다('전화 없으면 「문자」 잠김·「저장」 열림', 쪽.locator('.보냄줄 button').nth(1).is_disabled() and not 쪽.locator('.보냄줄 button').first.is_disabled())
        전 = 쪽.locator('.field', has_text='전화번호').locator('input')
        전.fill('010-7777-8888'); 쪽.wait_for_timeout(200)
        본다('전화 넣으면 「문자」 열림', not 쪽.locator('.보냄줄 button').nth(1).is_disabled())
        메 = 쪽.locator('.field', has_text='메모').locator('input')
        메.click(); 한글(쪽, cdp, '현관앞'); 쪽.wait_for_timeout(300)
        본다('메모 한글 조합(현관앞)', 메.input_value() == '현관앞', 메.input_value())
        쪽.screenshot(path=str(샷 / '폰-3-새문자-채움.png'), full_page=True)
        쪽.locator('.보냄줄 button', has_text='문자').click(); 쪽.wait_for_timeout(400)
        sms = 쪽.evaluate('window.__sms')
        본다('「문자」 → sms 링크 만들어짐', len(sms) == 1 and sms[0]['링크'].startswith('sms:01077778888?body='), sms[0]['링크'][:60] if sms else '')
        if sms:
            풀 = urllib.parse.unquote(sms[0]['링크'].split('?body=')[1])
            본다('링크 본문 되풀면 원문과 같다(🌱·💰·줄바꿈)', 풀 == sms[0]['글'])
        최근 = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부()[0])'))
        본다('문자 → 저장(상태 보냄·보낸일시)', 최근['상태'] == '보냄' and 최근.get('보낸일시') and 최근['받는분'] == '홍길동' and 최근['배송비'] == 3000, {k: 최근.get(k) for k in ('상태', '받는분', '메모', '배송비', '전화')})
        본다('보낸 뒤 새 문자 비워짐·배송비 4,500 복귀', 쪽.locator('.배송줄 input').input_value() == '4,500')

        # 받는 분 조합 중에 바로 「저장」 — 마지막 글자 조합 중
        검색.click(); 한글(쪽, cdp, '청사'); 쪽.wait_for_timeout(400); 쪽.locator('.문자주문 .ac .it').first.click(); 쪽.wait_for_timeout(200)
        받 = 쪽.locator('.field', has_text='받는 분').locator('input')
        받.click(); 한글(쪽, cdp, '이순신', 끝조합남김=True)
        쪽.locator('.보냄줄 button', has_text='저장').click(); 쪽.wait_for_timeout(400)
        최근 = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부()[0])'))
        본다('[경합] 이름 조합 중 바로 「저장」 → 이름이 저장되나', 최근['받는분'] == '이순신', repr(최근['받는분']))
        # 영문·숫자 입력 직후 120ms 안에 저장
        검색.click(); 한글(쪽, cdp, '청사'); 쪽.wait_for_timeout(400); 쪽.locator('.문자주문 .ac .it').first.click(); 쪽.wait_for_timeout(200)
        받 = 쪽.locator('.field', has_text='받는 분').locator('input')
        받.click(); 쪽.keyboard.type('Kim', delay=10)
        쪽.locator('.보냄줄 button', has_text='저장').click(); 쪽.wait_for_timeout(400)
        최근 = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부()[0])'))
        본다('[경합] 영문 타이핑 직후 「저장」 → 이름 저장되나', 최근['받는분'] == 'Kim', repr(최근['받는분']))
        # 이름 없이 저장 (전화 없이)
        검색.click(); 한글(쪽, cdp, '청사'); 쪽.wait_for_timeout(400); 쪽.locator('.문자주문 .ac .it').first.click(); 쪽.wait_for_timeout(200)
        쪽.locator('.보냄줄 button', has_text='저장').click(); 쪽.wait_for_timeout(400)
        최근 = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부()[0])'))
        본다('이름·전화 없이 「저장」 → 저장됨', 최근['상태'] == '저장' and 최근['받는분'] == '')
        요약 = 쪽.locator('.ph-sub').inner_text()
        본다('요약줄 오늘 문자 n건', '오늘 문자' in 요약, 요약.replace('\n', ' '))

        # ── 목록 ──
        쪽.locator('button', has_text='문자주문 목록').click(); 쪽.wait_for_timeout(500)
        쪽.screenshot(path=str(샷 / '폰-4-목록.png'), full_page=True)
        제목들 = 쪽.locator('.문카드 .r1 .nm').all_inner_texts()
        print('    목록 제목:', 제목들)
        본다('제목: 이름', '김정원' in 제목들)
        본다('제목: 전화', '010-9999-8888' in 제목들)
        본다('제목: 메모', '화단 손님' in 제목들)
        본다('제목: 첫 품목 외 n종', '청사초 외 2종' in 제목들)
        본다('제목: 1종이면 「외」 없음', '청사초' in 제목들)
        본다('달력 있음', 쪽.locator('.문자주문 .cal').count() == 1)
        요약 = 쪽.locator('.ph-sub').inner_text()
        본다('목록 요약줄 저장·보냄·올림', '저장' in 요약 and '올림' in 요약, 요약.replace('\n', ' '))
        # 달력 지난달 점·날짜
        쪽.locator('.calhd button[aria-label="지난 달"]').click(); 쪽.wait_for_timeout(300)
        점 = 쪽.locator('.cal button.d', has_text='15').first.locator('i').get_attribute('class')
        본다('지난달 9/15 점 표시', 점 != 'none', 점)
        쪽.locator('.cal button.d[aria-label^="9월 15일"]').click(); 쪽.wait_for_timeout(300)
        본다('9/15 고르면 박지난 나옴', '박지난' in 쪽.locator('.문카드 .r1 .nm').all_inner_texts())
        쪽.screenshot(path=str(샷 / '폰-5-달력지난달.png'), full_page=True)
        쪽.locator('.calhd button[aria-label="다음 달"]').click(); 쪽.wait_for_timeout(300)
        오늘칸 = 쪽.locator('.cal button.d.today'); 오늘칸.click(); 쪽.wait_for_timeout(300)
        # 검색 한글 — 모든 날짜
        찾 = 쪽.locator('.문자주문 input.찾기')
        찾.click(); 한글(쪽, cdp, '박지'); 쪽.wait_for_timeout(400)
        찾 = 쪽.locator('.문자주문 input.찾기')
        본다('목록 검색 한글 조합(박지)', 찾.input_value() == '박지', 찾.input_value())
        본다('검색은 모든 날짜(9/15 박지난)', '박지난' in 쪽.locator('.문카드 .r1 .nm').all_inner_texts())
        쪽.screenshot(path=str(샷 / '폰-6-검색.png'), full_page=True)
        찾.fill('9999'); 쪽.wait_for_timeout(400)
        본다('전화 숫자로 찾기', '010-9999-8888' in 쪽.locator('.문카드 .r1 .nm').all_inner_texts())
        찾.fill(''); 쪽.wait_for_timeout(400)

        # 펼쳐 고치기
        카드 = 쪽.locator('.문카드', has_text='김정원')
        카드.locator('.r1').click(); 쪽.wait_for_timeout(300)
        카드 = 쪽.locator('.문카드', has_text='김정원')
        본다('펼침 판 뜸', 카드.locator('.속').count() == 1)
        카드.locator('.qty button[aria-label="하나 늘리기"]').first.click(); 쪽.wait_for_timeout(100)
        b = 카드.locator('.속 .field', has_text='받는 분').locator('input'); b.click(); b.press('End'); 한글(쪽, cdp, '님'); 쪽.wait_for_timeout(300)
        본다('펼침 받는 분 한글 조합', b.input_value() == '김정원님', b.input_value())
        쪽.screenshot(path=str(샷 / '폰-7-펼침고치기.png'), full_page=True)
        카드.locator('.속 button', has_text='저장').click(); 쪽.wait_for_timeout(300)
        r = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.하나("sm_t1"))'))
        본다('화면 안 수정 저장(수량 3→4, 이름)', r['품목'][0]['수량'] == 4 and r['받는분'] == '김정원님' and r['상태'] == '저장', (r['품목'][0]['수량'], r['받는분']))
        # 다시 보내기 (보냄 줄 펼쳐 「문자」)
        카드 = 쪽.locator('.문카드', has_text='010-9999-8888'); 카드.locator('.r1').click(); 쪽.wait_for_timeout(300)
        카드 = 쪽.locator('.문카드', has_text='010-9999-8888')
        n = len(쪽.evaluate('window.__sms'))
        카드.locator('.속 button', has_text='문자').click(); 쪽.wait_for_timeout(300)
        본다('보냄 줄 펼쳐 「문자」 다시 보내기', len(쪽.evaluate('window.__sms')) == n + 1)
        # 저장 줄 접힌 상태 「문자」(전화 없으면 잠김)
        카드 = 쪽.locator('.문카드', has_text='화단 손님')
        본다('전화 없는 저장 줄 「문자」 잠김', 카드.locator('.act button', has_text='문자').is_disabled())
        # 스와이프 삭제
        카드 = 쪽.locator('.문카드', has_text='청사초 외 2종'); bb = 카드.bounding_box()
        y = bb['y'] + 20
        쪽.mouse.move(bb['x'] + bb['width'] - 30, y); 쪽.mouse.down()
        for i in range(1, 11): 쪽.mouse.move(bb['x'] + bb['width'] - 30 - i * 12, y + 1)
        쪽.mouse.up(); 쪽.wait_for_timeout(400)
        쪽.screenshot(path=str(샷 / '폰-8-쓸어삭제.png'), full_page=True)
        삭 = 쪽.locator('.쓸줄', has_text='청사초 외 2종').locator('.쓸단추 button')
        삭.click(); 쪽.wait_for_timeout(300)
        쪽.screenshot(path=str(샷 / '폰-9-삭제확인.png'), full_page=True)
        쪽.locator('.askbox button', has_text='삭제').click(); 쪽.wait_for_timeout(400)
        본다('쓸어서 삭제', 쪽.evaluate('!ZG.문자주문자료.전부().some(r => r.id==="sm_t4")'))

        # 주문올리기
        카드 = 쪽.locator('.문카드', has_text='화단 손님')
        카드.locator('.act button', has_text='주문올리기').click(); 쪽.wait_for_timeout(300)
        카드 = 쪽.locator('.문카드.올리는중')
        이름칸 = 카드.locator('.field', has_text='받는 분').locator('input')
        올 = 카드.locator('button', has_text='주문올리기')
        본다('이름 빈칸 → 빨강(need)+단추 잠김', 'need' in (이름칸.get_attribute('class') or '') and 올.is_disabled())
        쪽.screenshot(path=str(샷 / '폰-10-올리기판-빈이름.png'), full_page=True)
        이름칸.click(); 한글(쪽, cdp, '최화단'); 쪽.wait_for_timeout(200)
        본다('올리기 판 이름 한글 조합', 이름칸.input_value() == '최화단', 이름칸.input_value())
        본다('이름 치면 단추 열림', not 올.is_disabled() and 'need' not in (이름칸.get_attribute('class') or ''))
        카드.locator('.field', has_text='전화번호').locator('input').fill('010-3333-4444')
        주 = 카드.locator('.field', has_text='주소').locator('textarea'); 주.click(); 한글(쪽, cdp, '서울시');
        쪽.wait_for_timeout(200)
        쪽.screenshot(path=str(샷 / '폰-11-올리기판-채움.png'), full_page=True)
        올.click(); 쪽.wait_for_timeout(400)
        주문 = json.loads(쪽.evaluate('JSON.stringify(ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id==="sm_t3"))'))
        오늘 = 쪽.evaluate('ZG.ui.오늘문자()'); 앞 = 오늘[2:4] + 오늘[5:7] + 오늘[8:10]
        print('    올린 주문 줄:', json.dumps(주문, ensure_ascii=False))
        o = 주문[0] if 주문 else {}
        본다('주문번호 = 오늘 최댓값+1 (05→06)', o.get('주문번호') == 앞 + '-06', o.get('주문번호'))
        본다('판매처 문자 · 출처 수동', o.get('판매처') == '문자' and o.get('출처') == '수동')
        본다('품목코드·단가 그대로(3,800, 1.7배로 안 덮임)', o.get('품목코드') == 'CAR01-10' and o.get('단가') == 3800 and o.get('주문수량') == 2, (o.get('품목코드'), o.get('단가')))
        본다('수령인·전화·주소', o.get('수령인') == '최화단' and o.get('수령인전화') == '010-3333-4444' and o.get('수령인주소') == '서울시')
        본다('주문일 = 오늘', o.get('주문일') == 오늘)
        r = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.하나("sm_t3"))'))
        본다('문자주문 줄 올림 기록(번호·일시·이름)', r['상태'] == '올림' and r['올린주문번호'] == 앞 + '-06' and r.get('올린일시') and r['받는분'] == '최화단')
        # 같은 날 두 번째
        카드 = 쪽.locator('.문카드', has_text='김정원님'); 카드.locator('.act button', has_text='주문올리기').click(); 쪽.wait_for_timeout(300)
        카드 = 쪽.locator('.문카드.올리는중'); 카드.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
        r1 = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.하나("sm_t1"))'))
        본다('같은 날 두 번째 → -07 (안 겹침)', r1.get('올린주문번호') == 앞 + '-07', r1.get('올린주문번호'))
        쪽.screenshot(path=str(샷 / '폰-12-올린뒤.png'), full_page=True)
        # 잠금
        잠 = 쪽.evaluate("""() => { const z = ZG.문자주문자료; return { 고침: z.고치기('sm_t1', {받는분:'x', 품목:[]}), 지움: z.지우기('sm_t1'), 보냄: z.보냄표시('sm_t1'), 재: z.주문올리기('sm_t1', {받는분:'x'}) }; }""")
        본다('올림 줄 잠금(고치기·지우기·보냄·재올리기 거부)', 잠['고침'] is None and 잠['지움'] is False and 잠['보냄'] is None and '오류' in 잠['재'], 잠)
        카드 = 쪽.locator('.문카드', has_text='김정원님')
        본다('올림 카드: 단추·펼침 없음', 카드.locator('.act').count() == 0 and 카드.locator('.st.done').count() == 1)
        카드.locator('.r1').click(); 쪽.wait_for_timeout(200)
        본다('올림 카드 눌러도 안 펼침', 쪽.locator('.문카드', has_text='김정원님').locator('.속').count() == 0)
        # 두 번 올리기 막기 — 주문 줄이 이미 있는 상태에서 다시 (중간 끊김 흉내)
        쪽.evaluate("""() => { const 저=ZG.저장소; 저.바꾸기(저.키.문자주문, 'sm_t5', {받는분:'끊김'}); const r = ZG.문자주문자료.하나('sm_t5'); }""")
        n0 = 쪽.evaluate('ZG.저장소.읽기(ZG.저장소.키.주문).length')
        a = 쪽.evaluate("ZG.문자주문자료.주문올리기('sm_t5', {받는분:'끊김', 전화:'', 주소:''})")
        쪽.evaluate("ZG.저장소.바꾸기(ZG.저장소.키.문자주문, 'sm_t5', {상태:'저장'})")
        b2 = 쪽.evaluate("ZG.문자주문자료.주문올리기('sm_t5', {받는분:'끊김', 전화:'', 주소:''})")
        n1 = 쪽.evaluate('ZG.저장소.읽기(ZG.저장소.키.주문).length')
        본다('끊긴 뒤 다시 올려도 주문 줄 1벌·번호 같음', n1 - n0 == 1 and a.get('번호') == b2.get('번호'), (a, b2, n1 - n0))
        # 이름 없이 자료층 주문올리기 거부
        e = 쪽.evaluate("(() => { const r = ZG.문자주문자료.새로저장({받는분:'', 전화:'', 메모:'', 품목:[{품목코드:'CAR01-10',유통명:'청사초',수량:1,단가:3800}], 배송비:4500}, false); return ZG.문자주문자료.주문올리기(r.id, {받는분:'  '}); })()")
        본다('자료층: 이름 빈칸이면 올리기 거부', '오류' in e, e)
        본다('재고 자료(입고·출고·재고조정·품목) 안 바뀜', 재고표(쪽) == 재고전)
        본다('폰 콘솔 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:5])
        # 견적 탭 — 주문올리기 단추 0
        쪽.locator('[role=tab]', has_text='견적 요청').first.click(); 쪽.wait_for_timeout(400)
        if 쪽.locator('.ph-card').count():
            쪽.locator('.ph-card').first.click(); 쪽.wait_for_timeout(400)
        본다('폰 견적 탭(상세 포함)에 「주문올리기」 없음', 쪽.locator('button', has_text='주문올리기').count() == 0)
        쪽.screenshot(path=str(샷 / '폰-13-견적상세.png'), full_page=True)
        # 탭 왕복 — 주문조회에 .문자주문 클래스 안 남나
        쪽.locator('[role=tab]', has_text='주문 조회').first.click() if 쪽.locator('[role=tab]', has_text='주문 조회').count() else None
        쪽.wait_for_timeout(300)
        본다('주문 조회로 가면 .문자주문 클래스 안 남음', 쪽.locator('.문자주문').count() == 0, 쪽.locator('.문자주문').count())
        ctx.close()

        # ════════ PC ════════
        print('\n[PC 1440]')
        ctx, 쪽 = 새쪽(브, False)
        cdp = ctx.new_cdp_session(쪽)
        쪽.goto(밑 + '주문.html')
        쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.주문)', timeout=20000)
        쪽.wait_for_timeout(600)
        시드(쪽)
        쪽.evaluate('ZG.주문.다시그리기()')
        문자탭(쪽); 잡기(쪽)
        쪽.screenshot(path=str(샷 / 'PC-1-새문자-빈.png'))
        길 = 쪽.locator('.pc-head .path').inner_text() if 쪽.locator('.pc-head .path').count() else ''
        본다('PC 머리 길 「주문 관리 › 문자주문」', '문자주문' in 길, 길)
        검색 = 쪽.locator('.문자주문 input[type=search]'); 검색.click(); 한글(쪽, cdp, '휴케라'); 쪽.wait_for_timeout(400)
        본다('PC 검색 한글 조합', 검색.input_value() == '휴케라')
        쪽.screenshot(path=str(샷 / 'PC-2-검색후보.png'))
        검색.press('Enter'); 쪽.wait_for_timeout(200)
        검색.click(); 한글(쪽, cdp, '청사초'); 쪽.wait_for_timeout(400); 쪽.locator('.문자주문 .ac .it').first.click(); 쪽.wait_for_timeout(200)
        본다('엔터로 첫 후보 담기', len(json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문새문자.상태.담은것)'))) == 2)
        받 = 쪽.locator('.field', has_text='받는 분').locator('input'); 받.click(); 한글(쪽, cdp, '이정원'); 쪽.wait_for_timeout(300)
        쪽.locator('.field', has_text='전화번호').locator('input').fill('01012341234'); 쪽.wait_for_timeout(200)
        쪽.screenshot(path=str(샷 / 'PC-3-새문자-채움.png'))
        본다('PC 미리보기 이름 머리', 쪽.locator('.말풍선').inner_text().startswith('🌱 [제로가드닝]\n이정원 님 주문 안내'))
        배 = 쪽.locator('input[aria-label=배송비]'); 고쳐쓰기(쪽, 배, '')
        본다('PC 배송비 빈칸 → 문자에서 빠짐', '배송비' not in 쪽.locator('.말풍선').inner_text())
        받.click(); 받.press('End'); 한글(쪽, cdp, '님', 끝조합남김=True)
        쪽.locator('.보냄줄 button', has_text='문자').click(); 쪽.wait_for_timeout(400)
        r = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부()[0])'))
        본다('[경합] PC 이름 끝 글자 조합 중 「문자」 → 보낸 이름', r['받는분'] == '이정원님', repr(r['받는분']) + ' / 문자 첫머리: ' + 쪽.evaluate('window.__sms[0] && window.__sms[0].글.split("\\n")[1]'))
        새말 = 쪽.locator('.말풍선').inner_text().split('\n')[1]
        본다('[경합] 보낸 뒤 빈 새 문자 미리보기에 앞사람 이름 안 남음', 새말 == '주문 내역 안내', 새말 + ' / 받는분칸=' + repr(쪽.locator('.field', has_text='받는 분').locator('input').input_value()))
        본다('PC 문자 → 저장(배송비 빈칸=0 저장)', r['배송비'] == 0 and r['상태'] == '보냄', r['배송비'])
        본다('PC 문자 링크', len(쪽.evaluate('window.__sms')) == 1)
        쪽.locator('button', has_text='문자주문 목록').click(); 쪽.wait_for_timeout(500)
        쪽.screenshot(path=str(샷 / 'PC-4-목록.png'))
        밑글 = 쪽.locator('tbody tr', has_text='이정원').inner_text()
        본다('PC 배송비 0 줄 「배송비 없음」', '배송비 없음' in 밑글)
        쪽.locator('tbody tr', has_text='김정원').first.click(); 쪽.wait_for_timeout(300)
        쪽.screenshot(path=str(샷 / 'PC-5-펼침.png'))
        본다('PC 펼침 속판·삭제 단추', 쪽.locator('.속판').count() == 1 and 쪽.locator('.속판 button', has_text='삭제').count() == 1)
        b = 쪽.locator('.속판 .field', has_text='메모').locator('input'); b.click(); 한글(쪽, cdp, '문앞'); 쪽.wait_for_timeout(300)
        본다('PC 펼침 메모 한글 조합', b.input_value() == '문앞', b.input_value())
        b.click(); b.press('End'); 한글(쪽, cdp, '두고', 끝조합남김=True)
        쪽.locator('.속판 button', has_text='저장').click(); 쪽.wait_for_timeout(400)
        본다('[경합] PC 펼침 메모 조합 중 바로 「저장」', 쪽.evaluate('ZG.문자주문자료.하나("sm_t1").메모') == '문앞두고', repr(쪽.evaluate('ZG.문자주문자료.하나("sm_t1").메모')))
        쪽.locator('tbody tr', has_text='김정원').first.click(); 쪽.wait_for_timeout(300)
        쪽.locator('.속판 button', has_text='주문올리기').click(); 쪽.wait_for_timeout(300)
        쪽.screenshot(path=str(샷 / 'PC-6-올리기판.png'))
        본다('PC 펼침 「주문올리기」 → 고친 것 저장 후 올리기 판', 쪽.locator('.올림판').count() == 1 and 쪽.evaluate('ZG.문자주문자료.하나("sm_t1").메모').startswith('문앞'))
        쪽.locator('.올림판 button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
        쪽.screenshot(path=str(샷 / 'PC-7-올린뒤.png'))
        본다('PC 올림 줄 번호 표시', 쪽.locator('tbody tr', has_text='김정원').locator('.번호').count() == 1)
        # 이름 빈 올리기 판
        쪽.locator('tbody tr', has_text='화단 손님').locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(300)
        본다('PC 올리기 판 이름 빈칸 → 잠김', 쪽.locator('.올림판 button', has_text='주문올리기').is_disabled() and 쪽.locator('.올림판 input.need').count() == 1)
        쪽.screenshot(path=str(샷 / 'PC-8-올리기판-빈이름.png'))
        쪽.locator('.올림판 button', has_text='닫기').click(); 쪽.wait_for_timeout(300)
        # 인쇄
        쪽.locator('button', has_text='출력').click(); 쪽.wait_for_timeout(200)
        쪽.emulate_media(media='print')
        쪽.screenshot(path=str(샷 / 'PC-9-인쇄.png'))
        본다('PC 출력 → print 불림·문서 생김', 쪽.evaluate('window.__printed') == 1 and 쪽.locator('.doc문자').count() == 1)
        doc = 쪽.locator('.doc문자').inner_text() if 쪽.locator('.doc문자').count() else ''
        본다('인쇄 문서 제목·계좌', '문자주문 내역' in doc and '입금계좌' in doc)
        쪽.emulate_media(media='screen')
        쪽.wait_for_timeout(1700)
        본다('인쇄 뒤 문서 걷힘', 쪽.locator('.doc문자').count() == 0)
        # 검색 한글
        찾 = 쪽.locator('.문자주문 input.찾기'); 찾.click(); 한글(쪽, cdp, '박지난'); 쪽.wait_for_timeout(400)
        본다('PC 목록 검색 한글 조합', 쪽.locator('.문자주문 input.찾기').input_value() == '박지난')
        쪽.screenshot(path=str(샷 / 'PC-10-검색.png'))
        본다('PC 콘솔 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:5])
        # 견적 PC
        쪽.locator('[role=tab]', has_text='견적 요청').first.click(); 쪽.wait_for_timeout(400)
        본다('PC 견적 탭 「주문올리기」 없음', 쪽.locator('button', has_text='주문올리기').count() == 0)
        쪽.screenshot(path=str(샷 / 'PC-11-견적.png'))
        쪽.locator('[role=tab]', has_text='고객').first.click(); 쪽.wait_for_timeout(400)
        쪽.screenshot(path=str(샷 / 'PC-12-고객.png'))
        본다('PC 고객 탭 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:5])
        ctx.close()

        # ════════ 계좌 없을 때 ════════
        print('\n[자사 계좌 없음]')
        ctx, 쪽 = 새쪽(브, True)
        쪽.goto(밑 + '주문.html'); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문)', timeout=20000); 쪽.wait_for_timeout(500)
        글 = 쪽.evaluate("ZG.문자주문자료.문자내용({받는분:'', 품목:[{유통명:'청사초', 규격:'10cm', 수량:1, 단가:3800}], 배송비:4500})")
        print('    ' + 글.replace('\n', ' / '))
        본다('자사 없음 → 💰 줄 통째로 빠짐, 에러 없음', '💰' not in 글 and '입금계좌' not in 글)
        ctx.close()

        # ════════ 다른 페이지들 ════════
        print('\n[다른 페이지]')
        for 폰 in (True, False):
            for 이름 in ('index.html', '업체.html', '메모.html', '소싱.html', '지시.html', '주문.html'):
                ctx, 쪽 = 새쪽(브, 폰)
                쪽.goto(밑 + 이름); 쪽.wait_for_timeout(2500)
                tag = ('폰' if 폰 else 'PC') + '-p-' + 이름.replace('.html', '')
                쪽.screenshot(path=str(샷 / (tag + '.png')))
                본다(tag + ' 콘솔 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:3])
                if 이름 == 'index.html':
                    # 재고·입고 탭
                    for 탭 in ('입고', '재고'):
                        loc = 쪽.locator('button, a', has_text=탭)
                        if loc.count():
                            try:
                                loc.first.click(timeout=2000); 쪽.wait_for_timeout(800)
                                쪽.screenshot(path=str(샷 / (tag + '-' + 탭 + '.png')))
                            except Exception as ex: print('    (탭 못 누름)', 탭, ex)
                    본다(tag + ' 재고·입고 눌러도 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:3])
                ctx.close()
    finally:
        브.close()
        서버.terminate()

나쁨 = [x for x in 결과 if not x[0]]
print('\n합계 %d / 실패 %d' % (len(결과), len(나쁨)))
for x in 나쁨: print('  XX', x[1], x[2])
