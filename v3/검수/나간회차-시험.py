# -*- coding: utf-8 -*-
# 배송완료 회차 검수 (2026-09-03 우람님 지시
#   「배송완료 화면에 그날 처리한 회차가 뜨고 · 회차를 누르면 그 회차 리스트가 나오고
#     거기서 출고리스트를 누르면 그 회차의 출고리스트」)
#   python3 v3/검수/나간회차-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 안 막으면 로그인 문지기가 무한 새로고침을 돈다.
# ① 나간 날 — 그저께 들어온 주문을 오늘 보내면 오늘 배송완료 화면에 뜨는가 (전에는 안 떴다)
# ② 회차 칩 — 그날 처리한 회차가 서고, 고르면 그 회차 것만 남는가
# ③ 출고리스트 — 고른 회차를 들고 창이 열리는가
# ④ 서비스 줄 — 배치줄들이 그 건의 서비스를 데려오는가 (안 데려오면 안 싸서 나간다)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8781', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8781/%EC%A3%BC%EB%AC%B8.html'   # 주문.html

# 🔴 주문은 전부 **그저께** 들어온 것으로 돌리고, 발송만 오늘 두 번에 나눠 한다.
#    주문일자로 거르는 옛 코드에서는 오늘 화면이 0건이 되는 배치다 — 그게 이 시험의 요점이다.
만들기 = """() => {
  const 저 = ZG.저장소, 키 = 저.키;
  const 오늘 = ZG.ui.오늘문자();
  const 그저께 = ZG.계산.날짜문자(Date.parse(오늘) - 2 * 86400000);
  // 기준일은 올린날이 있으면 올린날이다 — 둘 다 돌려놔야 기간에서 빠진다
  저.읽기(키.주문묶음).forEach(b => 저.바꾸기(키.주문묶음, b.id, Object.assign({}, b, { 올린날: 그저께 })));
  저.읽기(키.주문).forEach(r => 저.바꾸기(키.주문, r.id, Object.assign({}, r, { 주문일: 그저께 })));

  const 줄들 = ZG.주문자료.읽기({}).filter(r => r.품목코드 && r.서비스 !== true);
  const 갑 = 줄들.slice(0, 2), 을 = 줄들.slice(2, 5);
  const A = ZG.배송완료.새배치(), B = ZG.배송완료.새배치();
  ZG.배송완료.출고넣기(갑, 오늘, null, { 배치: A });
  ZG.배송완료.출고넣기(을, 오늘, null, { 배치: B });
  저.읽기(키.출고).forEach(r => {
    if (r.배치 === A) 저.바꾸기(키.출고, r.id, Object.assign({}, r, { 등록일시: 1000 }));
    if (r.배치 === B) 저.바꾸기(키.출고, r.id, Object.assign({}, r, { 등록일시: 2000 }));
  });
  const 상 = ZG.주문.상태;
  상.부터 = 오늘; 상.까지 = 오늘; 상.날짜 = 오늘; 상.기간칩 = '오늘'; 상.상태칩 = '나감'; 상.출고배치 = '';
  ZG.주문.다시그리기();
  return { A, B, 오늘, 그저께, 갑: 갑.map(r => r.id), 을: 을.map(r => r.id) };
}"""

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        print('\n① 나간 날로 거른다')
        쪽 = 브.new_page(viewport={'width': 1440, 'height': 900})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(2200)
        쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(600)
        만든 = 쪽.evaluate(만들기); 쪽.wait_for_timeout(500)

        온것 = 쪽.evaluate("() => ZG.주문.줄들().map(r => r.id)")
        보낸것 = 만든['갑'] + 만든['을']
        본다('그저께 주문·오늘 발송이 오늘 배송완료 화면에 뜬다',
             sorted(온것) == sorted(보낸것), [len(온것), len(보낸것)])
        주문일로 = 쪽.evaluate("(오늘) => ZG.주문자료.읽기({ 부터: 오늘, 까지: 오늘 }).length", 만든['오늘'])
        본다('주문일자로 걸렀다면 0건이었다 (이게 안 뜨던 이유다)', 주문일로 == 0, 주문일로)

        print('\n② 회차 칩')
        칩글 = 쪽.eval_on_selector_all('.나간칩', 'els => els.map(e => e.textContent)')
        본다('칩이 「전체」 + 회차 2개', len(칩글) == 3 and 칩글[0] == '전체', 칩글)
        본다('이른 것이 1회차, 나중 것이 2회차',
             '1회차' in 칩글[1] and '2회차' in 칩글[2], 칩글[1:])
        본다('처음엔 「전체」가 켜져 있다',
             쪽.eval_on_selector('.나간칩.on', 'e => e.textContent') == '전체')

        쪽.click("button.나간칩:has-text('1회차')"); 쪽.wait_for_timeout(400)
        일회차 = 쪽.evaluate("() => ZG.주문.줄들().map(r => r.id)")
        본다('1회차를 누르면 그 회차 것만 남는다', sorted(일회차) == sorted(만든['갑']), 일회차)
        본다('고른 칩에 불이 들어온다',
             '1회차' in 쪽.eval_on_selector('.나간칩.on', 'e => e.textContent'))

        print('\n③ 그대로 출고리스트')
        쪽.click("button:has-text('📋 출고리스트')"); 쪽.wait_for_timeout(500)
        머리 = 쪽.eval_on_selector('.pcsheet .hd .hint', 'e => e.textContent')
        본다('창 머리가 그 회차의 처리분이라고 말한다', '배송완료 처리분' in 머리, 머리)
        코드 = 쪽.eval_on_selector_all('.pcsheet .bd table tr td.code', 'els => els.map(e => e.textContent).sort()')
        참코드 = 쪽.evaluate("(ids) => [...new Set(ZG.주문자료.읽기({}).filter(r => ids.includes(r.id)).map(r => r.품목코드))].sort()",
                            만든['갑'])
        본다('그 회차의 품목만 나온다', 코드 == 참코드, [코드, 참코드])
        쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(300)

        print('\n④ 탭을 옮기면 회차가 풀린다')
        쪽.click("button.fchip:has-text('배송준비중')"); 쪽.wait_for_timeout(400)
        본다('배송준비중으로 가면 고른 회차가 풀린다',
             쪽.evaluate("() => ZG.주문.상태.출고배치") == '')
        본다('회차 칩줄이 사라진다',
             쪽.eval_on_selector_all('.나간칩', 'els => els.length') == 0)
        본다('콘솔 오류 0', not 오류, 오류[:2])

        print('\n⑤ 서비스 줄은 그 회차에 딸려온다')
        쪽.click("button.fchip:has-text('배송완료')"); 쪽.wait_for_timeout(400)
        붙음 = 쪽.evaluate("""(a) => {
          const 저 = ZG.저장소, 키 = 저.키;
          const 본 = ZG.배송완료.배치줄들(a)[0];
          const 서 = Object.assign({}, 본, { id: ZG.주문자료.새id(), 서비스: true, 품목코드: 'SVC-1', 수량: 1 });
          저.덧붙이기(키.주문, 서);
          저.덧붙이기(키.출고, { 출고일: 본.주문일, 품목코드: 'SVC-1', 수량: 1,
                               출처: '서비스', 주문id: 서.id, 등록일시: Date.now() });
          return ZG.배송완료.배치줄들(a).some(r => r.id === 서.id);
        }""", 만든['A'])
        본다('배치줄들이 그 건의 서비스 줄을 데려온다', 붙음)

        print('\n⑥ 폰')
        폰 = 브.new_page(viewport={'width': 390, 'height': 844})
        폰오류 = []
        폰.on('pageerror', lambda e: 폰오류.append(str(e)))
        폰.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        폰.add_init_script(심기)
        폰.goto(주소); 폰.wait_for_timeout(2200)
        폰.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }"); 폰.wait_for_timeout(600)
        폰만든 = 폰.evaluate(만들기); 폰.wait_for_timeout(500)
        폰칩 = 폰.eval_on_selector_all('.나간칩줄 .나간칩', 'els => els.map(e => e.textContent)')
        본다('폰에도 「전체」 + 회차 2개', len(폰칩) == 3 and 폰칩[0] == '전체', 폰칩)
        폰.click("button.나간칩:has-text('1회차')"); 폰.wait_for_timeout(400)
        폰줄 = 폰.evaluate("() => ZG.주문.줄들().map(r => r.id)")
        본다('폰도 그 회차 것만 남는다', sorted(폰줄) == sorted(폰만든['갑']), 폰줄)
        폰.click("button:has-text('📋 출고리스트')"); 폰.wait_for_timeout(600)
        본다('폰 출고리스트도 그 회차를 들고 간다',
             '배송완료 처리분' in 폰.eval_on_selector('.ph-sub', 'e => e.textContent'),
             폰.eval_on_selector('.ph-sub', 'e => e.textContent'))
        본다('폰 콘솔 오류 0', not 폰오류, 폰오류[:2])

        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
