# -*- coding: utf-8 -*-
"""입고를 저장하면 「상세페이지 작업 대기」가 바로 갱신되는가 (제작요청-시험.py 틀을 그대로 쓴다)"""
import json, time, pathlib
from playwright.sync_api import sync_playwright
뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
이제 = int(time.time() * 1000)
세션 = {"access_token":"검수용","token_type":"bearer","expires_in":3600,
        "expires_at":int(time.time())+3600,"refresh_token":"검수용",
        "user":{"id":"00000000-0000-0000-0000-000000000000","aud":"authenticated",
                "role":"authenticated","email":"검수@zg"}}
def 품목(코드,이름,때):
    return {"품목코드":코드,"접두":코드[:5],"학명3":코드[:3],"일련번호":코드[3:5],"규격cm":15,
            "규격":"15cm 포트","유통명":이름,"학명":"X sp.","학명키":"x sp.","매입단가":1000,
            "과세구분":"면세","상태":"판매중","특성":None,"등록일시":때,"수정일시":때}
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token', %s);"
        "localStorage.setItem('zg.v3.품목', %s);"
        % (json.dumps(json.dumps(세션)),
           json.dumps(json.dumps([품목("AAA01-15","먼저있던것",이제)], ensure_ascii=False))))

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844})
    pg.route("**/*.supabase.co/**", lambda r: r.abort())
    오류 = []; pg.on('pageerror', lambda e: 오류.append(str(e)))
    pg.add_init_script(심기)
    pg.goto((뿌리/'index.html').as_uri() + '#입고'); pg.wait_for_timeout(1400)

    뽑기 = """() => {
        var 머 = [...document.querySelectorAll('.ph-sec')]
                 .find(e => e.textContent.indexOf('상세페이지 작업 대기') >= 0);
        if (!머) return [];
        var 목 = 머.parentElement.querySelector('.ph-list');
        return 목 ? [...목.querySelectorAll('.ph-card .nm')].map(e => e.textContent) : [];
    }"""
    이름들 = lambda: pg.evaluate(뽑기)
    셈 = lambda: len(이름들())
    print('① 처음 :', 셈(), '장', 이름들())
    assert 셈() == 1, '처음부터 안 보인다'

    print('② 새 품목을 심고 내역다시() — 입고 저장 뒤와 같은 상황')
    pg.evaluate("""(t) => {
        ZG.저장소.덧붙이기(ZG.저장소.키.품목, {품목코드:'FFF01-18',접두:'FFF01',학명3:'FFF',일련번호:'01',규격cm:18,규격:'18cm 포트',
                 유통명:'테스트3',학명:'Y sp.',학명키:'y sp.',매입단가:1000,과세구분:'면세',
                 상태:'판매중',특성:null,등록일시:t,수정일시:t});
        ZG.입고내역.내역다시();
    }""", 이제)
    pg.wait_for_timeout(500)
    print('   갱신 뒤:', 셈(), '장', 이름들())
    assert '테스트3' in 이름들(), '새 품목이 안 떴다 — %s' % 이름들()
    print('   콘솔 오류:', 오류 or '없음')
    assert not 오류
    print('\n✅ 저장하면 바로 뜬다')
    b.close()
