# -*- coding: utf-8 -*-
# 17단계 ② 작업중 검색칸 — python3 v3/검수/17-개선/검색-시험.py  (로컬 전용, 서버 끈 상태)
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '17-개선'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8792', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8792/index.html'

def 칩(쪽):
    return 쪽.eval_on_selector_all('.갈래칩 .fchip .n', 'es => es.map(e => +e.textContent)')

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n' + 이름)
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 900},
                             device_scale_factor=2 if 폰 else 1)
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_timeout(2000)
            쪽.evaluate("() => { ZG.시드.심기(); }")
            # 시드 품목 중 둘을 완료로 보낸다 — 검색이 완료 쪽에도 걸리는지 보려고
            쪽.evaluate("""() => { const ps = ZG.사진수집.대기품목(false, false);
              ps.slice(0, 2).forEach(p => ZG.저장소.바꾸기(ZG.저장소.키.품목, p.품목코드, { 사진뺌: true })); }""")
            쪽.click('.속탭 button:has-text("작업중")' if 폰 else 'text=작업중 >> nth=0'); 쪽.wait_for_timeout(600)
            본다('검색칸이 있다', 쪽.query_selector('.사진대기 .search input') is not None)
            전 = 칩(쪽)
            쪽.screenshot(path=str(여기 / ('검색-1-빈칸-' + 이름 + '.png')))
            칸 = 쪽.query_selector('.사진대기 .search input')
            모든 = 쪽.evaluate("() => ZG.사진수집.대기품목(false, false).concat(ZG.사진수집.대기품목(true, false)).map(p => [p.품목코드, p.유통명, p.학명])")
            찾 = 모든[-1][1][:2]
            기대 = 쪽.evaluate("""(찾) => { const n = v => String(v||'').toLowerCase().replace(/\\s/g,'');
              const f = b => ZG.사진수집.대기품목(b, false).filter(p => n(p.품목코드+p.유통명+p.학명).indexOf(n(찾)) >= 0).length;
              return [f(false), f(true)]; }""", 찾)
            칸.click(); 칸.type(찾, delay=60); 쪽.wait_for_timeout(500)
            본다('치는 동안 검색칸이 안 갈린다', 쪽.evaluate("(e) => e.isConnected && document.activeElement === e", 칸))
            본다('칩 숫자 = 찾은 건수', 칩(쪽) == 기대, [전, 칩(쪽), 기대, 찾])
            본다('✕ 가 보인다', 쪽.is_visible('.사진대기 .지움'))
            쪽.screenshot(path=str(여기 / ('검색-2-찾음-' + 이름 + '.png')))
            쪽.click('.갈래칩 .fchip >> nth=1'); 쪽.wait_for_timeout(400)
            본다('완료로 가도 검색어가 걸린다', 칩(쪽) == 기대 and 칸.input_value() == 찾 and len(쪽.query_selector_all('.사진대기 .ph-card, .사진대기 tbody tr')) == 기대[1])
            본다('mark 로 감싼다', len(쪽.query_selector_all('.사진대기 mark')) > 0)
            쪽.screenshot(path=str(여기 / ('검색-2b-완료쪽-' + 이름 + '.png')))
            쪽.click('.갈래칩 .fchip >> nth=0'); 쪽.wait_for_timeout(300)
            칸.fill('zzqq없음'); 칸.dispatch_event('input'); 쪽.wait_for_timeout(500)
            본다('못 찾으면 문구', '찾는 품목이 없습니다' in 쪽.inner_text('.사진대기') and 쪽.is_visible('.사진거름'))
            쪽.screenshot(path=str(여기 / ('검색-3-없음-' + 이름 + '.png')))
            쪽.click('.사진대기 .지움'); 쪽.wait_for_timeout(400)
            본다('✕ 누르면 비우고 다 보인다', 칸.input_value() == '' and 칩(쪽) == 전 and not 쪽.is_visible('.사진대기 .지움'), 칩(쪽))
            코드 = 모든[-1][0]; 띄운 = 코드[:2] + ' ' + 코드[2:]
            칸.fill(띄운); 칸.dispatch_event('input'); 쪽.wait_for_timeout(400)
            본다('공백 무시로만 걸리면 줄은 남고 표시는 없다', 칩(쪽)[1] >= 1 and len(쪽.query_selector_all('.사진대기 mark')) == 0, [띄운, 칩(쪽)])
            칸.fill(''); 칸.dispatch_event('input'); 쪽.wait_for_timeout(300)
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
