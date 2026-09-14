# -*- coding: utf-8 -*-
# 재고 → 일자별 카드를 눌러 입고 한 건을 고칠 수 있는가 (2026-09-15 우람님)
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')

품목 = [
  {'품목코드': 'AAA01-15', '접두': 'AAA01', '유통명': '몬스테라', '학명': 'Monstera', '규격': '15cm', '상태': '판매중'},
  {'품목코드': 'BBB01-15', '접두': 'BBB01', '유통명': '스킨답서스', '학명': 'Epipremnum', '규격': '15cm', '상태': '판매중'},
]
입고 = [
  {'id': 'r1', '품목코드': 'AAA01-15', '입고일': '2026-08-10', '입고업체': '한아름농원', '유통명': '몬스테라',
   '학명': 'Monstera', '규격': '15cm', '수량': 10, '매입단가': 3000, '단가': 3000, '과세구분': '면세', '등록일시': 1},
  {'id': 'r2', '품목코드': 'BBB01-15', '입고일': '2026-08-10', '입고업체': '푸른들농원', '유통명': '스킨답서스',
   '학명': 'Epipremnum', '규격': '15cm', '수량': 7, '매입단가': 2000, '단가': 2000, '과세구분': '면세', '등록일시': 2},
]
심기 = ("localStorage.setItem('zg.v3.품목', %s);"
        "localStorage.setItem('zg.v3.입고', %s);"
        "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        % (json.dumps(json.dumps(품목, ensure_ascii=False)), json.dumps(json.dumps(입고, ensure_ascii=False))))

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(참); print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8781', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8781/index.html#재고'

def 일자별로(쪽):
    쪽.evaluate("""() => {
      const 목 = ZG.재고목록;
      목.상태.필터 = '일자별'; 목.상태.일자 = '2026-08-10'; 목.상태.일자범위 = null;
      목.상태.검색 = ''; 목.상태.업체 = '';
      ZG.재고.다시();
    }""")
    쪽.wait_for_timeout(250)

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()

        # ── PC ──
        print('\n[PC]')
        쪽 = 브.new_page(viewport={'width': 1440, 'height': 950})
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.add_init_script(심기)
        쪽.goto(주소); 쪽.wait_for_timeout(2000)
        일자별로(쪽)

        카드 = 쪽.locator('.ph-card')
        본다('일자별에 입고 카드가 2건 뜬다', 카드.count() == 2, 카드.count())
        본다('카드가 누를 수 있는 button 이다',
             쪽.evaluate("() => document.querySelector('.ph-card')?.tagName") == 'BUTTON')

        카드.first.click(); 쪽.wait_for_timeout(400)
        패널 = 쪽.locator('.editpanel')
        본다('카드를 누르니 입고 수정 창이 떴다', 패널.count() == 1)
        칸들 = 쪽.evaluate("""() => [...document.querySelectorAll('.editpanel input')]
              .map(i => (i.closest('.field')?.querySelector('label')?.textContent || i.name || i.type) + '=' + i.value)""")
        본다('누른 카드의 입고 건이 열렸다 (스킨답서스 7주 · 최근 등록 순)',
             any('스킨답서스' in c for c in 칸들) and any('수량' in c and '7' in c for c in 칸들), ' / '.join(칸들))

        # 수량을 고쳐 저장하면 뒤 목록도 갱신되는가
        쪽.evaluate("""() => {
          const i = [...document.querySelectorAll('.editpanel input')]
                      .find(x => (x.closest('.field')?.querySelector('label')?.textContent || '').indexOf('수량') >= 0);
          i.value = '12'; i.dispatchEvent(new Event('input', {bubbles:true}));
          i.dispatchEvent(new Event('change', {bubbles:true}));
        }""")
        저장 = 쪽.locator('.editpanel button', has_text='저장')
        저장.first.click(); 쪽.wait_for_timeout(400)
        if 쪽.locator('.askbox').count():          # 「정말 고칠까요」 확인창
            print('     확인창 단추:', 쪽.evaluate("() => [...document.querySelectorAll('.askbox button')].map(b=>b.textContent)"))
            쪽.locator('.askbox button').last.click(); 쪽.wait_for_timeout(700)
        if 쪽.locator('.editpanel').count():
            print('     [디버그] 패널이 남아 있다 · 오류칸=', 쪽.evaluate("() => [...document.querySelectorAll('.editpanel .err')].map(e=>e.textContent).filter(Boolean)"),
                  '· askbox=', 쪽.locator('.askbox').count(),
                  '· 토스트=', 쪽.evaluate("() => document.querySelector('.toast')?.textContent || ''"))
        본다('저장하니 창이 닫혔다', 쪽.locator('.editpanel').count() == 0)
        본다('일자별 목록 숫자가 12주로 바뀌었다',
             '12' in 쪽.locator('.ph-card').first.inner_text(), 쪽.locator('.ph-card').first.inner_text().replace('\n',' / '))
        저장값 = 쪽.evaluate("() => (ZG.저장소.읽기(ZG.저장소.키.입고).find(r=>r.id==='r2')||{}).수량")
        본다('저장소에도 12주로 들어갔다', str(저장값) == '12', 저장값)

        # 검색을 쳐도 일자별이 유지되는가
        쪽.evaluate("""() => { ZG.재고목록.상태.검색 = '몬스'; ZG.재고.목록다시(); }""")
        쪽.wait_for_timeout(300)
        본다('검색해도 일자별 목록이 그대로다 (1건)',
             쪽.locator('.ph-card').count() == 1 and 쪽.locator('.일자줄').count() == 1,
             '카드 %d · 일자줄 %d' % (쪽.locator('.ph-card').count(), 쪽.locator('.일자줄').count()))
        본다('PC 에러 없음', not 오류, 오류[:2])
        쪽.close()

        # ── 폰 ──
        print('\n[폰]')
        폰 = 브.new_page(viewport={'width': 390, 'height': 844})
        폰오류 = []
        폰.on('pageerror', lambda e: 폰오류.append(str(e)))
        폰.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        폰.add_init_script(심기)
        폰.goto(주소); 폰.wait_for_timeout(2000)
        일자별로(폰)
        카드2 = 폰.locator('.ph-card')
        본다('폰 일자별에 카드가 뜬다', 카드2.count() >= 1, 카드2.count())
        카드2.first.click(); 폰.wait_for_timeout(500)
        본다('폰에서 입고 수정 화면으로 넘어갔다',
             폰.evaluate("() => !!ZG.입고내부.상태.수정id") and 폰.locator('input').count() > 3)
        머리 = 폰.evaluate("() => ZG.재고.머리()")
        본다('머리 뒤로글이 「‹ 재고」다', 머리.get('뒤로글') == '‹ 재고', 머리.get('뒤로글'))
        # 뒤로 → 재고 일자별로 돌아온다
        폰.evaluate("() => ZG.입고수정.폰상세닫기()"); 폰.wait_for_timeout(500)
        본다('뒤로 누르면 재고 일자별로 돌아온다',
             폰.evaluate("() => !ZG.입고내부.상태.수정id") and 폰.locator('.ph-card').count() >= 1,
             폰.locator('.ph-card').count())
        본다('폰 에러 없음', not 폰오류, 폰오류[:2])
        폰.screenshot(path='/private/tmp/claude-501/-Users-zerogardening-claude-projects---------/56845f3b-d221-4bbd-8624-be5f5f5ffdab/scratchpad/폰-일자별.png')
        폰.close()
        브.close()
finally:
    서버.terminate()

print('\n%d/%d 통과' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
