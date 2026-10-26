# -*- coding: utf-8 -*-
# 배송보류 카드 「주문취소」 단추 (10/26 우람님) — python3 v3/검수/38-보류취소/보류취소-시험.py
# v3 안에서만: 보류 풀고 `취소` 표시 · 출고·재고·카페24 안 건드림 · 배송준비중·출고 관문에서 빠짐 · 매출·재구매에서 빠짐
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막는다. 실서버 안 씀
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '38-보류취소'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

포트 = '8831'
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', 포트, '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:%s/%%EC%%A3%%BC%%EB%%AC%%B8.html' % 포트

# 보류 묶음 둘: A = 카페24 손님(상품 2줄 + 같은 주문 서비스 1줄 · 취소할 것) · B = 수동 손님(넘기기 회귀)
심기자료 = """() => {
  const 저 = ZG.저장소, ps = 저.품목들(), 오늘 = ZG.ui.오늘문자();
  const 줄 = (id, 덧) => 저.덧붙이기(저.키.주문, Object.assign({ id: id, 주문일: 오늘, 수령인주소: '서울시 시험로 1', 주문수량: 1, 단가: 10000 }, 덧));
  const p0 = ps[0], p1 = ps[1], p2 = ps[2];
  const A = { 주문번호: 'CAF-1', 판매처: '카페24', 출처: '카페24', 카페24상태: '배송준비중', 수령인: '김취소', 수령인전화: '010-1111-2222', 우편번호: '12345',
              보류: true, 보류송장: '55500000001', 보류일: 오늘 };
  줄('o_취소A1', Object.assign({}, A, { 품목코드: p0.품목코드, 유통명: p0.유통명, 규격: p0.규격 || '', 주문수량: 2 }));
  줄('o_취소A2', Object.assign({}, A, { 품목코드: p1.품목코드, 유통명: p1.유통명, 규격: p1.규격 || '' }));
  const 서 = Object.assign({}, A, { 품목코드: p2.품목코드, 유통명: p2.유통명, 서비스: true, 단가: 0 });
  delete 서.보류; delete 서.보류송장; delete 서.보류일;
  줄('o_취소A서', 서);
  저.덧붙이기(저.키.출고, { id: 'out_취소A서', 주문id: 'o_취소A서', 품목코드: p2.품목코드, 수량: 1, 출고일: 오늘 });  // 08e 가 넣을 때 만드는 서비스 출고
  줄('o_넘김B1', { 주문번호: 'MAN-1', 판매처: '수동', 출처: '수동', 수령인: '박넘김', 수령인전화: '010-3333-4444', 우편번호: '54321',
                   품목코드: p0.품목코드, 유통명: p0.유통명, 규격: p0.규격 || '', 보류: true, 보류송장: '55500000002', 보류일: 오늘 });
  return ZG.배송보류.건들().length;
}"""
줄값 = "(id) => { const r = ZG.저장소.읽기(ZG.저장소.키.주문).find(x => x.id === id); return r ? { 보류: r.보류, 취소: r.취소 === true, 취소일: r.취소일 || '', 송장: r.보류송장 || '' } : null; }"
출고수 = "() => ZG.저장소.읽기(ZG.저장소.키.출고).length"

def 새쪽(브, 폰):
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                     device_scale_factor=2 if 폰 else 1, service_workers='block')
    쪽._오류 = []
    쪽.on('pageerror', lambda e: 쪽._오류.append(str(e)))
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text and 'supabase' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
    쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기)
    return 쪽

def 열기(쪽):
    쪽.goto(주소); 쪽.wait_for_load_state('networkidle')
    쪽.wait_for_function("() => window.ZG && ZG.보류목록 && ZG.배송보류 && ZG.주문")
    쪽.evaluate("() => { ZG.시드.심기(); }")
    return 쪽.evaluate(심기자료)

