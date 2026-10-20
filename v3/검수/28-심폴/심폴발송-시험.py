# -*- coding: utf-8 -*-
# 28단계 심폴 발송 — 체크 분리 · 폰에서도 심폴 · 실패 사유 그대로 — python3 v3/검수/28-심폴/심폴발송-시험.py
# 🔴 로컬 전용 — supabase 주소를 막고, 서버 클라이언트를 브라우저 안 가짜로 바꿔 끼운다. 심폴·카페24 어디에도 안 나간다
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝-개발/통합관리/v3')
여기 = 뿌리 / '검수' / '28-심폴'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8799', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8799/%EC%A3%BC%EB%AC%B8.html'

# 주문 심기 — 심폴 A1(보낼 것)·A2(심폴에 송장 있음으로 막힐 것)·A9(이미 나감, L1 잠금) + 카페24 하나(있으면)
심기자료 = """(카페24도) => {
  const 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  let i = 0;
  const 주문 = (번호, 이름, 판매처, 덧) => {
    const p = ps[(i++) % ps.length];
    저.덧붙이기(저.키.주문, Object.assign({ id: 'o_심시험_' + 번호, 주문번호: 번호, 주문일: 오늘, 판매처: 판매처, 출처: '자동수집',
      수령인: 이름, 수령인전화: '010-1000-000' + i, 수령인주소: '서울시 시험로 ' + i, 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 주문수량: 1, 단가: 1000 }, 덧 || {}));
  };
  주문('S2026A1', '김심폴', '심폴');
  주문('S2026A2', '이심폴', '심폴');
  주문('S2026A9', '박나감', '심폴', { 심폴상태: '배송완료', 심폴송장: '99000000999' });
  if (카페24도) 주문('20261020-0000001', '최카페', '카페24', { 카페24상태: '배송준비중' });
}"""

# 가짜 서버 — 부른 것을 적어 두고 그럴듯한 답을 준다. 바깥으로 안 나간다
가짜 = """() => {
  window.__부름 = [];
  ZG.서버.클라이언트 = { functions: { invoke(이름, o) {
    window.__부름.push({ 이름, 몸: JSON.parse(JSON.stringify(o.body)) });
    const 짝 = o.body.짝들;
    if (이름 === 'simpol-ship') return Promise.resolve({ data: { ok: true, 결과: 짝.map(p => p.주문번호.endsWith('A2')
      ? { 주문번호: p.주문번호, 됨: false, 판정: '이미 송장 있음', 사유: '심폴에 송장이 이미 등록돼 있습니다', 심폴송장: '45392501453' }
      : { 주문번호: p.주문번호, 됨: true, 판정: '발송됨', 사유: '', 심폴송장: p.운송장번호 }) } });
    return Promise.resolve({ data: { ok: true, 결과: 짝.map(() => ({ 됨: true, 사유: '', 품목수: 1 })) } });
  } } };
}"""

파일넣기 = """async (카페24도) => {
  const 머리1 = []; 머리1[3] = '운송장번호'; 머리1[6] = '수하인'; 머리1[18] = '주문번호';
  const 머리2 = []; 머리2[3] = '운송장번호'; 머리2[6] = '이름'; 머리2[11] = '박스\\n수량'; 머리2[18] = '주문번호';
  const 줄 = (송, 이름, 번호) => { const r = []; r[3] = 송; r[6] = 이름; r[11] = '1'; r[18] = 번호; return r; };
  const 행들 = [['주문등록_출력(복수건)_출력완료'], 머리1, 머리2,
    줄('99000000101', '김심폴', 'S2026A1'), 줄('99000000102', '이심폴', 'S2026A2'), 줄('99000000109', '박나감', 'S2026A9')];
  if (카페24도) 행들.push(줄('99000000201', '최카페', '20261020-0000001'));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(행들), 'Sheet1');
  const f = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], '주문등록_출력완료.xlsx');
  const dt = new DataTransfer(); dt.items.add(f);
  document.querySelector('.drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}"""

def 새쪽(브, 폰):
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                     device_scale_factor=2 if 폰 else 1, service_workers='block')
    쪽._오류 = []
    쪽.on('pageerror', lambda e: 쪽._오류.append(str(e)))
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기)
    return 쪽

