"""심폴 CSV 「옵션」 칸 → 27칸 옵션 자리 (10/21 히아신스 4종 모음 짝없음).  python3 검수/28-심폴옵션/심폴옵션-시험.py
08j-심폴.js 감지·바꾸기를 브라우저에서 그대로 돌린다. 서버(supabase CDN)는 막는다 — 실서버에 안 닿는다."""
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8830', '-d', str(뿌리)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
통과 = 실패 = 0
def 본다(이름, 됐나, 덧=''):
    global 통과, 실패
    if 됐나: 통과 += 1
    else: 실패 += 1
    print(('  ✅ ' if 됐나 else '  🔴 ') + 이름 + ('' if 됐나 else ' — ' + str(덧)))

# 10/21 실제 심폴 CSV 머리글 33칸(개인정보 칸은 가짜 값)
머리33 = ['', '일자', '받는사람', '주문자 전화(XX-XXXX-XXXX)', '주문자', '주문ID/주문번호', '결제상태', '주소', '전화번호(XX-XXXX-XXXX)',
          '비상전화(XX-XXXX-XXXX)', '우편번호(XXX-XXX)', '이메일', '전달사항', '상품명', '옵션(특징포함)', '갯수', '상품가격', '상품 적립금',
          '입금일', '주문관련메모(관리자)', '고객알리미', '상품별 송장번호', '거래번호', '상품코드', '옵션', '특징', '상품별 처리여부',
          '상품별 주문메세지', '상품별 배송일', '택배메세지', '주문관련 메모', '', '']
def 줄(상품, 설명, 옵션, 갯수, 값):
    r = [''] * 33
    r[1], r[2], r[8], r[10], r[7] = '20261020', '홍길동', '010-0000-0000', '="12345 "', '서울 어딘가'
    r[13], r[14], r[24], r[15], r[16], r[22], r[23] = 상품, 설명, 옵션, 갯수, 값, '2026102016044351629A', '="005005000000042466"'
    return r
행33 = [머리33, 줄('히아신스 4종 모음', '향 진한 네 가지 색 히아신스 구근품종 선택 : 1. 히아신스 집시퀸 (5개)', '품종 선택 : 1. 히아신스 집시퀸 (5개)', '1', '10000'),
        줄('수선화 떼떼아떼떼 (5개)', '키 작아 화분에 맞는 이른봄 미니수선화', '', '6', '6000')]
# 「옵션」 칸이 없던 예전 모양 — 머리글에서 「옵션」을 빼면 설명문 칸만 남는다
행옛 = [[h for i, h in enumerate(r) if i != 24] for r in 행33]

가짜 = ("window.supabase={createClient:function(){return {auth:{getSession:function(){return new Promise(function(){})}},"
        "from:function(){var q={select:function(){return q},eq:function(){return q},maybeSingle:function(){return Promise.resolve({data:null})},"
        "upsert:function(){return Promise.resolve({error:null})}};return q},functions:{invoke:function(){return new Promise(function(){})}},"
        "channel:function(){var c={on:function(){return c},subscribe:function(){return c}};return c},removeChannel:function(){}}}};")
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); 오류 = []
        pg.on('pageerror', lambda e: 오류.append(str(e)))
        pg.on('console', lambda m: 오류.append(m.text) if m.type == 'error' else None)
        pg.route('**/supabase-js*', lambda r: r.fulfill(body=가짜, content_type='application/javascript'))
        pg.add_init_script("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"access_token\":\"x\"}')")
        pg.goto('http://localhost:8830/%EC%A3%BC%EB%AC%B8.html')
        pg.wait_for_function('window.ZG && ZG.심폴 && ZG.주문올리기', timeout=30000)
        풀 = '(행들) => { const 심 = ZG.심폴.감지(행들[0]); if (!심) return null; const r = ZG.심폴.바꾸기(행들, 심); return r.행들.slice(1).map(o => [o[6], o[5], o[7], o[12], o[11]]); }'
        a = pg.evaluate(풀, 행33)
        본다('33칸: 히아신스 줄 27칸 옵션 자리 = 품종 글', a and a[0][0] == '품종 선택 : 1. 히아신스 집시퀸 (5개)', a)
        본다('33칸: 설명문(옵션(특징포함))은 옵션 자리에 안 들어감', a and '향 진한' not in a[0][0], a)
        본다('33칸: 옵션 없는 떼떼아떼떼 줄은 빈칸 · 갯수 6 · 값 6000', a and a[1][0] == '' and str(a[1][3]) == '6' and str(a[1][4]) == '6000', a)
        o = pg.evaluate(풀, 행옛)
        본다('옛 31칸(옵션 칸 없음)도 그대로 읽힘 · 옵션 자리 빈칸', o and o[0][0] == '' and o[0][1] == '005005000000042466', o)
        본다('콘솔 오류 0', not 오류, 오류[:3])
        b.close()
finally:
    서버.terminate()
print(f'\n{통과}/{통과 + 실패}')
sys.exit(1 if 실패 else 0)