def 탭(쪽, 글):
    쪽.locator('.stabs [role=tab]', has_text=글).first.click(); 쪽.wait_for_timeout(300)

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        print('\nPC 1440')
        쪽 = 새쪽(브, False)
        본다('보류 묶음 2건 심음', 열기(쪽) == 2)
        탭(쪽, '배송보류')
        카드 = 쪽.locator('.보류판 .oc')
        본다('보류 카드 2장', 카드.count() == 2, 카드.count())
        A카드 = 쪽.locator('.보류판 .oc', has_text='김취소')
        본다('카드에 「주문취소」·「✋ 배송완료로 넘기기」 둘 다', A카드.locator('.보류취소').count() == 1 and A카드.locator('.보류넘김').count() == 1)
        본다('PC 단추는 송장 줄 한 줄 안(오른쪽)', A카드.locator('.tv .보류단추 .보류취소').count() == 1)
        출고앞 = 쪽.evaluate(출고수)
        쪽.screenshot(path=str(여기 / '1-보류카드-PC.png'), full_page=False)

        # ① 확인창 → 그대로 두기: 아무것도 안 바뀜
        A카드.locator('.보류취소').click(); 쪽.wait_for_timeout(200)
        창 = 쪽.locator('.askbox')
        글 = 창.inner_text() if 창.count() else ''
        본다('확인창 뜸 · 「카페24·마켓 주문취소는 각 마켓에서 직접」 한 줄', '각 마켓에서 직접 해 주세요' in 글, 글.replace('\n', ' / ')[:160])
        본다('확인창에 손님·품목 표(김취소)', '김취소' in 글)
        쪽.screenshot(path=str(여기 / '2-확인창-PC.png'), full_page=False)
        창.locator('button', has_text='그대로 두기').click(); 쪽.wait_for_timeout(200)
        본다('그대로 두기 → 보류 그대로', 쪽.evaluate(줄값, 'o_취소A1')['보류'] is True and not 쪽.evaluate(줄값, 'o_취소A1')['취소'])

        # ② 주문취소
        A카드.locator('.보류취소').click(); 쪽.wait_for_timeout(200)
        쪽.locator('.askbox button', has_text='주문취소').click(); 쪽.wait_for_timeout(400)
        a1, a2, 서 = [쪽.evaluate(줄값, i) for i in ('o_취소A1', 'o_취소A2', 'o_취소A서')]
        오늘 = 쪽.evaluate("() => ZG.ui.오늘문자()")
        본다('상품 줄 둘 → 보류 풀림 · 취소 · 취소일=오늘', all(x['보류'] is False and x['취소'] and x['취소일'] == 오늘 for x in (a1, a2)), (a1, a2))
        본다('보류송장은 남김(되짚을 근거)', a1['송장'] == '55500000001')
        본다('서비스 줄은 손대지 않음', 서['취소'] is False, 서)
        본다('출고 그대로(재고 안 건드림)', 쪽.evaluate(출고수) == 출고앞, (출고앞, 쪽.evaluate(출고수)))
        본다('보류 탭 카드 1장(박넘김만)', 쪽.locator('.보류판 .oc').count() == 1 and 쪽.locator('.보류판 .oc', has_text='김취소').count() == 0)
        본다('08u 건들 1', 쪽.evaluate("() => ZG.배송보류.건들().length") == 1)

        # ③ 관문 — 배송준비중·출고
        def 준비중():
            탭(쪽, '배송준비중')
            쪽.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")   # 토스트 글(김취소 …) 빼고 목록만
            return 쪽.locator('body').inner_text()
        글 = 준비중()
        본다('배송준비중 탭에 김취소 없음(상품·서비스 줄 모두)', '김취소' not in 글)
        넘 = 쪽.evaluate("() => { const B = ZG.배송완료, 줄 = ZG.저장소.읽기(ZG.저장소.키.주문).filter(r => r.주문번호 === 'CAF-1'); const 갈 = B.넘길줄만(줄, B.색인만들기()); return { 넘길: 갈.넘길.length, 사유: 갈.걸린.map(c => c.사유).sort() }; }")
        본다('08f 넘길줄만: 넘길 0 · 사유 취소·취소·서비스', 넘['넘길'] == 0 and 넘['사유'] == ['서비스', '취소', '취소'], 넘)
        # 주문수집(edge)이 카페24상태를 「배송준비중」으로 다시 덮어도 — 따로 칸이라 그대로
        쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).filter(r => r.주문번호 === 'CAF-1').forEach(r => ZG.저장소.바꾸기(ZG.저장소.키.주문, r.id, { 카페24상태: '배송준비중', 상태확인: Date.now() }))")
        탭(쪽, '전체'); 글 = 준비중()
        본다('수집이 카페24상태 덮은 뒤에도 배송준비중에 안 돌아옴', '김취소' not in 글)
        본다('배송준비중 탭 숫자 0(박넘김은 보류)', 쪽.locator('.stabs [role=tab]', has_text='배송준비중').locator('.n').inner_text().strip() == '0',
             쪽.locator('.stabs [role=tab]', has_text='배송준비중').inner_text())

        # ④ 매출·재구매
        실 = 쪽.evaluate("""() => { const 줄 = ZG.저장소.읽기(ZG.저장소.키.주문), 오늘 = ZG.ui.오늘문자();
          const 셈 = ZG.주문실적.모으기(줄.filter(r => r.주문번호 === 'CAF-1' || r.주문번호 === 'MAN-1'), { 부터: 오늘, 까지: 오늘, 단위: '일' });
          return { 매출: 셈.합계.매출, 취소: 셈.뺀줄.취소, 취소인가: ZG.주문실적.취소인가(줄.find(r => r.id === 'o_취소A1')),
                   산줄: ZG.주문자료.산줄인가(줄.find(r => r.id === 'o_취소A1')), 산줄B: ZG.주문자료.산줄인가(줄.find(r => r.id === 'o_넘김B1')) }; }""")
        본다('08r 취소인가 = 참', 실['취소인가'] is True)
        본다('실적 모으기: 매출 10,000(박넘김만) · 뺀 취소 2줄', 실['매출'] == 10000 and 실['취소'] == 2, 실)
        본다('재구매 산줄인가: 취소 줄 거짓 · 보류 줄 참', 실['산줄'] is False and 실['산줄B'] is True)

        # ⑤ 전체 탭 배지 「주문취소」(그 건 찾아볼 길)
        탭(쪽, '전체')
        본다('전체 탭 김취소 건에 「주문취소」 배지', 쪽.locator('.hold', has_text='주문취소').count() >= 1)
        쪽.screenshot(path=str(여기 / '3-전체탭배지-PC.png'), full_page=False)

        # ⑥ 회귀 — ✋ 넘기기는 그대로 (수동 손님 · 카페24 송장 없음 → 출고 1줄 생김)
        탭(쪽, '배송보류')
        쪽.locator('.보류판 .oc', has_text='박넘김').locator('.보류넘김').click(); 쪽.wait_for_timeout(200)
        제 = 쪽.locator('.askbox').inner_text()
        본다('넘기기 확인창 그대로(배송완료로 넘길까요)', '배송완료로 넘길까요' in 제, 제.split('\n')[0])
        쪽.locator('.askbox button', has_text='넘기기').click(); 쪽.wait_for_timeout(600)
        본다('넘기기 → 출고 1줄 늘고 보류 0건', 쪽.evaluate(출고수) == 출고앞 + 1 and 쪽.evaluate("() => ZG.배송보류.건들().length") == 0)
        본다('PC 콘솔 오류 0(단추 누른 뒤)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()

        print('\n폰 390')
        쪽 = 새쪽(브, True)
        열기(쪽)
        탭(쪽, '배송보류')
        A = 쪽.locator('.oc', has_text='김취소')
        본다('폰 카드에 주문취소·넘기기 둘 다', A.locator('.보류취소').count() == 1 and A.locator('.보류넘김').count() == 1)
        상자 = [A.locator(s).bounding_box() for s in ('.보류취소', '.보류넘김')]
        본다('폰 두 단추 한 줄 · 화면 안(390)', abs(상자[0]['y'] - 상자[1]['y']) < 4 and 상자[1]['x'] + 상자[1]['width'] <= 390, 상자)
        넓 = 쪽.evaluate("() => document.documentElement.scrollWidth")
        본다('폰 가로 넘침 없음', 넓 <= 390, 넓)
        쪽.screenshot(path=str(여기 / '4-보류카드-폰.png'), full_page=False)
        A.locator('.보류취소').click(); 쪽.wait_for_timeout(200)
        쪽.screenshot(path=str(여기 / '5-확인창-폰.png'), full_page=False)
        쪽.locator('.askbox button', has_text='주문취소').click(); 쪽.wait_for_timeout(400)
        본다('폰 주문취소 → 보류 1건 남음', 쪽.evaluate("() => ZG.배송보류.건들().length") == 1 and 쪽.evaluate(줄값, 'o_취소A1')['취소'])
        본다('폰 콘솔 오류 0(단추 누른 뒤)', not 쪽._오류, 쪽._오류[:3])
        쪽.close()
        브.close()
finally:
    서버.terminate(); 서버.wait()

print('\n%d/%d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
