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

# ════════ 발송완료 문자 (16단계-2 §7) — 다른 날짜(2026-08-20)에 심어 앞 단언들의 그날 숫자를 안 바꾼다 ════════
발송날 = '2026-08-20'
A글 = "🌱 [제로가드닝]\n김정원 님 주문하신 상품을 보냈습니다\n\n· 휴케라 '팰리스퍼플' 15cm 포트 3개\n· 청사초 10cm 포트 2개\n\n로젠택배 12345678901"
무명글 = "🌱 [제로가드닝]\n주문하신 상품을 보냈습니다\n\n· 휴케라 '팰리스퍼플' 15cm 포트 3개\n\n로젠택배 12345678923"
B글 = ("🌱 [제로가드닝]\n최다온 님 주문하신 상품을 보냈습니다\n\n· 휴케라 '팰리스퍼플' 15cm 포트 6개\n· 청사초 10cm 포트 4개\n· 용담 보라 10cm 포트 4개"
       "\n\n로젠택배 12345678901\n로젠택배 12345678912")
비움글 = "🌱 [제로가드닝]\n주문하신 상품을 보냈습니다\n\n· 휴케라 '팰리스퍼플' 15cm 포트 3개"
G글 = "🌱 [제로가드닝]\n일부만 님 주문하신 상품을 보냈습니다\n\n· 털수염풀 10cm 포트 1개\n\n로젠택배 12345678945"

def 발송시드(쪽):
    쪽.evaluate("""(날) => {
      const 저 = ZG.저장소, k = 저.키, 지금 = Date.now(), 앞 = '260820';
      const P = (c, n, 규, q) => ({품목코드: c, 유통명: n, 학명: '', 규격: 규, 수량: q, 단가: 1000});
      const 휴 = q => P('HEP01-15', "휴케라 '팰리스퍼플'", '15cm 포트', q), 청 = q => P('CAR01-10', '청사초', '10cm 포트', q);
      const 용 = q => P('GEN01-10', '용담 보라', '10cm 포트', q), 털 = q => P('FES01-10', '털수염풀', '10cm 포트', q);
      [['sm_A','김정원','01023456789',[휴(3),청(2)],'01'], ['sm_B','최다온','01081002309',[휴(6),청(4),용(4)],'02'],
       ['sm_C','','01077204411',[휴(3)],'03'], ['sm_D','이아직','01011112222',[청(1)],'04'],
       ['sm_E','합포일','01033334444',[청(1)],'05'], ['sm_F','합포이','01055556666',[청(1)],'06'],
       ['sm_G','일부만','01077778888',[청(2),털(1)],'07'], ['sm_H','로젠건','01099990000',[청(1)],'08']
      ].forEach(([id, 이름, 전화, 품목, n], i) => 저.덧붙이기(k.문자주문, {id, 날짜: 날, 받는분: 이름, 전화, 메모: '', 주소: '서울시 어딘가',
        품목, 배송비: 4500, 상태: '올림', 올린주문번호: 앞 + '-' + n, 올린일시: 지금, 등록일시: 지금 - (i + 1) * 60000, 수정일시: 지금}));
      const 줄 = (id, smid, n, p, 판) => 저.덧붙이기(k.주문, Object.assign({id, 주문번호: 앞 + '-' + n, 주문일: 날, 판매처: 판 || '문자', 출처: '수동',
        품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격, 주문수량: p.수량, 옵션입수: 1, 단가: 1000, 수령인: 'x', 등록일시: 지금}, smid ? {문자주문id: smid} : {}));
      let t = 지금 - 100000;
      const 출 = (oid, p, 송, 덧) => 저.덧붙이기(k.출고, Object.assign({id: 'sh_t_' + oid, 출고일: 날, 품목코드: p.품목코드, 수량: p.수량,
        출처: '주문', 주문id: oid, 등록일시: t++}, 송 ? {운송장번호: 송} : {}, 덧 || {}));
      줄('o_A1','sm_A','01',휴(3)); 줄('o_A2','sm_A','01',청(2)); 출('o_A1',휴(3),'12345678901'); 출('o_A2',청(2),'12345678901');
      줄('o_B1','sm_B','02',휴(6)); 줄('o_B2','sm_B','02',청(4)); 줄('o_B3','sm_B','02',용(4));
      출('o_B1',휴(6),'12345678901'); 출('o_B2',청(4),'12345678901'); 출('o_B3',용(4),'12345678901');
      저.바꾸기(k.문자주문, 'sm_B', {손송장: ['12345678901', '12345678912']});
      줄('o_C1','sm_C','03',휴(3)); 출('o_C1',휴(3),'',{수동: true});
      // D — 같은 번호의 남의 주문(전화주문)이 나가도 D는 그대로
      줄('o_D1','sm_D','04',청(1)); 줄('o_X1',null,'04',청(1),'전화주문'); 출('o_X1',청(1),'99999999999');
      줄('o_E1','sm_E','05',청(1)); 출('o_E1',청(1),'12345678934'); 줄('o_F1','sm_F','06',청(1)); 출('o_F1',청(1),'12345678934');
      // G — 둘 중 하나(주문탭에서 나중에 더한 줄, 문자주문id 없음)만 나감
      줄('o_G1','sm_G','07',청(2)); 줄('o_G2',null,'07',털(1)); 출('o_G2',털(1),'12345678945');
      줄('o_H1','sm_H','08',청(1));
    }""", 발송날)