def 차림(브, 폰, 카페24도):
    쪽 = 새쪽(브, 폰)
    쪽.goto(주소); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_function("() => window.ZG && ZG.배송완료창 && window.XLSX")
    쪽.evaluate("() => ZG.시드.심기()")
    쪽.evaluate(심기자료, 카페24도); 쪽.evaluate(가짜)
    쪽.evaluate("() => ZG.배송완료창.열기()"); 쪽.wait_for_timeout(300)
    쪽.evaluate(파일넣기, 카페24도); 쪽.wait_for_timeout(800)
    return 쪽

체크 = lambda 쪽, 글: 쪽.locator('.ft .c24:has-text("' + 글 + '")')
켜짐 = lambda 쪽, 글: 체크(쪽, 글).locator('.cb.on').count() == 1
부름 = lambda 쪽: 쪽.evaluate("() => window.__부름")
심폴상태 = lambda 쪽, 번호: 쪽.evaluate("(n) => (ZG.저장소.읽기(ZG.저장소.키.주문).find(r => r.주문번호 === n) || {}).심폴상태 || ''", 번호)

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        print('\n① 폰 — 카페24 + 심폴 함께')
        쪽 = 차림(브, True, True)
        본다('두 체크가 따로 보이고 둘 다 켜짐', 켜짐(쪽, '카페24 송장 올리기') and 켜짐(쪽, '심폴 발송처리'))
        쪽.screenshot(path=str(여기 / '1-두체크-폰.png'))
        쪽.locator('.ft .bigbtn:has-text("저장")').click(); 쪽.wait_for_timeout(300)
        묻 = 쪽.locator('.askbox').inner_text() if 쪽.locator('.askbox').count() else ''
        본다('확인창 하나 — 「카페24 송장 1건 · 심폴 2건 발송」', '카페24 송장 1건 · 심폴 2건 발송' in 묻, 묻.replace('\n', ' / '))
        본다('「손님에게 문자가 나가며 되돌릴 수 없습니다」', '손님에게 문자가 나가며 되돌릴 수 없습니다' in 묻)
        본다('위험 단추(빨강)', 쪽.locator('.askbox .btn.warn').count() == 1)
        쪽.screenshot(path=str(여기 / '2-확인창-폰.png'))
        쪽.locator('.askbox .btn.warn').click(); 쪽.wait_for_timeout(800)
        b = 부름(쪽)
        본다('카페24 먼저 → 심폴', [x['이름'] for x in b] == ['shipment-push', 'simpol-ship'], [x['이름'] for x in b])
        심몸 = b[1]['몸'] if len(b) > 1 else {}
        본다('심폴엔 A1·A2만(이미 나간 A9 빠짐)', [x['주문번호'] for x in 심몸.get('짝들', [])] == ['S2026A1', 'S2026A2'], 심몸.get('짝들'))
        실 = 쪽.locator('.askbox').inner_text() if 쪽.locator('.askbox').count() else ''
        본다('실패 사유 그대로 — 「이미 송장 있음 — 심폴에 송장이 이미 등록돼 있습니다」', '이심폴' in 실 and '이미 송장 있음 — 심폴에 송장이 이미 등록돼 있습니다' in 실, 실.replace('\n', ' / '))
        쪽.screenshot(path=str(여기 / '3-실패사유-폰.png'))
        본다('성공한 A1만 심폴상태 배송완료로 되씀', 심폴상태(쪽, 'S2026A1') == '배송완료' and 심폴상태(쪽, 'S2026A2') == '')
        본다('콘솔 빨간 에러 없음(①)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()

        print('\n② 폰 — 심폴만 있는 날 (전에는 그냥 닫혔다)')
        쪽 = 차림(브, True, False)
        본다('카페24 체크 숨김 · 심폴 체크 켜짐', not 체크(쪽, '카페24 송장 올리기').is_visible() and 켜짐(쪽, '심폴 발송처리'))
        쪽.locator('.ft .bigbtn:has-text("저장")').click(); 쪽.wait_for_timeout(300)
        묻 = 쪽.locator('.askbox h4').inner_text() if 쪽.locator('.askbox').count() else ''
        본다('확인창 「심폴 2건 발송」', 묻 == '심폴 2건 발송', 묻)
        쪽.locator('.askbox .btn:has-text("취소")').click(); 쪽.wait_for_timeout(300)
        본다('취소하면 아무것도 안 부름', 부름(쪽) == [])
        본다('콘솔 빨간 에러 없음(②)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()

        print('\n③ 폰 — 카페24 끄고 심폴만 / 심폴 끄고 카페24만')
        쪽 = 차림(브, True, True)
        체크(쪽, '카페24 송장 올리기').click(); 쪽.wait_for_timeout(200)
        본다('카페24 꺼도 심폴은 켜져 있음', not 켜짐(쪽, '카페24 송장 올리기') and 켜짐(쪽, '심폴 발송처리'))
        쪽.locator('.ft .bigbtn:has-text("저장")').click(); 쪽.wait_for_timeout(300)
        쪽.locator('.askbox .btn.warn').click(); 쪽.wait_for_timeout(800)
        본다('심폴만 부름', [x['이름'] for x in 부름(쪽)] == ['simpol-ship'], [x['이름'] for x in 부름(쪽)])
        쪽.close()
        쪽 = 차림(브, True, True)
        체크(쪽, '심폴 발송처리').click(); 쪽.wait_for_timeout(200)
        쪽.locator('.ft .bigbtn:has-text("저장")').click(); 쪽.wait_for_timeout(300)
        묻 = 쪽.locator('.askbox').inner_text() if 쪽.locator('.askbox').count() else ''
        본다('심폴 끄면 카페24 확인창만 · 문자 경고 없음', '카페24에 송장 1건을 올릴까요' in 묻 and '문자' not in 묻, 묻.replace('\n', ' / '))
        쪽.locator('.askbox .btn.main').click(); 쪽.wait_for_timeout(800)
        본다('카페24만 부름', [x['이름'] for x in 부름(쪽)] == ['shipment-push'], [x['이름'] for x in 부름(쪽)])
        본다('콘솔 빨간 에러 없음(③)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()

        print('\n④ PC — 카페24 끄면 08m 이 심폴만 들고 열림 · 08m 실패 사유 그대로')
        쪽 = 차림(브, False, True)
        본다('PC 두 체크 둘 다 켜짐', 켜짐(쪽, '카페24 송장 올리기') and 켜짐(쪽, '심폴 발송처리'))
        쪽.screenshot(path=str(여기 / '4-두체크-PC.png'))
        체크(쪽, '카페24 송장 올리기').click(); 쪽.wait_for_timeout(200)
        쪽.locator('.ft .btn.main:has-text("저장")').click(); 쪽.wait_for_timeout(400)
        창글 = 쪽.locator('.pcsheet').last.inner_text()
        본다('08m 에 심폴 표만(카페24 없음)', '심폴 발송처리' in 창글 and '최카페' not in 창글, 창글[:200].replace('\n', ' / '))
        쪽.locator('.pcsheet').last.locator('button:has-text("올리기")').last.click(); 쪽.wait_for_timeout(300)
        묻 = 쪽.locator('.askbox').inner_text() if 쪽.locator('.askbox').count() else ''
        본다('08m 확인창에 문자 경고', '손님에게 문자·이메일이 자동으로 나갑니다' in 묻)
        쪽.locator('.askbox .btn.warn').click(); 쪽.wait_for_timeout(800)
        창글 = 쪽.locator('.pcsheet').last.inner_text()
        본다('08m 결과 — ✅ 발송처리됨 · ❌ 이미 송장 있음 — 사유', '✅ 심폴 발송처리됨' in 창글 and '❌ 이미 송장 있음 — 심폴에 송장이 이미 등록돼 있습니다' in 창글)
        본다('08m 요약 「심폴 발송처리 1건 · 막힘 1건」', '심폴 발송처리 1건' in 창글 and '막힘 1건' in 창글)
        본다('PC 도 심폴만 부름', [x['이름'] for x in 부름(쪽)] == ['simpol-ship'])
        쪽.screenshot(path=str(여기 / '5-08m결과-PC.png'))
        본다('화면에 사용법 설명 문구 없음', '눌러' not in 창글 and '하세요' not in 창글)
        본다('콘솔 빨간 에러 없음(④)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
