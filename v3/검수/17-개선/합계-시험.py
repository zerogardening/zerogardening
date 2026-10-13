# -*- coding: utf-8 -*-
# 17단계 ① 주문조회 합계 줄 — python3 v3/검수/17-개선/합계-시험.py
# 🔴 supabase CDN 을 막아 로컬 전용(서버 끈 상태)으로 띄운다
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '17-개선'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8791', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8791/%EC%A3%BC%EB%AC%B8.html'

손질심기 = """() => {
  const 건들 = ZG.주문자료.건으로묶기(ZG.주문.줄들());
  const g = 건들.find(g => g.줄들.some(r => r.묶음id));
  const r = g.줄들.find(r => r.묶음id);
  const 앞 = r.수령인.replace(/\\s/g,'') + '|주소#' + r.수령인주소.replace(/[\\s-]/g,'') + '|' + r.수령인전화.replace(/\\D/g,'');
  const 전 = ZG.운임손질.박스세기(건들);
  ZG.운임손질.저장(r.묶음id, 앞, 1, { 수령인: r.수령인, 단가: 0, 박스수: 3 });
  ZG.운임손질.저장(r.묶음id, 앞, 2, { 수령인: r.수령인, 단가: 0, 박스수: 2 });
  const 후 = ZG.운임손질.박스세기(건들);
  const 두번 = ZG.운임손질.박스세기(건들.concat([g]));
  ZG.주문.다시그리기();
  return { 건수: 건들.length, 전, 후, 두번, 총액: 건들.reduce((a, g) => a + g.총액, 0) };
}"""

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            print('\n' + ('폰' if 폰 else 'PC'))
            쪽 = 브.new_page(viewport={'width': 390, 'height': 900} if 폰 else {'width': 1440, 'height': 1000},
                             device_scale_factor=2 if 폰 else 1)
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_timeout(2000)
            쪽.evaluate("() => { ZG.시드.심기(); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(500)
            띠 = 쪽.query_selector('.합계띠')
            본다('합계 줄이 뜬다', 띠 is not None)
            값 = 쪽.evaluate(손질심기); 쪽.wait_for_timeout(500)
            본다('손질 없으면 박스 = 건수', 값['전'] == 값['건수'], 값)
            본다('차수1 박스3 + 차수2 박스2 → 건수+4', 값['후'] == 값['건수'] + 4, 값['후'])
            본다('같은 손질 행은 한 번만', 값['두번'] == 값['후'] + 1, 값['두번'])
            글 = 쪽.inner_text('.합계띠')
            본다('글에 건수·박스·금액', ('%d' % 값['건수']) in 글 and ('%d' % 값['후']) in 글 and format(값['총액'], ',') in 글, 글.replace('\n', ' '))
            쪽.screenshot(path=str(여기 / ('합계-' + ('폰' if 폰 else 'PC') + '.png')), full_page=not 폰)
            쪽.click('.search input'); 쪽.fill('.search input', 'zzzzz없는이름'); 쪽.wait_for_timeout(600)
            본다('0건이면 감춘다', 쪽.query_selector('.합계띠') is None)
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
