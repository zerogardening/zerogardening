# -*- coding: utf-8 -*-
# 예약 탭 「📦 예약 발송」 — 올라간 예약을 모아 송장 넣고 배송완료 → 문자주문 「발송문자 보냄」 (10/28 우람님)
#   python3 v3/검수/39-예약발송/예약발송-시험.py   ← 로컬 전용(supabase 막음 · 가짜 자료)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '39-예약발송'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''): 결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8839', '-d', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
주소 = 'http://localhost:8839/%EC%A3%BC%EB%AC%B8.html'
심기자료 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const 사람 = (이름, 끝) => ({ 받는분: 이름, 전화: '0101111' + 끝, 주소: '서울시 시험로 ' + 끝, 상세주소: '', 우편: '04524', 배송메시지: '' });
  function 만들기(이름, 끝, 예약일, 올림, 예약) {
    const 품 = Object.assign(자.담을줄(ps[10]), { 수량: 2, 단가: 10000 });
    const r = 자.새로저장(Object.assign(사람(이름, 끝), { 품목: [품], 배송비: 0 }), true);
    저.바꾸기(저.키.문자주문, r.id, { 예약: 예약, 예약일: 예약 ? 예약일 : '', 날짜: 날(-12) });
    if (올림) 자.주문올리기(r.id, 사람(이름, 끝));
    return r.id;
  }
  const A = 만들기('시험가', '0001', 오늘, true, true);
  const B = 만들기('시험나', '0002', 오늘, true, true);
  const C = 만들기('시험다', '0003', 날(5), false, true);
  const D = 만들기('시험라', '0004', '', true, false);
  // B 는 이미 로젠으로 배송완료된 것
  const B줄 = 저.읽기(저.키.주문).filter(o => o.문자주문id === B);
  const BX = ZG.배송완료; BX.출고넣기(B줄, 오늘, BX.색인만들기(), { 운송장번호: '55500011122', 배치: BX.새배치() });
  return { A, B, C, D, 품: ps[10].품목코드 };
}"""
출고수 = "(id) => { const 저 = ZG.저장소; const ids = 저.읽기(저.키.주문).filter(o => o.문자주문id === id).map(o => o.id); return 저.읽기(저.키.출고).filter(s => ids.includes(s.주문id)); }"
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
            try: 쪽.goto(주소); 쪽.wait_for_function("() => window.ZG && ZG.예약탭 && ZG.시드 && ZG.문자주문자료 && ZG.배송완료", timeout=15000); 쪽.wait_for_timeout(800); 쪽.wait_for_function("() => window.ZG && ZG.문자주문자료 && ZG.배송완료", timeout=15000); break
            except Exception: pass
        쪽.evaluate("() => { ZG.시드.심기(); }"); m = 쪽.evaluate(심기자료)
        for 번 in range(3):
            try: 쪽.reload(); 쪽.wait_for_function("() => window.ZG && ZG.예약탭 && ZG.문자주문", timeout=15000); break
            except Exception: pass
        쪽.wait_for_timeout(1500)
        if 폰: 쪽.evaluate("() => ZG.주문.열기('목록')"); 쪽.wait_for_timeout(500)
        쪽.click('.stabs button:has-text("예약")'); 쪽.wait_for_timeout(500)
        칩 = 쪽.locator('.예약탭 .fchip:has-text("예약 발송")')
        본다('예약 탭에 「📦 예약 발송」 칩 · 숫자 2(올라간 예약 A·B)', 칩.count() == 1 and 칩.locator('.n').inner_text().strip() == '2', 칩.inner_text() if 칩.count() else '')
        칩.click(); 쪽.wait_for_timeout(400)
        판 = '.예약탭.발송판'
        글 = 쪽.inner_text(판)
        본다('보낼 것에 A·B만(예약 전 C·예약 아닌 D 없음)', '시험가' in 글 and '시험나' in 글 and '시험다' not in 글 and '시험라' not in 글, 글.replace('\n', ' | ')[:200])
        카A = 쪽.locator(판 + ' .rc:has-text("시험가")'); 카B = 쪽.locator(판 + ' .rc:has-text("시험나")')
        본다('B(로젠 끝남) 송장 칸에 55500011122 미리 채움 · 「로젠 배송완료됨」', 카B.locator('input').input_value() == '55500011122' and '로젠 배송완료됨' in 카B.inner_text())
        본다('A 송장 칸 비어 있음', 카A.locator('input').input_value() == '')
        쪽.screenshot(path=str(여기 / ('1-목록-' + 이름 + '.png')), full_page=not 폰)
        # 빈 송장 → 막힘
        카A.locator('button:has-text("배송완료")').click(); 쪽.wait_for_timeout(300)
        본다('빈 송장 → 확인창 없음 · 출고 0', 쪽.locator('.askbox').count() == 0 and len(쪽.evaluate(출고수, m['A'])) == 0)
        카A.locator('input').fill('12345678901'); 
        카A.locator('button:has-text("배송완료")').click(); 쪽.wait_for_timeout(300)
        창 = 쪽.locator('.askbox')
        본다('확인창에 이름·송장·재고 안내', 창.count() == 1 and '시험가' in 창.inner_text() and '12345678901' in 창.inner_text() and '재고' in 창.inner_text(), 창.inner_text().replace('\n', ' / ') if 창.count() else '')
        쪽.screenshot(path=str(여기 / ('2-확인창-' + 이름 + '.png')))
        쪽.click('.askbox button:has-text("취소")'); 쪽.wait_for_timeout(300)
        r = 쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['A'])
        본다('취소 → 출고 0 · 발송문자 표시 없음', len(쪽.evaluate(출고수, m['A'])) == 0 and not r.get('발송문자보냄일시'))
        쪽.locator(판 + ' .rc:has-text("시험가") button:has-text("배송완료")').click(); 쪽.wait_for_timeout(300)
        쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(500)
        출 = 쪽.evaluate(출고수, m['A']); r = 쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['A'])
        정 = 쪽.evaluate("(id)=>ZG.문자주문자료.발송정보(ZG.문자주문자료.하나(id))", m['A'])
        본다('A 배송완료 → 출고 1줄(수량 2 · 운송장 12345678901 · 수동)', len(출) == 1 and 출[0]['수량'] == 2 and 출[0]['운송장번호'] == '12345678901' and 출[0].get('수동') is True, 출)
        본다('A 문자주문 「발송문자 보냄」 · 송장 12345678901', bool(r.get('발송문자보냄일시')) and 정['됨'] and 정['송장'] == ['12345678901'], (r.get('발송문자보냄일시'), 정['송장']))
        # B — 이미 나간 것: 출고 안 늘고 표시만
        쪽.locator(판 + ' .rc:has-text("시험나") button:has-text("배송완료")').click(); 쪽.wait_for_timeout(300)
        본다('B 확인창엔 재고 안내 없음', '재고' not in 쪽.locator('.askbox').inner_text())
        쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(500)
        r = 쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['B'])
        본다('B 출고 그대로 1줄 · 발송문자 보냄 · 손송장 없음(자동 그대로)', len(쪽.evaluate(출고수, m['B'])) == 1 and bool(r.get('발송문자보냄일시')) and r.get('손송장') is None)
        글 = 쪽.inner_text(판)
        본다('둘 다 「보낸 것 (7일)」으로 · 칩 숫자 0 · 「문자 보내기 완료」', '보낸 것 (7일)' in 글 and '보낼 것' not in 글.split('보낸 것')[0] and 글.count('문자 보내기 완료') == 2
             and 쪽.locator('.예약탭 .fchip:has-text("예약 발송") .n').inner_text().strip() == '0', 글.replace('\n', ' | ')[:200])
        쪽.screenshot(path=str(여기 / ('3-끝-' + 이름 + '.png')), full_page=not 폰)
        # 다른 칩으로 돌아가면 원래 예약 목록(C 보임)
        쪽.click('.예약탭 .fchip:has-text("전체")'); 쪽.wait_for_timeout(300)
        본다('「전체」 칩 → 원래 예약 목록(C 보임 · 발송판 없음)', 쪽.locator('.예약탭:not(.발송판)').count() == 1 and '시험다' in 쪽.inner_text('.예약탭'))
        # 문자주문 캘린더(받은 날 -12일)에서도 발송문자 보냄으로 보이나
        날 = 쪽.evaluate("() => { const 오늘 = ZG.ui.오늘문자(); const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) - 12); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }")
        보냄 = 쪽.evaluate("(날) => ZG.문자주문자료.거르기(날, '').filter(r => r.발송문자보냄일시).map(r => r.받는분)", 날)
        본다('문자주문(받은 날)에서 가·나가 발송문자 보냄', sorted(보냄) == ['시험가', '시험나'], 보냄)
        본다('콘솔 빨간 에러 0(누른 뒤)', not 오류, 오류[:3])
        쪽.close()
    브.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