def 발송시험(브, 폰):
    tag = '폰' if 폰 else 'PC'
    print('\n[발송완료 %s]' % tag)
    ctx, 쪽 = 새쪽(브, 폰)
    쪽.goto(밑 + '주문.html')
    쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.주문)', timeout=20000)
    쪽.wait_for_timeout(600)
    시드(쪽); 발송시드(쪽)
    쪽.evaluate('ZG.주문.다시그리기()')
    문자탭(쪽); 잡기(쪽)
    def 그날로():
        쪽.evaluate("(날) => { ZG.문자주문.목록으로(); const s = ZG.문자주문.상태; s.날짜 = 날; s.달 = 날.slice(0, 7); ZG.주문.다시그리기(); }", 발송날)
        쪽.wait_for_timeout(500)
    def 다시그림():
        쪽.evaluate('ZG.주문.다시그리기()'); 쪽.wait_for_timeout(300)
    그날로()
    줄 = (lambda 이름: 쪽.locator('.문카드', has_text=이름)) if 폰 else (lambda 이름: 쪽.locator('.문자주문 tbody tr', has_text=이름))
    번들 = lambda 이름: 줄(이름).locator('.송장 .번').all_inner_texts()
    하나 = lambda id: json.loads(쪽.evaluate('(id) => JSON.stringify(ZG.문자주문자료.하나(id))', id))
    글 = lambda id: 쪽.evaluate('(id) => ZG.문자주문자료.발송문자내용(ZG.문자주문자료.하나(id))', id)
    C = '010-7720-4411'
    재고전 = 재고표(쪽)
    쪽.screenshot(path=str(샷 / ('%s-발송-1-목록.png' % tag)), full_page=True)

    A = 줄('김정원')
    본다(tag + ' A: 칩 발송완료 · 송장 한 줄 · 「🚚 발송완료 문자」', A.locator('.st.ship').count() == 1 and 번들('김정원') == ['12345678901']
         and A.locator('button', has_text='🚚 발송완료 문자').count() == 1, 번들('김정원'))
    본다(tag + ' B: 손송장 둘 → 송장 두 줄', 번들('최다온') == ['12345678901', '12345678912'], 번들('최다온'))
    본다(tag + ' C 손처리: 「송장 없음」+입력칸', 줄(C).locator('.st.ship').count() == 1 and 줄(C).locator('.송장 .없음').count() == 1
         and 줄(C).locator('.송장 input').count() == 1)
    D = 줄('이아직')
    본다(tag + ' D 아직(같은 번호 남의 주문이 나가도): 주문올림 그대로', D.locator('.st.done').count() == 1 and D.locator('.st.ship').count() == 0
         and D.locator('.송장').count() == 0 and (D.locator('.act').count() == 0 and '260820-04' in D.locator('.st.done').inner_text() if 폰 else D.locator('.번호').count() == 1))
    본다(tag + ' 합포장 두 카드 같은 송장', 번들('합포일') == ['12345678934'] and 번들('합포이') == ['12345678934'], (번들('합포일'), 번들('합포이')))
    본다(tag + ' 일부만 나감 → 발송완료 · 문자 품목 1줄', 줄('일부만').locator('.st.ship').count() == 1 and 글('sm_G') == G글, 글('sm_G'))
    if 폰:
        본다('폰 발송완료 카드는 받는곳(주소) 안 붙음', A.locator('.받는곳').count() == 0 and D.locator('.받는곳').count() == 1)
        요 = 쪽.locator('.ph-sub').inner_text().replace('\n', ' ')
        본다('폰 요약줄 「올림 2 · 발송완료 6」 (0인 것은 빠짐)', '올림 2 · 발송완료 6' in 요 and '저장' not in 요 and '보냄' not in 요, 요)
    else:
        본다('PC 발송완료 줄 품목칸 밑은 주소 대신 배송비', '배송비 4,500' in A.inner_text() and '서울시' not in A.inner_text() and '서울시' in D.inner_text())
        본다('PC 상태칸 class·colgroup 168px', A.locator('td.상태칸').count() == 1 and
             쪽.locator('.문자주문 colgroup col').last.get_attribute('style') == 'width:168px')
        요 = 쪽.evaluate('ZG.문자주문.요약().오')
        본다('PC 요약 「올림 2 · 발송완료 6」', 요 == '올림 <b>2</b> · 발송완료 <b>6</b>', 요)
    본다(tag + ' 검색 자리글에 송장', '· 송장' in (쪽.locator('.문자주문 input.찾기').get_attribute('placeholder') or ''))
    본다(tag + ' 문자 글: 기본(A)', 글('sm_A') == A글, 글('sm_A'))
    본다(tag + ' 문자 글: 송장 둘(B)', 글('sm_B') == B글, 글('sm_B'))
    본다(tag + ' 문자 글: 송장 비움(C) — 송장 줄과 앞 빈 줄 없음', 글('sm_C') == 비움글, 글('sm_C'))

    # 검색 — 송장 숫자로
    찾 = 쪽.locator('.문자주문 input.찾기'); 찾.click(); 찾.fill('901'); 쪽.wait_for_timeout(400)
    이름들 = 쪽.locator('.문카드 .r1 .nm').all_inner_texts() if 폰 else [t.split('\n')[0] for t in 쪽.locator('.문자주문 tbody tr td:nth-child(3)').all_inner_texts()]
    본다(tag + ' 검색 901 → A·B만', sorted(이름들) == ['김정원', '최다온'], 이름들)
    찾 = 쪽.locator('.문자주문 input.찾기'); 찾.click(); 찾.fill(''); 쪽.wait_for_timeout(400)

    # 치던 중 다시 그려도 값이 남는다
    칸 = 줄(C).locator('.송장 input').first
    칸.click(); 쪽.keyboard.type('123', delay=20)
    다시그림()
    칸 = 줄(C).locator('.송장 input').first
    본다(tag + ' 송장 치던 중 다시그리기 → 값 남음', 칸.input_value() == '123', 칸.input_value())
    칸.click(); 칸.press('End'); 쪽.keyboard.type('45678923', delay=10); 칸.press('Enter'); 쪽.wait_for_timeout(300)
    본다(tag + ' C 송장 넣고 Enter → 손송장·카드 송장', 하나('sm_C').get('손송장') == ['12345678923'] and 번들(C) == ['12345678923'], 하나('sm_C').get('손송장'))
    본다(tag + ' 문자 글: 받는 분 없음(C)', 글('sm_C') == 무명글, 글('sm_C'))

    # 손송장 — A
    def 바깥():
        줄('김정원').locator('.tm').click(); 쪽.wait_for_timeout(300)
    줄('김정원').locator('.송장').click(); 쪽.wait_for_timeout(300)
    칸들 = 줄('김정원').locator('.송장 input')
    본다(tag + ' 송장 상자 누르면 고치는 칸(값+빈칸)', 칸들.count() == 2 and 칸들.nth(0).input_value() == '12345678901', 칸들.count())
    쪽.screenshot(path=str(샷 / ('%s-발송-2-송장고침.png' % tag)), full_page=True)
    칸들.nth(1).click(); 쪽.keyboard.type('12345678912', delay=10); 바깥()
    본다(tag + ' 빈칸에 더하고 바깥 → 손송장 둘', 하나('sm_A').get('손송장') == ['12345678901', '12345678912'] and 번들('김정원') == ['12345678901', '12345678912'], 하나('sm_A').get('손송장'))
    줄('김정원').locator('.송장').click(); 쪽.wait_for_timeout(300)
    칸 = 줄('김정원').locator('.송장 input').nth(1); 칸.click(); 칸.fill(''); 바깥()
    a = 하나('sm_A')
    본다(tag + ' 더한 것 지우면 자동과 같아져 손송장 null', '손송장' in a and a['손송장'] is None and 번들('김정원') == ['12345678901'], a.get('손송장'))
    줄('김정원').locator('.송장').click(); 쪽.wait_for_timeout(300)
    칸 = 줄('김정원').locator('.송장 input').nth(0); 칸.click(); 칸.fill(''); 바깥()
    본다(tag + ' 전부 지우면 손송장 [] · 「송장 없음」', 하나('sm_A').get('손송장') == [] and 줄('김정원').locator('.송장 .없음').count() == 1, 하나('sm_A').get('손송장'))
    쪽.evaluate("ZG.문자주문자료.손송장저장('sm_A', ['12345678901'])"); 다시그림()

    # 발송완료 문자 · 다시 보내기
    n = len(쪽.evaluate('window.__sms'))
    줄('김정원').locator('button', has_text='🚚 발송완료 문자').click(); 쪽.wait_for_timeout(400)
    sms = 쪽.evaluate('window.__sms'); a = 하나('sm_A')
    본다(tag + ' 「발송완료 문자」 → 그 글·그 전화로', len(sms) == n + 1 and sms[-1]['글'] == A글 and sms[-1]['전화'] == '01023456789', sms[-1]['글'] if sms else '')
    본다(tag + ' 발송문자보냄일시 생김 · 상태는 올림 그대로', bool(a.get('발송문자보냄일시')) and a['상태'] == '올림', a.get('상태'))
    A = 줄('김정원')
    본다(tag + ' 보낸표 「발송문자 보냄」 · 「다시 보내기」', '발송문자 보냄' in A.locator('.보낸표').inner_text() and A.locator('button', has_text='다시 보내기').count() == 1
         and A.locator('button', has_text='🚚 발송완료 문자').count() == 0)
    첫 = a['발송문자보냄일시']; 쪽.wait_for_timeout(30)
    A.locator('button', has_text='다시 보내기').click(); 쪽.wait_for_timeout(400)
    본다(tag + ' 다시 보내기 → 일시 갱신·문자 또 나감', 하나('sm_A')['발송문자보냄일시'] > 첫 and len(쪽.evaluate('window.__sms')) == n + 2)
    본다(tag + ' 전화 없으면 발송 단추 잠김(자료층 문자되나 규칙)', 쪽.evaluate("!ZG.문자주문자료.문자되나('')"))
    쪽.screenshot(path=str(샷 / ('%s-발송-3-보낸뒤.png' % tag)), full_page=True)
    본다(tag + ' 재고 자료 전후 같음(발송문자는 재고 안 건드림)', 재고표(쪽) == 재고전)

    if not 폰:
        # 08g — 로젠 처리 뒤 출고에 운송장번호가 실린다
        쪽.evaluate("""() => {
          window.XLSX = window.XLSX || {};
          const 머리 = Array(19).fill(''), 행 = Array(19).fill('');
          머리[3] = '운송장번호'; 머리[18] = '주문번호';
          행[3] = '55555555555'; 행[6] = '로젠건'; 행[11] = '1'; 행[18] = '260820-08';
          ZG.주문파일.시트배열 = (f, cb) => cb({ ok: true, 행들: [머리, 행] });
          ZG.배송완료창.열기();
          const dt = new DataTransfer(); dt.items.add(new File(['x'], '로젠.xlsx'));
          document.querySelector('.drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
        }""")
        쪽.wait_for_timeout(300)
        쪽.locator('button', has_text='배송완료 처리').last.click(); 쪽.wait_for_timeout(500)
        출 = 쪽.evaluate("ZG.저장소.읽기(ZG.저장소.키.출고).filter(s => s.주문id === 'o_H1').map(s => s.운송장번호)")
        본다('08g 로젠 처리 → 출고에 운송장번호', 출 == ['55555555555'], 출)
        쪽.evaluate('ZG.배송완료창.닫기()'); 그날로()
        본다('08g 처리한 문자주문 카드에 자동 송장', 줄('로젠건').locator('.st.ship').count() == 1 and 번들('로젠건') == ['55555555555'], 번들('로젠건'))

    # 되돌리기 — 출고가 지워지면 주문올림으로
    쪽.evaluate("() => { const 저 = ZG.저장소; 저.지우기(저.키.출고, 'sh_t_o_A1'); 저.지우기(저.키.출고, 'sh_t_o_A2'); }"); 다시그림()
    A = 줄('김정원')
    본다(tag + ' 출고 지우면 주문올림으로 돌아옴', A.locator('.st.done').count() == 1 and A.locator('.st.ship').count() == 0 and A.locator('.송장').count() == 0)
    잠 = 쪽.evaluate("() => { const z = ZG.문자주문자료; return [z.발송문자표시('sm_t1'), z.손송장저장('sm_t1', ['1'])]; }")
    본다(tag + ' 올림 아닌 줄엔 발송문자표시·손송장저장 거부', 잠 == [None, None], 잠)
    본다(tag + ' 발송완료 콘솔 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:5])
    ctx.close()

# ════════ 주소·우편 (10/7) — 따로 연 창에서 해 앞 단언 숫자를 안 바꾼다 ════════
못불러옴 = '주소 찾기를 못 불러왔습니다'
def 주소시험(브, 폰):
    tag = '폰' if 폰 else 'PC'
    print('\n[%s 주소·우편]' % tag)
    ctx, 쪽 = 새쪽(브, 폰)
    cdp = ctx.new_cdp_session(쪽)
    쪽.goto(밑 + '주문.html')
    쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.주문)', timeout=20000); 쪽.wait_for_timeout(600)
    시드(쪽); 쪽.evaluate('ZG.주문.다시그리기()'); 문자탭(쪽); 잡기(쪽)
    쪽.evaluate("() => { window.__토스트 = []; const 원 = ZG.ui.토스트; ZG.ui.토스트 = function (글) { window.__토스트.push(글); return 원.apply(this, arguments); }; }")
    def 토스트수(): return 쪽.evaluate('(글) => window.__토스트.filter(t => t.indexOf(글) === 0).length', 못불러옴)
    def 찾기눌러(범위, 이름):
        n = 토스트수()
        범위.locator('button', has_text='주소 찾기').click(); 쪽.wait_for_timeout(800)
        본다(tag + ' ' + 이름 + ' 「주소 찾기」 → 바깥 막힘 토스트로 끝남', 토스트수() > n and 쪽.locator('.pcscrim').count() == 0, 토스트수())
    def 하나(i): return json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.하나(%s))' % json.dumps(i)))

    쪽.evaluate("""() => { const 부 = ZG.문자주문새문자, z = ZG.문자주문자료;
      부.상태.담은것.push(z.담을줄(ZG.저장소.품목들().find(p => p.품목코드 === 'CAR01-10'))); ZG.주문.다시그리기(); }""")
    판 = 쪽.locator('.문자주문')
    본다(tag + ' 새 문자에 주소칸·우편칸·「주소 찾기」', 판.locator('button', has_text='주소 찾기').count() == 1
         and 판.locator('input[placeholder=주소]').count() == 1 and 판.locator('input[placeholder=우편번호]').count() == 1)
    찾기눌러(판, '새 문자')
    받 = 판.locator('.field', has_text='받는 분').locator('input'); 받.click(); 한글(쪽, cdp, '주소손님'); 쪽.wait_for_timeout(200)
    판.locator('.field', has_text='전화번호').locator('input').fill('01077778888')
    주 = 판.locator('input[placeholder=주소]'); 주.click(); 한글(쪽, cdp, '서울시'); 쪽.wait_for_timeout(300)
    본다(tag + ' 새 문자 주소칸 한글 조합', 주.input_value() == '서울시', 주.input_value())
    # 주소 찾기가 하는 그대로 — 값만 넣고 주소칸에 focus (input 안 쏨)
    쪽.evaluate("""() => { const 주 = document.querySelector('.문자주문 input[placeholder="주소"]'), 우 = document.querySelector('.문자주문 input[placeholder="우편번호"]');
      주.blur(); 우.value = '04001'; 주.value = '서울 마포구 월드컵로 1 '; 주.focus(); 주.setSelectionRange(주.value.length, 주.value.length); }""")
    쪽.keyboard.type('101', delay=20); 쪽.wait_for_timeout(300)
    판.locator('.보냄줄 button', has_text='저장').click()
    쪽.wait_for_timeout(400)
    r = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부().find(r => r.받는분 === "주소손님") || {})'))
    본다(tag + ' 새 문자 저장 → 주소·우편 저장', r.get('주소') == '서울 마포구 월드컵로 1 101' and r.get('우편') == '04001', (r.get('주소'), r.get('우편')))
    본다(tag + ' 문자 본문에 주소 없음', '마포구' not in 쪽.evaluate('(id) => ZG.문자주문자료.문자내용(ZG.문자주문자료.하나(id))', r.get('id')))
    본다(tag + ' 저장 뒤 새 문자 주소·우편 비워짐', 판.locator('input[placeholder=주소]').input_value() == '' and 판.locator('input[placeholder=우편번호]').input_value() == '')
    sid = r.get('id')

    판.locator('button', has_text='문자주문 목록').click(); 쪽.wait_for_timeout(500)
    def 펼치기():
        if 폰: 쪽.locator('.문카드', has_text='주소손님').locator('.r1').click()
        else: 쪽.locator('tbody tr', has_text='주소손님').first.click()
        쪽.wait_for_timeout(300)
        return 쪽.locator('.문카드', has_text='주소손님').locator('.속') if 폰 else 쪽.locator('.속판')
    속 = 펼치기()
    쪽.screenshot(path=str(샷 / ('%s-주소-1-펼침.png' % tag)), full_page=폰)
    본다(tag + ' 펼침에 주소·우편 그대로', 속.locator('input[placeholder=주소]').input_value() == '서울 마포구 월드컵로 1 101'
         and 속.locator('input[placeholder=우편번호]').input_value() == '04001')
    찾기눌러(속, '펼침')
    고쳐쓰기(쪽, 속.locator('input[placeholder=우편번호]'), '04002')
    속.locator('button', has_text='저장').click(); 쪽.wait_for_timeout(400)
    본다(tag + ' 펼침 고쳐 저장 → 우편 바뀜·주소 남음', 하나(sid).get('우편') == '04002' and 하나(sid).get('주소') == '서울 마포구 월드컵로 1 101', 하나(sid).get('우편'))

    속 = 펼치기()
    속.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
    올판 = 쪽.locator('.문카드.올리는중') if 폰 else 쪽.locator('.올림판')
    주칸 = 올판.locator('[placeholder=주소]')
    우칸 = 올판.locator('.field', has_text='우편번호').locator('input')
    쪽.screenshot(path=str(샷 / ('%s-주소-2-올리기판.png' % tag)), full_page=폰)
    본다(tag + ' 올리기 판에 주소·우편 채워짐 · 「주소 찾기」', 주칸.input_value() == '서울 마포구 월드컵로 1 101' and 우칸.input_value() == '04002'
         and 올판.locator('button', has_text='주소 찾기').count() == 1, (주칸.input_value(), 우칸.input_value()))
    찾기눌러(올판, '올리기 판')
    올판.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
    주문 = json.loads(쪽.evaluate('(id) => JSON.stringify(ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === id))', sid))
    o = 주문[0] if 주문 else {}
    본다(tag + ' 올린 주문 줄 수령인주소·우편번호', len(주문) == 1 and o.get('수령인주소') == '서울 마포구 월드컵로 1 101' and o.get('우편번호') == '04002', (o.get('수령인주소'), o.get('우편번호')))
    본다(tag + ' 문자주문 줄에도 올린 주소·우편', 하나(sid).get('상태') == '올림' and 하나(sid).get('우편') == '04002')
    본다(tag + ' 주소·우편 콘솔 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:5])
    ctx.close()

# ════════ 상세주소·배송메시지 (10/7) — 따로 연 창, 새 시드는 이 창에만 ════════
def 상세시험(브, 폰):
    tag = '폰' if 폰 else 'PC'
    print('\n[%s 상세주소·배송메시지]' % tag)
    ctx, 쪽 = 새쪽(브, 폰)
    cdp = ctx.new_cdp_session(쪽)
    쪽.goto(밑 + '주문.html')
    쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.주문)', timeout=20000); 쪽.wait_for_timeout(600)
    시드(쪽)
    쪽.evaluate("""() => { const 저 = ZG.저장소, 지금 = Date.now();
      저.덧붙이기(저.키.문자주문, {id:'sm_old2', 날짜: ZG.ui.오늘문자(), 받는분:'옛손님', 전화:'01022223333', 메모:'', 주소:'부산시 옛길 3', 우편:'48000',
        품목:[{품목코드:'CAR01-10', 유통명:'청사초', 학명:'', 규격:'10cm', 수량:1, 단가:3800}], 배송비:4500, 상태:'저장', 등록일시: 지금 - 30*60000, 수정일시: 지금 - 30*60000}); }""")
    쪽.evaluate('ZG.주문.다시그리기()'); 문자탭(쪽); 잡기(쪽)
    def 하나(i): return json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.하나(%s))' % json.dumps(i)))
    def 지금칸(): return 쪽.evaluate('document.activeElement && document.activeElement.placeholder || ""')
    def 찾기흉내(범위):
        # 08c 주소찾기가 하는 그대로 — 단추 누름(바깥 막혀 토스트) 뒤 값만 넣고 주소칸에 focus · 커서 끝
        범위.locator('button', has_text='주소 찾기').click(); 쪽.wait_for_timeout(600)
        쪽.evaluate("""() => { const 주 = document.querySelector('.문자주문 [placeholder="주소"]'), 우 = document.querySelector('.문자주문 [placeholder="우편번호"]');
          우.value = '04001'; 주.value = '서울 마포구 월드컵로 1 '; 주.focus(); 주.setSelectionRange(주.value.length, 주.value.length); }""")
        쪽.wait_for_timeout(150)
    def 글로(loc, 글):
        loc.click(); 쪽.wait_for_timeout(50)
        쪽.keyboard.press('ControlOrMeta+a'); 쪽.keyboard.press('Backspace'); 쪽.wait_for_timeout(50)
        한글(쪽, cdp, 글); 쪽.wait_for_timeout(250)

    쪽.evaluate("""() => { const 부 = ZG.문자주문새문자, z = ZG.문자주문자료;
      부.상태.담은것.push(z.담을줄(ZG.저장소.품목들().find(p => p.품목코드 === 'CAR01-10'))); ZG.주문.다시그리기(); }""")
    판 = 쪽.locator('.문자주문')
    본다(tag + ' 새 문자에 상세주소·배송메시지 칸', 판.locator('input[placeholder=상세주소]').count() == 1 and 판.locator('input[placeholder=배송메시지]').count() == 1)
    받 = 판.locator('.field', has_text='받는 분').locator('input'); 받.click(); 한글(쪽, cdp, '상세손님'); 쪽.wait_for_timeout(200)
    판.locator('.field', has_text='전화번호').locator('input').fill('01066667777')
    # 찾기 안 거치고 손으로 주소칸에 들어가면 그대로 머문다
    판.locator('input[placeholder=주소]').click(); 쪽.wait_for_timeout(150)
    본다(tag + ' 새 문자 손으로 누른 주소칸은 그대로', 지금칸() == '주소', 지금칸())
    찾기흉내(판)
    본다(tag + ' 새 문자 주소 찾은 뒤 상세주소 칸으로 넘어감', 지금칸() == '상세주소', 지금칸())
    쪽.keyboard.type('101', delay=20); 한글(쪽, cdp, '동'); 쪽.wait_for_timeout(250)
    본다(tag + ' 새 문자 상세주소 한글 조합', 판.locator('input[placeholder=상세주소]').input_value() == '101동', 판.locator('input[placeholder=상세주소]').input_value())
    글로(판.locator('input[placeholder=배송메시지]'), '문앞에 두세요')
    본다(tag + ' 새 문자 배송메시지 한글 조합', 판.locator('input[placeholder=배송메시지]').input_value() == '문앞에 두세요', 판.locator('input[placeholder=배송메시지]').input_value())
    쪽.screenshot(path=str(샷 / ('%s-상세-0-새문자.png' % tag)), full_page=폰)
    판.locator('.보냄줄 button', has_text='저장').click(); 쪽.wait_for_timeout(400)
    r = json.loads(쪽.evaluate('JSON.stringify(ZG.문자주문자료.전부().find(r => r.받는분 === "상세손님") || {})'))
    sid = r.get('id')
    본다(tag + ' 새 문자 저장 → 주소·상세주소·우편·배송메시지 따로', r.get('주소') == '서울 마포구 월드컵로 1' and r.get('상세주소') == '101동'
         and r.get('우편') == '04001' and r.get('배송메시지') == '문앞에 두세요', (r.get('주소'), r.get('상세주소'), r.get('우편'), r.get('배송메시지')))
    본문 = 쪽.evaluate('(id) => ZG.문자주문자료.문자내용(ZG.문자주문자료.하나(id))', sid)
    본다(tag + ' 문자 본문에 주소·상세주소·배송메시지 없음', '마포구' not in 본문 and '101동' not in 본문 and '문앞' not in 본문)
    본다(tag + ' 저장 뒤 상세주소·배송메시지 비워짐', 판.locator('input[placeholder=상세주소]').input_value() == '' and 판.locator('input[placeholder=배송메시지]').input_value() == '')

    판.locator('button', has_text='문자주문 목록').click(); 쪽.wait_for_timeout(500)
    def 펼치기(이름):
        if 폰: 쪽.locator('.문카드', has_text=이름).locator('.r1').click()
        else: 쪽.locator('tbody tr', has_text=이름).first.click()
        쪽.wait_for_timeout(300)
        return 쪽.locator('.문카드', has_text=이름).locator('.속') if 폰 else 쪽.locator('.속판')
    속 = 펼치기('상세손님')
    쪽.screenshot(path=str(샷 / ('%s-상세-1-펼침.png' % tag)), full_page=폰)
    본다(tag + ' 펼침에 상세주소·배송메시지 그대로', 속.locator('input[placeholder=주소]').input_value() == '서울 마포구 월드컵로 1'
         and 속.locator('input[placeholder=상세주소]').input_value() == '101동' and 속.locator('input[placeholder=배송메시지]').input_value() == '문앞에 두세요')
    글로(속.locator('input[placeholder=상세주소]'), '102동')
    속.locator('button', has_text='저장').click(); 쪽.wait_for_timeout(400)
    본다(tag + ' 펼침 고쳐 저장 → 상세주소만 바뀜', 하나(sid).get('상세주소') == '102동' and 하나(sid).get('주소') == '서울 마포구 월드컵로 1'
         and 하나(sid).get('배송메시지') == '문앞에 두세요', 하나(sid).get('상세주소'))

    속 = 펼치기('상세손님')
    속.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
    올판 = 쪽.locator('.문카드.올리는중') if 폰 else 쪽.locator('.올림판')
    쪽.screenshot(path=str(샷 / ('%s-상세-2-올리기판.png' % tag)), full_page=폰)
    본다(tag + ' 올리기 판에 주소·상세주소·배송메시지 채워짐', 올판.locator('[placeholder=주소]').input_value() == '서울 마포구 월드컵로 1'
         and 올판.locator('[placeholder=상세주소]').input_value() == '102동' and 올판.locator('[placeholder=배송메시지]').input_value() == '문앞에 두세요')
    올판.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
    주문 = json.loads(쪽.evaluate('(id) => JSON.stringify(ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === id))', sid))
    o = 주문[0] if 주문 else {}
    본다(tag + ' 올린 주문 줄 수령인주소 = 「주소 상세주소」·배송메모·우편번호', len(주문) == 1 and o.get('수령인주소') == '서울 마포구 월드컵로 1 102동'
         and o.get('배송메모') == '문앞에 두세요' and o.get('우편번호') == '04001', (o.get('수령인주소'), o.get('배송메모'), o.get('우편번호')))
    r = 하나(sid)
    본다(tag + ' 문자주문 줄에 상세주소·배송메시지 남음', r.get('상태') == '올림' and r.get('상세주소') == '102동' and r.get('배송메시지') == '문앞에 두세요')
    칸27 = 쪽.evaluate('(id) => { const o = ZG.저장소.읽기(ZG.저장소.키.주문).find(o => o.문자주문id === id); return ZG.주문올리기.세운27(o); }', sid)
    본다(tag + ' 로젠 27칸 주소(P)·비고(T)', 칸27 and 칸27[15] == '서울 마포구 월드컵로 1 102동' and 칸27[19] == '문앞에 두세요', 칸27 and (칸27[15], 칸27[19]))
    if 폰: 본다(tag + ' 올린 카드 받는곳 = 주소+상세', 쪽.locator('.문카드', has_text='상세손님').locator('.받는곳').inner_text() == '서울 마포구 월드컵로 1 102동')
    else: 본다(tag + ' 올린 줄 밑글 = 주소+상세', '서울 마포구 월드컵로 1 102동' in 쪽.locator('tbody tr', has_text='상세손님').first.inner_text())

    # 옛 줄 — 상세주소·배송메시지 없음
    속 = 펼치기('옛손님')
    본다(tag + ' 옛 줄 펼침 정상(상세·메시지 빈칸)', 속.locator('input[placeholder=주소]').input_value() == '부산시 옛길 3'
         and 속.locator('input[placeholder=상세주소]').input_value() == '' and 속.locator('input[placeholder=배송메시지]').input_value() == '')
    속.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
    올판 = 쪽.locator('.문카드.올리는중') if 폰 else 쪽.locator('.올림판')
    올판.locator('button', has_text='주문올리기').click(); 쪽.wait_for_timeout(400)
    주문 = json.loads(쪽.evaluate('JSON.stringify(ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === "sm_old2"))'))
    o = 주문[0] if 주문 else {}
    본다(tag + ' 옛 줄 올리기 → 수령인주소 그대로·배송메모 빈칸', len(주문) == 1 and o.get('수령인주소') == '부산시 옛길 3' and o.get('배송메모') == ''
         and o.get('우편번호') == '48000', (o.get('수령인주소'), o.get('배송메모')))
    쪽.screenshot(path=str(샷 / ('%s-상세-3-올린뒤.png' % tag)), full_page=폰)
    본다(tag + ' 상세주소·배송메시지 콘솔 에러 없음', not 쪽.__dict__['오류'], 쪽.__dict__['오류'][:5])
    ctx.close()

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
        본다('단위 「개」', '개X' in 글 and '주' not in 글.replace('주문', '').replace('주소', '').replace('보내주세요', ''), '')
        본다('배송비 4,500 줄', '배송비 4,500원' in 글)
        본다('합계 = 5,800×1+3,000×2+4,500 = 16,300', '합계: 16,300원' in 글)
        본다('입금계좌 들어감(다듬음)', '💰입금계좌\n농협 351-1390-7063-23\n김두용(제로가드닝)' in 글 and not 글.endswith(' '))
        본다('꼬리말 = 계좌 뒤 빈 줄 + 한 줄', 글.endswith('김두용(제로가드닝)\n\n📌 성함, 주소, 연락처를 보내주세요!'), 글[-60:])
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
        # 0인 것은 뺀다 (16단계-2 §5) — 이 날은 저장·보냄만 있고 올림은 아직 없다
        본다('목록 요약줄 저장·보냄 (0인 올림은 빠짐)', '저장' in 요약 and '보냄' in 요약 and '올림' not in 요약, 요약.replace('\n', ' '))
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
        주 = 카드.locator('textarea[placeholder=주소]'); 주.click(); 한글(쪽, cdp, '서울시');
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
        본다('자사 없음 → 꼬리말은 합계 뒤 빈 줄 + 한 줄', 글.endswith('합계: 8,300원\n\n📌 성함, 주소, 연락처를 보내주세요!'), 글[-60:])
        ctx.close()

        발송시험(브, True)
        발송시험(브, False)
        주소시험(브, True)
        주소시험(브, False)
        상세시험(브, True)
        상세시험(브, False)

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
