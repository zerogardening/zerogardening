import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과=[]
def 본다(이름, 참, 덧=''): 결과.append(bool(참)); print(('  OK ' if 참 else '  XX ')+이름+((' — '+str(덧)) if 덧 else ''))
서버 = subprocess.Popen([sys.executable,'-m','http.server','8796','-d',str(뿌리)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1.2)
주소='http://localhost:8796/%EC%A3%BC%EB%AC%B8.html'
심기자료 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const r = 자.새로저장({ 받는분: '시험가람', 전화: '01011110010', 주소: '서울시 가람로 1', 메모: '현관 앞에 두기', 품목: [자.담을줄(ps[10])], 배송비: 3000 }, true);
  저.바꾸기(저.키.문자주문, r.id, { 예약: true, 예약일: 날(8), 날짜: 날(-2) });
  const r2 = 자.새로저장({ 받는분: '시험나래', 전화: '01011110011', 주소: '서울시 나래로 2', 품목: [자.담을줄(ps[11])], 배송비: 3000 }, true);
  저.바꾸기(저.키.문자주문, r2.id, { 예약: true, 예약일: 날(8), 날짜: 날(-2) });
  const p = ps[ps.length-1];
  const 원 = { id: 'sm_시험원본', 날짜: 날(-3), 상태: '저장', 받는분: '시험원본', 전화: '01022223333', 주소: '서울시 시험로 9', 상세주소: '',
    품목: [{ 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 수량: 2, 단가: 5000 }], 배송비: 0, 예약: true, 예약일: 날(9),
    원본줄들: [{ id: 'o_시험원본1', 주문번호: '', 주문일: 날(-3), 판매처: '수동', 출처: '수동', 수령인: '시험원본', 수령인전화: '01022223333', 수령인주소: '서울시 시험로 9', 품목코드: p.품목코드, 유통명: p.유통명, 주문수량: 2, 단가: 5000 }],
    옮겨온일시: Date.now(), 등록일시: Date.now(), 수정일시: Date.now() };
  저.덧붙이기(저.키.문자주문, 원);
  return { A: r.id, B: r2.id, 원: 원.id };
}"""
def 예약탭(쪽):
    쪽.click('.stabs button:has-text("예약")'); 쪽.wait_for_timeout(500)
try:
  with sync_playwright() as p:
    브=p.chromium.launch()
    for 폰 in (False, True):
        이름='폰' if 폰 else 'PC'; print('\n'+이름)
        쪽=브.new_page(viewport={'width':390,'height':844} if 폰 else {'width':1440,'height':1000}, service_workers='block')
        오류=[]; 쪽.on('pageerror',lambda e:오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**',lambda r:r.abort()); 쪽.route('**supabase.co**',lambda r:r.abort())
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_function("() => window.ZG && ZG.예약탭")
        쪽.evaluate("() => { ZG.시드.심기(); }"); m=쪽.evaluate(심기자료); 쪽.reload(); 쪽.wait_for_function("() => window.ZG && ZG.예약탭"); 쪽.wait_for_timeout(1500)
        if 폰: 쪽.evaluate("() => ZG.주문.열기('목록')"); 쪽.wait_for_timeout(500)
        예약탭(쪽)
        가=쪽.locator('.예약탭 .nm', has_text='시험가람').first
        본다('메모 있는 줄 이름 뒤 ★', 가.inner_text().strip()=='시험가람 ★', 가.inner_text())
        본다('★ 위에 메모 글(title)', 가.get_attribute('title')=='현관 앞에 두기')
        나=쪽.locator('.예약탭 .nm', has_text='시험나래').first
        본다('메모 없는 줄은 ★ 없음', '★' not in 나.inner_text())
        # 고치기 → 고침 판
        줄=쪽.locator(('.예약탭 .rc' if 폰 else '.예약탭 .tr')+':has-text("시험가람")').first
        줄.locator('button:has-text("고치기")').click(); 쪽.wait_for_timeout(800)
        값들=쪽.evaluate("() => [...document.querySelectorAll('input,textarea')].map(e=>e.value)")
        본다('고치기 → 고침 판(받는 분·메모가 채워짐 · 10/23~ 예약 탭 안)', '시험가람' in 값들 and '현관 앞에 두기' in 값들, [v for v in 값들 if v][:6])
        메=쪽.locator('input[placeholder="메모"],textarea[placeholder="메모"]').first
        메.fill('문 앞 · 오후 배송'); 
        쪽.locator('button:has-text("저장")').last.click(); 쪽.wait_for_timeout(500)
        if 쪽.locator('.askbox').count(): 쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(500)   # 10/23~ 예약 탭 판은 확인창 뒤 저장
        r=쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['A'])
        본다('메모 고쳐 저장됨 · 예약 그대로', r.get('메모')=='문 앞 · 오후 배송' and r.get('예약') is True and r.get('받는분')=='시험가람', (r.get('메모'),r.get('예약'),r.get('예약일')))
        # 옮겨 온 예약 — 메모 칸이 있고 저장된다
        ok=쪽.evaluate("(id)=>{ ZG.견적탭.탭으로('문자'); ZG.문자주문.고치기로(id); return true; }", m['원']); 쪽.wait_for_timeout(800)
        메=쪽.locator('input[placeholder="메모"],textarea[placeholder="메모"]').first
        본다('옮겨 온 예약 고침 판에도 메모 칸', 메.count()>0)
        if 메.count():
            메.fill('부재 시 경비실'); 쪽.locator('button:has-text("저장")').last.click(); 쪽.wait_for_timeout(500)
            r=쪽.evaluate("(id)=>ZG.문자주문자료.하나(id)", m['원'])
            본다('옮겨 온 예약 메모 저장 · 원본줄들 그대로', r.get('메모')=='부재 시 경비실' and len(r.get('원본줄들') or [])==1, r.get('메모'))
        쪽.screenshot(path=str(뿌리/'검수'/'26-예약탭'/('8-메모-'+이름+'.png')))
        본다('콘솔 빨간 에러 없음', not 오류, 오류[:2])
        쪽.close()
    브.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
