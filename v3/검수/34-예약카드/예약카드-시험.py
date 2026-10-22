# -*- coding: utf-8 -*-
# 예약 탭 카드 누르면 그 자리에서 주문 정보(전화·주소·품목·금액) 보기·고치기 · 저장 전 확인창 하나 (10/23 우람님)
#   python3 v3/검수/34-예약카드/예약카드-시험.py   ← 로컬 전용(supabase 막음 · 가짜 자료)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '34-예약카드'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''): 결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8833', '-d', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
주소 = 'http://localhost:8833/%EC%A3%BC%EB%AC%B8.html'
심기자료 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const 품 = Object.assign(자.담을줄(ps[10]), { 수량: 3, 단가: 12000 });
  const r = 자.새로저장({ 받는분: '시험가람', 전화: '01011110010', 주소: '서울시 가람로 1', 상세주소: '101호', 우편: '04524',
    메모: '현관 앞', 품목: [품], 배송비: 3000 }, true);
  저.바꾸기(저.키.문자주문, r.id, { 예약: true, 예약일: 날(8), 날짜: 날(-2) });
  const p = ps[ps.length-1];
  const 원 = { id: 'sm_시험원본', 날짜: 날(-3), 상태: '저장', 받는분: '시험원본', 전화: '01022223333', 주소: '서울시 시험로 9', 상세주소: '',
    품목: [{ 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 수량: 2, 단가: 5000 }], 배송비: 0, 예약: true, 예약일: 날(9),
    원본줄들: [{ id: 'o_시험원본1', 주문번호: '', 주문일: 날(-3), 판매처: '수동', 출처: '수동', 수령인: '시험원본', 수령인전화: '01022223333', 수령인주소: '서울시 시험로 9', 품목코드: p.품목코드, 유통명: p.유통명, 주문수량: 2, 단가: 5000 }],
    옮겨온일시: Date.now(), 등록일시: Date.now(), 수정일시: Date.now() };
  저.덧붙이기(저.키.문자주문, 원);
  return { A: r.id, 원: 원.id, 유통명: 품.유통명 };
}"""
값들 = "(sel) => [...document.querySelectorAll(sel + ' input, ' + sel + ' textarea')].map(e => e.value)"
try:
  with sync_playwright() as p:
    브 = p.chromium.launch()
    for 폰 in (False, True):
        이름 = '폰' if 폰 else 'PC'; print('\n' + 이름)
        쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000}, service_workers='block', reduced_motion='reduce')
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort()); 쪽.route('**supabase.co**', lambda r: r.abort())
        쪽.add_init_script(심기)
        for 번 in range(3):
            try: 쪽.goto(주소); 쪽.wait_for_function("() => window.ZG && ZG.예약탭 && ZG.시드", timeout=15000); break
            except Exception: pass
        쪽.evaluate("() => { ZG.시드.심기(); }"); m = 쪽.evaluate(심기자료)
        for 번 in range(3):   # 00-새판 새로고침 경합으로 가끔 반쯤 실린다(매뉴얼 · 최대 3번)
            try: 쪽.reload(); 쪽.wait_for_function("() => window.ZG && ZG.예약탭 && ZG.문자주문", timeout=15000); break
            except Exception: pass
        쪽.wait_for_timeout(1500)
        if not 쪽.locator('.stabs').count(): 쪽.screenshot(path=str(여기 / ('_막힘-' + 이름 + '.png'))); print(쪽.evaluate("() => [location.href, document.body.innerText.slice(0,200), !!(window.ZG&&ZG.예약탭)]"))
        if 폰: 쪽.evaluate("() => ZG.주문.열기('목록')"); 쪽.wait_for_timeout(500)
        쪽.click('.stabs button:has-text("예약")'); 쪽.wait_for_timeout(500)
        칸 = '.예약탭 .rc' if 폰 else '.예약탭 .tr'
        가 = 쪽.locator(칸 + ':has-text("시험가람")').first
        # ① 카드(이름 자리)를 누르면 그 자리에서 판이 열린다 — 탭은 그대로
        가.locator('.nm').click(); 쪽.wait_for_timeout(500)
        판 = '.예약탭 .문자주문'
        본다('카드 누름 → 예약 탭 안에 판 열림(탭 안 바뀜)', 쪽.locator(판).count() == 1 and 쪽.locator('.stabs button.on:has-text("예약")').count() == 1)
        v = 쪽.evaluate(값들, 판)
        본다('받는 분·전화·주소·상세·우편·메모 보임', all(x in v for x in ['시험가람', '010-1111-0010', '서울시 가람로 1', '101호', '04524', '현관 앞']), [x for x in v if x][:8])
        글 = 쪽.inner_text(판)
        본다('품목 이름과 금액(3×12,000=36,000원) · 배송비 3,000원', m['유통명'] in 글 and '36,000원' in 글 and '3,000원' in 글, 글.replace('\n', ' | ')[:160])
        본다('판 끝 단추 = 닫기·저장(문자·주문올리기·삭제 없음)', 쪽.locator(판 + ' button:has-text("저장")').count() == 1 and 쪽.locator(판 + ' button:has-text("닫기")').count() == 1
             and 쪽.locator(판 + ' button:has-text("주문올리기")').count() == 0 and 쪽.locator(판 + ' button:has-text("삭제")').count() == 0)
        본다('[고치기] 단추가 「접기」로', 가.locator('button:has-text("접기")').count() == 1)
        쪽.wait_for_timeout(800)
        상자 = 쪽.locator(판).bounding_box()
        본다('판이 화면에 보임(높이 > 200)', 상자 and 상자['height'] > 200, 상자)
        쪽.screenshot(path=str(여기 / ('1-펼침-' + 이름 + '.png')), full_page=not 폰)
        # ② 고치기 — 한글로 친다(메모) · 상세주소 · 수량
        메 = 쪽.locator(판 + ' input[placeholder="메모"], ' + 판 + ' textarea[placeholder="메모"]').first
        메.click(); 메.fill(''); 쪽.keyboard.type('경비실 맡김'); 쪽.wait_for_timeout(200)
        상 = 쪽.locator(판 + ' input[placeholder="상세주소"]').first
        if 상.count(): 상.fill('202호')
        # ③ 저장 → 확인창 하나 → 취소면 안 바뀜
        쪽.locator(판 + ' button:has-text("저장")').click(); 쪽.wait_for_timeout(400)
        창 = 쪽.locator('.askbox')
        본다('저장 → 확인창 하나', 창.count() == 1, 창.count())
        창글 = 창.inner_text() if 창.count() else ''
        본다('확인창에 받는 분·금액 39,000원·예약일', '예약 내용을 이렇게 바꿀까요?' in 창글 and '시험가람' in 창글 and '39,000원' in 창글 and '예약일' in 창글, 창글.replace('\n', ' / '))
        쪽.screenshot(path=str(여기 / ('2-확인창-' + 이름 + '.png')))
        쪽.click('.askbox button:has-text("취소")'); 쪽.wait_for_timeout(300)
        r = 쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['A'])
        본다('취소 → 서버 줄 그대로 · 판은 열린 채 · 친 글 남음', r.get('메모') == '현관 앞' and 쪽.locator(판).count() == 1
             and '경비실 맡김' in 쪽.evaluate(값들, 판), r.get('메모'))
        쪽.locator(판 + ' button:has-text("저장")').click(); 쪽.wait_for_timeout(300)
        쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(500)
        r = 쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['A'])
        본다('확인 → 메모(한글)·상세주소 저장 · 예약·예약일·품목 그대로', r.get('메모') == '경비실 맡김' and r.get('상세주소') == '202호' and r.get('예약') is True
             and r.get('상태') != '올림' and len(r.get('품목') or []) == 1, (r.get('메모'), r.get('상세주소'), r.get('예약일')))
        본다('저장 뒤 판 닫힘 · 예약 탭 그대로 · ★ 그대로', 쪽.locator(판).count() == 0 and 쪽.locator('.예약탭').count() == 1
             and 쪽.locator(칸 + ':has-text("시험가람") .nm').first.inner_text().strip() == '시험가람 ★')
        # ④ 다시 누르면 열리고, 또 누르면 접힘
        가 = 쪽.locator(칸 + ':has-text("시험가람")').first
        가.locator('.nm').click(); 쪽.wait_for_timeout(300)
        열 = 쪽.locator(판).count()
        쪽.locator(칸 + ':has-text("시험가람")').first.locator('.nm').click(); 쪽.wait_for_timeout(300)
        본다('다시 누르면 접힘', 열 == 1 and 쪽.locator(판).count() == 0)
        # ⑤ 주문탭에서 옮겨 온 예약 — 전화·주소·품목 보기 + 메모 고치기(확인창 뒤)
        쪽.locator(칸 + ':has-text("시험원본")').first.locator('.nm').click(); 쪽.wait_for_timeout(400)
        원글 = 쪽.inner_text(판) if 쪽.locator(판).count() else ''
        본다('옮겨 온 예약: 전화·주소·품목·금액 보임', '010-2222-3333' in 원글 and '서울시 시험로 9' in 원글 and '10,000원' in 원글, 원글.replace('\n', ' | ')[:160])
        메 = 쪽.locator(판 + ' input[placeholder="메모"], ' + 판 + ' textarea[placeholder="메모"]').first
        메.fill('부재 시 경비실')
        쪽.locator(판 + ' button:has-text("저장")').click(); 쪽.wait_for_timeout(300)
        본다('옮겨 온 예약도 저장 전 확인창', 쪽.locator('.askbox').count() == 1)
        쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(500)
        r = 쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['원'])
        본다('옮겨 온 예약 메모 저장 · 원본줄들 그대로', r.get('메모') == '부재 시 경비실' and len(r.get('원본줄들') or []) == 1, r.get('메모'))
        # ⑥ 단추([지금 올리기])는 판을 열지 않는다 — 확인창만
        쪽.locator(칸 + ':has-text("시험가람")').first.locator('button:has-text("지금 올리기")').click(); 쪽.wait_for_timeout(300)
        본다('[지금 올리기]는 판을 안 엶', 쪽.locator(판).count() == 0 and 쪽.locator('.askbox').count() == 1)
        쪽.click('.askbox button:has-text("취소")'); 쪽.wait_for_timeout(200)
        본다('콘솔 빨간 에러 0(누른 뒤)', not 오류, 오류[:3])
        쪽.close()
    브.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
