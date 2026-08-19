# -*- coding: utf-8 -*-
# 01c-보내기 고침 검수 (2026-08-19 사고 — onLine false 로 8/9부터 24건이 조용히 쌓였다)
#   python3 v3/검수/보내기고침-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 진짜 서버에 붙지 않는다. 가짜 클라이언트로 보내기 층만 시험한다.
import pathlib, json
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append((참, 이름, 덧))

껍데기 = """<!doctype html><meta charset="utf-8"><title>보내기 시험</title><body>
<script src="../js/01-저장소.js"></script>
<script>
  /* 01c 가 뜨기 전에 가짜 서버를 깔아 둔다 — 진짜 supabase 로 안 나간다 */
  window.보낸것 = []; window.멈춰있기 = false;
  window.ZG.서버 = { 켜짐: true, 클라이언트: { from: function (표) { return {
    upsert: function (행들) {
      window.보낸것.push({ 표: 표, 건수: 행들.length });
      if (window.멈춰있기) return new Promise(function () {});   // 응답도 실패도 없이 매달린다
      return Promise.resolve({ error: null });
    } }; } } };
</script>
<script src="../js/01c-보내기.js"></script>
</body>"""
(뿌리 / '검수' / '_보내기시험.html').write_text(껍데기, encoding='utf-8')
주소 = (뿌리 / '검수' / '_보내기시험.html').as_uri()

def 큐넣기(page, 건수, 나이초=0):
    page.evaluate("""([n, 나이]) => {
      const q = {}; const 이제 = Date.now();
      for (let i = 0; i < n; i++) q['품목|P' + i] = { 표: '품목', id: 'P' + i, 값: { 품목코드: 'P' + i }, 시각: 이제 - 나이 * 1000 };
      localStorage.setItem('zg.v3.보낼것', JSON.stringify(q));
    }""", [건수, 나이초])

with sync_playwright() as p:
    b = p.chromium.launch()
    잡힌오류 = []

    # ① 인터넷이 끊겼다고 잘못 알고 있어도(onLine false) 보낸다 — 이번 사고의 본체
    pg = b.new_page()
    pg.on('pageerror', lambda e: 잡힌오류.append(str(e)))
    pg.add_init_script("Object.defineProperty(navigator, 'onLine', { get: () => false });")
    pg.goto(주소); 큐넣기(pg, 3); pg.reload()
    본다('스크립트 문법·적재 오류 0건', not 잡힌오류, str(잡힌오류))
    본다('onLine=false 인데도 화면이 뜬다', pg.evaluate("navigator.onLine") is False)
    pg.evaluate("ZG.보내기.깨우기(); null"); pg.wait_for_timeout(300)
    본다('onLine=false 여도 서버로 보낸다', pg.evaluate("보낸것.length") == 1,
         str(pg.evaluate("보낸것")))
    본다('보낸 뒤 큐가 0건이 된다', pg.evaluate("ZG.보내기.건수()") == 0)

    # ② 보내기가 매달려 굳어도 한계(60초) 뒤에는 다시 건다
    pg2 = b.new_page(); pg2.on('pageerror', lambda e: 잡힌오류.append(str(e)))
    pg2.goto(주소); 큐넣기(pg2, 2); pg2.reload()
    pg2.evaluate("멈춰있기 = true; ZG.보내기.깨우기(); null"); pg2.wait_for_timeout(300)
    본다('매달린 요청도 일단 한 번은 나갔다', pg2.evaluate("보낸것.length") == 1)
    pg2.evaluate("멈춰있기 = false; ZG.보내기.깨우기(); null"); pg2.wait_for_timeout(200)
    본다('굳은 동안에는 겹쳐 보내지 않는다', pg2.evaluate("보낸것.length") == 1)
    # 시계를 60초 넘게 돌린 척한다
    pg2.evaluate("const 진짜 = Date.now; Date.now = () => 진짜() + 61000;")
    pg2.evaluate("ZG.보내기.깨우기(); null"); pg2.wait_for_timeout(300)
    본다('60초 넘게 안 끝나면 다시 건다 (굳음 풀림)', pg2.evaluate("보낸것.length") == 2,
         str(pg2.evaluate("보낸것")))

    # ③ 1분 넘게 못 올린 게 있으면 화면에 뜬다 / 방금 것은 안 뜬다
    pg3 = b.new_page(); pg3.on('pageerror', lambda e: 잡힌오류.append(str(e)))
    pg3.goto(주소); 큐넣기(pg3, 5, 나이초=120); pg3.reload()
    띠 = pg3.locator('.zg-못올림')
    본다('밀린 5건이 화면에 뜬다', 띠.count() == 1 and '5건' in 띠.inner_text(),
         띠.inner_text() if 띠.count() else '없음')
    pg3.evaluate("ZG.보내기.비우기()")
    본다('큐를 비우면 표시가 사라진다', pg3.locator('.zg-못올림').count() == 0)
    pg3.evaluate("ZG.저장소.덧붙이기('zg.v3.품목', { 품목코드: 'NEW01' })")
    본다('방금 저장한 것은 표시하지 않는다', pg3.locator('.zg-못올림').count() == 0)

    # ④ 눌러서 다시 보내기
    pg4 = b.new_page(); pg4.on('pageerror', lambda e: 잡힌오류.append(str(e)))
    pg4.goto(주소); 큐넣기(pg4, 2, 나이초=120); pg4.reload()
    pg4.locator('.zg-못올림').click(); pg4.wait_for_timeout(300)
    본다('눌렀더니 보내고 표시가 사라졌다',
         pg4.evaluate("보낸것.length") == 1 and pg4.locator('.zg-못올림').count() == 0)

    본다('네 판 통틀어 콘솔 오류 0건', not 잡힌오류, str(잡힌오류))
    b.close()

(뿌리 / '검수' / '_보내기시험.html').unlink()
for 참, 이름, 덧 in 결과:
    print(('✅' if 참 else '🔴') + ' ' + 이름 + (('  ← ' + 덧) if (덧 and not 참) else ''))
print('%d/%d 통과' % (sum(1 for r in 결과 if r[0]), len(결과)))
