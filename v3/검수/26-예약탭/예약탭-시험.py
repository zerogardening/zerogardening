# -*- coding: utf-8 -*-
# 26단계 주문탭 「예약」 하위탭 · 지금 올리기 · 자동 올림 — python3 v3/검수/26-예약탭/예약탭-시험.py
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막는다. 두 기기 겹침은 페이지 안 가짜 서버로 본다(실서버 안 씀)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '26-예약탭'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8797', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8797/%EC%A3%BC%EB%AC%B8.html'

심기자료 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const 새 = (이름, 주소, i, 예약일) => {
    const r = 자.새로저장({ 받는분: 이름, 전화: '0101111' + String(i).padStart(4,'0'), 주소: 주소, 품목: [자.담을줄(ps[i])], 배송비: 3000 }, true);
    저.바꾸기(저.키.문자주문, r.id, { 예약: true, 예약일: 예약일 === null ? '' : 날(예약일), 날짜: 날(-2) }); return r.id; };
  const p = ps[ps.length - 1];
  const 원줄 = { id: 'o_시험원본1', 주문번호: '', 주문일: 날(-3), 판매처: '수동', 출처: '수동', 수령인: '시험원본', 수령인전화: '01022223333',
    수령인주소: '서울시 시험로 9', 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 주문수량: 2, 단가: 5000 };
  const 원 = { id: 'sm_시험원본', 날짜: 날(-3), 상태: '저장', 받는분: '시험원본', 전화: '01022223333', 주소: '서울시 시험로 9', 상세주소: '',
    품목: [{ 품목코드: p.품목코드, 유통명: p.유통명, 규격: p.규격 || '', 수량: 2, 단가: 5000 }], 배송비: 0,
    예약: true, 예약일: 날(-1), 원본줄들: [원줄], 옮겨온일시: Date.now(), 등록일시: Date.now(), 수정일시: Date.now() };
  저.덧붙이기(저.키.문자주문, 원);
  return {
    A: 새('시험가람', '서울시 가람로 1', 10, 8), B: 새('시험나래', '서울시 나래로 2', 11, 8),
    C: 새('시험다솜', '', 12, 0), D: 새('시험라온', '서울시 라온로 4', 13, null),
    E: 새('시험마루', '서울시 마루로 5', 14, 0), F: 새('시험바다', '서울시 바다로 6', 15, -1),
    G: 새('', '', 16, 3), 원: 원.id, 날5: 날(5), 날8: 날(8), 오늘: 오늘
  };
}"""
하나 = "(id) => ZG.문자주문자료.하나(id)"
def 줄(쪽, 폰, 이름): return 쪽.locator(('.예약탭 .rc' if 폰 else '.예약탭 .tr') + ':has-text("%s")' % 이름)
def 예약탭(쪽):
    쪽.click('.stabs button:has-text("예약")'); 쪽.wait_for_timeout(400)

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n' + 이름)
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                             device_scale_factor=2 if 폰 else 1, service_workers='block')
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
            쪽.route('**supabase.co**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_load_state('networkidle'); 쪽.wait_for_function("() => window.ZG && ZG.문자주문자료 && ZG.예약탭")
            쪽.evaluate("() => { ZG.시드.심기(); }")
            m = 쪽.evaluate(심기자료)

            # ── 앱이 뜰 때 자동 올림 — E(오늘)·F(어제)·원본(어제) 올라가고 C(주소 빔)는 남는다
            쪽.reload()
            쪽.wait_for_selector('.toast.예약토스트', timeout=8000)
            토 = 쪽.inner_text('#토스트칸')
            본다('뜰 때 토스트 「예약 3건이 주문탭에 올라왔습니다」', '예약 3건이 주문탭에 올라왔습니다' in 토, 토.replace('\n', ' / '))
            본다('토스트 둘째 줄 「1건은 못 올라감 · 확인」', '1건은 못 올라감 · 확인' in 토)
            쪽.screenshot(path=str(여기 / ('1-뜰때자동-' + 이름 + '.png')))
            st = 쪽.evaluate("(m) => ['E','F','원','C','A'].map(k => (ZG.문자주문자료.하나(m[k])||{}).상태)", m)
            본다('E·F·원본 올림 / C·A 그대로', st[:3] == ['올림'] * 3 and st[3] != '올림' and st[4] != '올림', st)
            줄수 = 쪽.evaluate("(m) => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => [m.E, m.F, m.원].includes(o.문자주문id)).length", m)
            본다('주문 줄 3개 생김(원본은 되살리기)', 줄수 == 3, 줄수)
            쪽.wait_for_timeout(3000)

            # ── 주문탭 「📅 예약에서 옴」 칩 (오늘 주문으로 올라옴)
            쪽.click('.stabs button:has-text("전체")'); 쪽.wait_for_timeout(400)
            옴 = 쪽.locator('.예약옴').count()
            본다('주문 목록에 「📅 예약에서 옴」 칩 3', 옴 == 3, 옴)
            쪽.screenshot(path=str(여기 / ('2-예약에서옴-' + 이름 + '.png')), full_page=not 폰)

            # ── 예약 탭 — 구역 셋
            예약탭(쪽)
            글 = 쪽.inner_text('.예약탭')
            머리 = [t.split('\n')[0].strip() for t in 쪽.locator('.예약탭 .hsec').all_inner_texts()]
            본다('구역: 못 올라감 → 예약일 지정 → 날짜 미정', 머리 == ['못 올라감', '예약일 지정', '날짜 미정'], 머리)
            본다('못 올라감에 시험다솜 + 사유', 줄(쪽, 폰, '시험다솜').count() == 1 and '주소' in 줄(쪽, 폰, '시험다솜').inner_text())
            본다('탭 숫자 = 남은 예약 5', '예약5' in 쪽.inner_text('.stabs').replace('\n', '').replace(' ', ''), 쪽.inner_text('.stabs').replace('\n', ' '))
            본다('화면에 사용법 설명 문구 없음', '누르면' not in 글 and '하세요' not in 글)
            쪽.screenshot(path=str(여기 / ('3-예약탭-' + 이름 + '.png')), full_page=True)

            # ── 칩 거르기
            쪽.click('.예약탭 .fchip.wc'); 쪽.wait_for_timeout(300)
            본다('「못 올라감」 칩 — 그 구역만', '예약일 지정' not in 쪽.inner_text('.예약탭').replace('예약일 지정0', '').split('못 올라감')[-1] and 줄(쪽, 폰, '시험가람').count() == 0)
            쪽.click('.예약탭 .fchip:has-text("전체")'); 쪽.wait_for_timeout(300)

            # ── 지금 올리기 · 예약일 전 확인창 — 취소
            줄(쪽, 폰, '시험나래').locator('button:has-text("지금 올리기")').click(); 쪽.wait_for_timeout(300)
            창 = 쪽.inner_text('.askbox')
            날글 = str(int(m['날8'][5:7])) + '/' + str(int(m['날8'][8:10]))
            본다('확인창 「예약일 %s 전입니다. 지금 주문탭으로 올릴까요?」' % 날글, ('예약일 %s 전입니다.' % 날글) in 창 and '지금 주문탭으로 올릴까요?' in 창, 창.replace('\n', ' / '))
            쪽.screenshot(path=str(여기 / ('4-확인창-' + 이름 + '.png')))
            쪽.click('.askbox button:has-text("취소")'); 쪽.wait_for_timeout(300)
            본다('취소 — 시험나래 그대로 예약', 쪽.evaluate(하나, m['B'])['상태'] != '올림')

            # ── 확인 → 잠금 풀려 올라감
            줄(쪽, 폰, '시험가람').locator('button:has-text("지금 올리기")').click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(400)
            r = 쪽.evaluate(하나, m['A'])
            본다('확인 → 예약일 전이라도 올림', r['상태'] == '올림' and r.get('올린주문번호'), r.get('올린주문번호'))
            본다('예약 탭에서 빠짐', 줄(쪽, 폰, '시험가람').count() == 0)

            # ── 받는 분 없는 줄(G) — 확인 → 받는 분 판이 열리고 잠기지 않는다 → 적고 올림
            쪽.locator('.예약탭 .rc' if 폰 else '.예약탭 .tr').filter(has_text='D-3').first.locator('button:has-text("지금 올리기")').click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox .btnrow button.main'); 쪽.wait_for_timeout(400)
            판 = 쪽.locator('.예약탭 .주소자리')
            본다('받는 분 판 열림', 판.count() == 1)
            쪽.screenshot(path=str(여기 / ('5-받는분판-' + 이름 + '.png')), full_page=True)
            판.locator('input[placeholder="받는 분"]').fill('시험사랑'); 쪽.wait_for_timeout(200)
            올 = 판.locator('button:has-text("주문올리기")')
            본다('판의 주문올리기 안 잠김(확인창 지남)', not 올.is_disabled())
            올.click(); 쪽.wait_for_timeout(400)
            본다('G 올림', 쪽.evaluate(하나, m['G'])['상태'] == '올림')

            # ── 못 올라감(C) — 주소 입력 → 올림
            줄(쪽, 폰, '시험다솜').locator('button:has-text("주소 입력")').click(); 쪽.wait_for_timeout(300)
            판 = 쪽.locator('.예약탭 .주소자리')
            ta = 판.locator('textarea[placeholder="주소"], input[placeholder="주소"]').first
            ta.fill('서울시 다솜로 3'); 쪽.wait_for_timeout(200)
            판.locator('button:has-text("주문올리기")').click(); 쪽.wait_for_timeout(400)
            r = 쪽.evaluate(하나, m['C'])
            본다('C 주소 넣고 올림', r['상태'] == '올림' and '다솜로' in (r.get('주소') or ''), r.get('주소'))

            # ── 날짜 미정(D) — 날짜 저장(5일 뒤) → 지정 구역으로
            d = 줄(쪽, 폰, '시험라온')
            d.locator('input[type=date]').fill(m['날5']); d.locator('button:has-text("저장")').click(); 쪽.wait_for_timeout(400)
            r = 쪽.evaluate(하나, m['D'])
            본다('D 예약일 저장 · 사람칸 그대로', r['예약일'] == m['날5'] and r['받는분'] == '시험라온' and r['주소'] == '서울시 라온로 4', r['예약일'])
            본다('D 이제 「예약일에 자동으로 올라감」', '예약일에 자동으로 올라감' in 줄(쪽, 폰, '시험라온').inner_text())

            # ── 주문수집 단추 — 예약일을 오늘로 당긴 B 가 올라간다 (서버 없음 토스트와 함께)
            쪽.evaluate("(m) => ZG.저장소.바꾸기(ZG.저장소.키.문자주문, m.B, { 예약일: m.오늘 })", m)
            쪽.click('button:has-text("📥 주문수집")'); 쪽.wait_for_timeout(600)
            본다('주문수집 단추 → B 자동 올림', 쪽.evaluate(하나, m['B'])['상태'] == '올림')

            # ── 두 기기 겹침 — 가짜 서버 (실서버 아님)
            겹 = 쪽.evaluate("""async () => {
              const 저 = ZG.저장소, 자 = ZG.문자주문자료, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
              const 새 = (이름, i) => { const r = 자.새로저장({ 받는분: 이름, 전화: '010333300' + i, 주소: '부산시 ' + 이름, 품목: [자.담을줄(ps[i])] }, true);
                저.바꾸기(저.키.문자주문, r.id, { 예약: true, 예약일: 오늘 }); return r.id; };
              const X = 새('시험겹엑스', 1), Y = 새('시험겹와이', 2), Z = 새('시험겹제트', 3);
              ZG.보내기.비우기();   // 서버 없이 쌓인 큐가 가짜 서버의 「올림」을 덮지 않게
              const 가짜 = {};
              저.읽기(저.키.문자주문).forEach(r => { 가짜[r.id] = { 내용: JSON.parse(JSON.stringify(r)), 삭제됨: false }; });
              가짜[X].내용.상태 = '올림';   // 남이 이미 올렸는데 이 기기는 아직 못 받음
              ZG.서버.클라이언트 = { from: (t) => ({
                select: () => ({ in: (k, ids) => Promise.resolve({ data: ids.filter(id => 가짜[id]).map(id => ({ id, 내용: JSON.parse(JSON.stringify(가짜[id].내용)), 삭제됨: 가짜[id].삭제됨 })) }) }),
                upsert: (행들) => { 행들.forEach(h => { if (t !== 'v3_문자주문') return;
                    가짜[h.id] = { 내용: JSON.parse(JSON.stringify(h.내용)), 삭제됨: h.삭제됨 };
                    // 다른 기기가 Z 를 0.3초 뒤에 잡는다(나중에 닿은 쪽이 이긴다)
                    if (h.id === Z && h.내용.자동 && h.내용.자동.기기 !== '다른기기')
                      setTimeout(() => { 가짜[Z].내용.자동 = { 기기: '다른기기', 때: Date.now() }; }, 300); });
                  return Promise.resolve({ error: null }); }
              }) };
              ZG.서버.켜짐 = true;
              const 답 = await ZG.예약자료.자동올리기();
              ZG.서버.켜짐 = false;
              return { 답, X: 자.하나(X).상태, Y: 자.하나(Y).상태, Z: 자.하나(Z).상태, Y잡음: !!(가짜[Y].내용.자동) };
            }""")
            본다('겹침: 서버가 이미 올림인 X 는 안 올림', 겹['X'] != '올림', 겹)
            본다('겹침: Y 는 잡고(서버에 자동 표) 올림', 겹['Y'] == '올림' and 겹['Y잡음'])
            본다('겹침: 남이 나중에 잡은 Z 는 안 올림', 겹['Z'] != '올림' and 겹['답']['올림'] == 1)

            # ── 주문 → 예약 넘기기 뒤 예약 탭으로 온다 (PC 만 — 폰 상세 경로는 18단계 시험)
            if not 폰:
                쪽.click('.stabs button:has-text("전체")'); 쪽.wait_for_timeout(300)
                쪽.evaluate("() => { const g = ZG.주문자료.건으로묶기(ZG.주문.줄들()).find(g => g.수령인 === '시험가람'); ZG.예약화면.넘기기창([g]); }")
                쪽.wait_for_timeout(300)
                쪽.click('.askbox .예약고름 button:has-text("날짜 미정")'); 쪽.click('.askbox button:has-text("예약으로 넘기기")'); 쪽.wait_for_timeout(2500)
                본다('넘기기 뒤 예약 탭 · 옮긴 줄 테두리', 쪽.locator('.stabs button.on:has-text("예약")').count() == 1 and 쪽.locator('.예약탭 .tr.방금:has-text("시험가람")').count() == 1)
                쪽.screenshot(path=str(여기 / '6-넘긴뒤-PC.png'), full_page=True)

            # ── 문자주문 탭 — 예약 갈래 걷힘, 목록은 그대로
            쪽.click('text=문자 >> nth=0' if 폰 else 'text=문자주문 >> nth=0'); 쪽.wait_for_timeout(300)
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)
            본다('문자주문 목록 뜸 · 예약 갈래 칩 없음', 쪽.locator('.문자주문').count() >= 1 and 쪽.locator('.fchip.예약').count() == 0)
            쪽.screenshot(path=str(여기 / ('7-문자주문목록-' + 이름 + '.png')))
            본다('콘솔 빨간 에러 없음', not 오류, 오류[:3])
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d / %d 통과' % (sum(결과), len(결과)))
