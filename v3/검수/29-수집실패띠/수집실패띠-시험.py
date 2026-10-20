"""주문 수집 실패 → 맨 위 빨간 띠 (10/21 심폴 나흘 조용히 멈춤).  python3 검수/29-수집실패띠/수집실패띠-시험.py
가짜 서버: 심폴은 「로그인 실패」 → 띠 → 새로고침해도 남음 → 성공으로 바꿔 다시 누르면 걷힘. 카페24·마켓은 성공."""
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8831', '-d', str(뿌리)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
통과 = 실패 = 0
def 본다(이름, 됐나, 덧=''):
    global 통과, 실패
    if 됐나: 통과 += 1
    else: 실패 += 1
    print(('  ✅ ' if 됐나 else '  🔴 ') + 이름 + ('' if 됐나 else ' — ' + str(덧)))

# 심폴 성공 여부는 localStorage 「시험.심폴」 로 바꾼다 — 새로고침 사이에도 이어진다
가짜 = r"""
var 설정={};
function 끝(v){return Promise.resolve(v);}
function 표(이름){var 조={};var q={select:function(){return q},eq:function(k,v){조[k]=v;return q},order:function(){return q},
 range:function(){return 끝({data:[],error:null})},limit:function(){return q},
 maybeSingle:function(){var d=설정[조.id];return 끝({data:d?{내용:d}:null,error:null})},
 upsert:function(rows){rows.forEach(function(r){if(이름==='v3_공유설정'){설정[r.id]=r.내용;if(r.id==='마켓수집'){var 요=r.내용.요청;
   setTimeout(function(){설정.마켓수집={요청:요,받은요청:요,끝:true,결과:'✅ 5개 마켓'}},300)}}});return 끝({error:null})},
 then:function(a,b){return 끝({data:[],error:null}).then(a,b)}};return q}
window.supabase={createClient:function(){return {auth:{getSession:function(){return new Promise(function(){})},onAuthStateChange:function(){}},
 from:표,
 functions:{invoke:function(이름){var 됨=!(이름==='simpol-collect'&&localStorage.getItem('시험.심폴')==='실패');
   return new Promise(function(ok){setTimeout(function(){ok({data:됨?{ok:true,새것:0}:{ok:false,오류:'심폴 로그인 실패 — 아이디·비밀번호를 확인해 주세요'},error:null})},200)})}},
 channel:function(){var c={on:function(){return c},subscribe:function(){return c}};return c},removeChannel:function(){}}}};
"""
def 띠(pg):
    return pg.evaluate("(document.querySelector('.zg-못올림')||{}).textContent||''")
def 수집누르기(pg):
    pg.locator('button:has-text("주문수집")').first.click()
    pg.wait_for_timeout(5000)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(); c = b.new_context(viewport={'width': 1440, 'height': 900}); pg = c.new_page(); 오류 = []
        pg.on('pageerror', lambda e: 오류.append(str(e)))
        pg.on('console', lambda m: 오류.append(m.text) if m.type == 'error' else None)
        pg.route('**/supabase-js*', lambda r: r.fulfill(body=가짜, content_type='application/javascript'))
        c.add_init_script("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"access_token\":\"x\"}');"
                          "if(!localStorage.getItem('시험.심폴'))localStorage.setItem('시험.심폴','실패')")
        주소 = 'http://localhost:8831/%EC%A3%BC%EB%AC%B8.html'
        pg.goto(주소); pg.wait_for_function('window.ZG && ZG.주문 && ZG.보내기', timeout=30000); pg.wait_for_timeout(500)
        본다('처음엔 띠 없음', 띠(pg) == '', 띠(pg))
        수집누르기(pg)
        t = 띠(pg)
        본다('심폴 실패 → 빨간 띠에 「심폴 주문 수집 실패 — 심폴 로그인 실패」', '심폴 주문 수집 실패 — 심폴 로그인 실패' in t, t)
        본다('카페24·마켓은 성공 → 띠에 없음', '카페24' not in t and '마켓' not in t, t)
        pg.screenshot(path=str(pathlib.Path(__file__).parent / 'PC-수집실패띠.png'), clip={'x': 0, 'y': 0, 'width': 1440, 'height': 160})
        pg.reload(); pg.wait_for_function('window.ZG && ZG.보내기', timeout=30000); pg.wait_for_timeout(800)
        본다('새로고침해도 띠가 남음', '심폴 주문 수집 실패' in 띠(pg), 띠(pg))
        pg.evaluate("localStorage.setItem('시험.심폴','성공')")
        수집누르기(pg)
        본다('다시 받아 성공하면 띠가 걷힘', 띠(pg) == '', 띠(pg))
        본다('주문수집 단추가 다시 「📥 주문수집」', pg.locator('button:has-text("📥 주문수집")').count() >= 1)
        본다('콘솔 오류 0', not 오류, 오류[:3])
        b.close()
finally:
    서버.terminate()
print(f'\n{통과}/{통과 + 실패}')
sys.exit(1 if 실패 else 0)
