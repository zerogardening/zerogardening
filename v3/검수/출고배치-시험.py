# -*- coding: utf-8 -*-
# 출고리스트 배치 칩 검수 (2026-09-02 우람님 지시
#   「배송준비중에서도 출고리스트를 · 배송완료 처리한 건별로도 출고리스트를」)
#   python3 v3/검수/출고배치-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 🔴 supabase CDN 을 막아 로컬 전용으로 띄운다 — 안 막으면 로그인 문지기가 무한 새로고침을 돈다.
# ① 자료 — 처리마다 도장이 찍히고, 배치별로 그때 나간 주문줄이 그대로 되나오는가
# ② 화면 — 출고리스트 창에 칩이 서고, 고르면 그 배치 것만 나오고, 거짓 「재고부족」이 안 뜨는가
# ③ 배송준비중 — 지난 배치를 만들어도 「지금 화면」은 여전히 아직 안 나간 것을 센다
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8779', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8779/%EC%A3%BC%EB%AC%B8.html'   # 주문.html

# 시드 주문줄을 둘로 갈라 배치 두 개를 만든다. 어제 것 하나 · 오늘 것 하나 —
# 🔴 이래야 「주문일자로는 안 갈리는데 배치로는 갈린다」가 시험된다(주문일은 셋 다 오늘이다).
만들기 = """() => {
  const 저 = ZG.저장소, 키 = 저.키;
  const 줄들 = ZG.주문자료.읽기({}).filter(r => r.품목코드);
  const 갑 = 줄들.slice(0, 2), 을 = 줄들.slice(2, 5);
  const A = ZG.배송완료.새배치(), B = ZG.배송완료.새배치();
  const 오늘 = ZG.ui.오늘문자();
  const 어제 = ZG.계산.날짜문자(Date.parse(오늘) - 86400000);
  ZG.배송완료.출고넣기(갑, 어제, null, { 배치: A });
  ZG.배송완료.출고넣기(을, 오늘, null, { 배치: B });
  // 같은 밀리초에 만들어져 차례가 흔들리지 않게 시각을 손으로 못박는다
  저.읽기(키.출고).forEach(r => {
    if (r.배치 === A) 저.바꾸기(키.출고, r.id, Object.assign({}, r, { 등록일시: 1000 }));
    if (r.배치 === B) 저.바꾸기(키.출고, r.id, Object.assign({}, r, { 등록일시: 2000 }));
  });
  return { A, B, 오늘, 어제, 갑: 갑.map(r => r.id), 을: 을.map(r => r.id),
           갑건: new Set(갑.map(r => r.id)).size, 을건: new Set(을.map(r => r.id)).size };
}"""

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        print('\n① 자료 — 배치 도장')
        쪽 = 브.new_page(viewport={'width': 1440, 'height': 900})
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(2200)
        # 🔴 로그인 표를 심어 문지기를 지나가면 저장소.부팅()이 목데이터를 안 심는다(01-저장소:199).
        #    시험은 주문줄이 있어야 성립하므로 여기서 손으로 심는다.
        쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(600)

        만든 = 쪽.evaluate(만들기)
        목록 = 쪽.evaluate("() => ZG.배송완료.배치목록(5)")
        본다('배치 두 개가 잡힌다', len(목록) == 2, len(목록))
        본다('새것이 앞이다', 목록 and 목록[0]['배치'] == 만든['B'], [t['출고일'] for t in 목록])
        본다('건수를 주문 단위로 센다',
             목록[0]['건수'] == 만든['을건'] and 목록[1]['건수'] == 만든['갑건'],
             [t['건수'] for t in 목록])

        갑줄 = 쪽.evaluate("(a) => ZG.배송완료.배치줄들(a).map(r => r.id).sort()", 만든['A'])
        본다('배치줄들이 그때 나간 줄만 돌려준다', 갑줄 == sorted(만든['갑']), 갑줄)
        본다('없는 배치는 빈손', 쪽.evaluate("() => ZG.배송완료.배치줄들('없다').length") == 0)

        print('\n② 화면 — 출고리스트 창의 칩')
        쪽.click("button:has-text('📋 출고리스트')"); 쪽.wait_for_timeout(500)
        칩글 = 쪽.eval_on_selector_all('.배치칩 .fchip', 'els => els.map(e => e.textContent)')
        본다('칩이 「지금 화면」 + 배치 2개', len(칩글) == 3 and 칩글[0] == '지금 화면', 칩글)
        어제글 = 만든['어제'][5:].replace('-', '/')
        본다('오늘 배치는 「오늘」로, 지난 배치는 날짜로 적힌다',
             칩글[1].startswith('오늘') and 칩글[2].startswith(어제글), [칩글[1:], 어제글])
        본다('처음엔 「지금 화면」이 켜져 있다',
             쪽.eval_on_selector('.배치칩 .fchip.on', 'e => e.textContent') == '지금 화면')

        # 지난 배치(갑)를 고른다 — 맨 뒤 칩
        쪽.click('.배치칩 .fchip:last-child'); 쪽.wait_for_timeout(400)
        코드 = 쪽.eval_on_selector_all('.pcsheet .bd table tr td.code', 'els => els.map(e => e.textContent).sort()')
        참코드 = 쪽.evaluate("(ids) => [...new Set(ZG.주문자료.읽기({}).filter(r => ids.includes(r.id)).map(r => r.품목코드))].sort()",
                            만든['갑'])
        본다('고른 배치의 품목만 나온다', 코드 == 참코드, [코드, 참코드])
        본다('창 머리가 어느 처리분인지 말한다',
             '배송완료 처리분' in 쪽.eval_on_selector('.pcsheet .hd .hint', 'e => e.textContent'),
             쪽.eval_on_selector('.pcsheet .hd .hint', 'e => e.textContent'))
        # 🔴 이미 깎인 재고로 재는 거짓 「재고부족」이 뜨면 포장할 때 헛걸음하신다
        본다('지난 배치에는 재고부족이 안 뜬다',
             쪽.eval_on_selector_all('.pcsheet .bd .chip.out', 'els => els.length') == 0)
        # 🔴 재고 0 에 「충분」이 찍히면 그것도 거짓말이다 — 지난 배치는 재고칸을 통째로 비운다
        재고칸 = 쪽.eval_on_selector_all('.pcsheet .bd table tr td:nth-child(4)', 'els => els.map(e => e.textContent)')
        상태칸 = 쪽.eval_on_selector_all('.pcsheet .bd table tr td .chip', 'els => els.map(e => e.textContent)')
        본다('지난 배치는 재고칸이 「—」', 재고칸 and all(t == '—' for t in 재고칸), 재고칸)
        본다('지난 배치는 상태가 「나감」', 상태칸 and all(t == '나감' for t in 상태칸), 상태칸)

        쪽.click('.배치칩 .fchip:first-child'); 쪽.wait_for_timeout(400)
        본다('「지금 화면」으로 돌아온다',
             '배송완료 처리분' not in 쪽.eval_on_selector('.pcsheet .hd .hint', 'e => e.textContent'))

        print('\n③ 배송준비중은 그대로다')
        쪽.keyboard.press('Escape'); 쪽.wait_for_timeout(300)
        # 🔴 목데이터 주문줄에는 카페24상태가 없어 「준비중」 판정이 아예 안 선다(00-시드).
        #    실데이터는 100% 들어 있으므로 시험에서만 채워 준다.
        남은 = 쪽.evaluate("""() => {
          const 저 = ZG.저장소;
          저.읽기(저.키.주문).forEach(r => 저.바꾸기(저.키.주문, r.id, Object.assign({}, r, { 카페24상태: '배송준비중' })));
          const 상 = ZG.주문.상태; 상.상태칩 = '준비중'; ZG.주문.다시그리기();
          return ZG.주문자료.출고리스트(ZG.주문.줄들()).reduce((a, t) => a + t.필요, 0);
        }""")
        본다('아직 안 나간 것의 출고리스트가 나온다', 남은 > 0, 남은)
        나간것 = 쪽.evaluate("(ids) => ZG.주문.줄들().some(r => ids.includes(r.id))", 만든['갑'])
        본다('이미 나간 줄은 「지금 화면」에서 빠진다', not 나간것)

        본다('콘솔 오류 0', not 오류, 오류[:2])

        print('\n④ 폰에서도 같은 칩이 선다')
        폰 = 브.new_page(viewport={'width': 390, 'height': 844})
        폰오류 = []
        폰.on('pageerror', lambda e: 폰오류.append(str(e)))
        폰.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        폰.add_init_script(심기)
        폰.goto(주소); 폰.wait_for_timeout(2200)
        폰.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }"); 폰.wait_for_timeout(600)
        폰만든 = 폰.evaluate(만들기)
        폰.click("button:has-text('📋 출고리스트')"); 폰.wait_for_timeout(500)
        폰칩 = 폰.eval_on_selector_all('.배치칩 .fchip', 'els => els.map(e => e.textContent)')
        본다('폰에도 칩 3개', len(폰칩) == 3 and 폰칩[0] == '지금 화면', 폰칩)
        폰.click('.배치칩 .fchip:last-child'); 폰.wait_for_timeout(500)
        본다('폰 머리글도 어느 처리분인지 말한다',
             '배송완료 처리분' in 폰.eval_on_selector('.ph-sub', 'e => e.textContent'),
             폰.eval_on_selector('.ph-sub', 'e => e.textContent'))
        폰코드 = 폰.eval_on_selector_all('table.mini tr td.code', 'els => els.map(e => e.textContent).sort()')
        본다('폰도 고른 배치 것만 나온다', len(폰코드) > 0 and 폰코드 == sorted(set(폰코드)), 폰코드)
        본다('폰 콘솔 오류 0', not 폰오류, 폰오류[:2])

        print('\n⑤ 도장을 찍는 자리가 그대로 있나')
        # 🔴 출고를 만드는 세 자리 중 하나라도 배치를 안 넘기면, 그 처리분은 영영 칩으로 안 뜬다
        원 = (뿌리 / 'js')
        자리 = []
        for f in ['08g-배송완료창.js', '08n-수동배송완료.js']:
            for 줄 in (원 / f).read_text(encoding='utf-8').splitlines():
                if '출고넣기(' in 줄 and 'function' not in 줄:
                    자리.append((f, '배치' in 줄))
        본다('출고넣기 부르는 자리 3곳 전부 배치를 넘긴다',
             len(자리) == 3 and all(t[1] for t in 자리), 자리)

        브.close()
finally:
    서버.terminate()

print('\n%d/%d' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
