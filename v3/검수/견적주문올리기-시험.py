import pathlib, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
원본 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
샷 = 원본 / '검수/견적-주문올리기'
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});"
        "Object.defineProperty(navigator,'serviceWorker',{get:()=>undefined});")
터 = pathlib.Path(tempfile.mkdtemp(prefix='zg-qo-')); 사본 = 터 / 'v3'
shutil.copytree(원본, 사본, ignore=shutil.ignore_patterns('검수', '시안', '설계', '.git'))
서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8823', '-d', str(사본)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
문자 = "안녕하세요 주문할게요\n받는분: 김하늘\n010-2345-6789\n(04524) 서울 중구 세종대로 110\n101동 1203호\n감사합니다"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  FAIL ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

def 한판(p, 이름, 폭, 높이, 폰):
    print('\n[%s %dpx]' % (이름, 폭))
    브 = p.chromium.launch(); 맥 = 브.new_context(viewport={'width': 폭, 'height': 높이}, is_mobile=폰, has_touch=폰)
    바깥 = []
    def 길(route):
        u = route.request.url
        if u.startswith('http://127.0.0.1:8823/'): route.continue_()
        else: 바깥.append(u); route.abort()
    맥.route('**/*', 길)
    쪽 = 맥.new_page(); 에러 = []
    쪽.on('pageerror', lambda e: 에러.append(str(e)))
    쪽.on('console', lambda m: 에러.append('console: ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    쪽.add_init_script(심기)
    쪽.goto('http://127.0.0.1:8823/주문.html'); 쪽.wait_for_function('!!window.ZG && !!ZG.주문 && !!ZG.견적자료')
    쪽.wait_for_timeout(500)
    본다('supabase 클라이언트 없음(로컬만)', 쪽.evaluate('window.supabase === undefined'))
    쪽.evaluate("ZG.시드.심기(); ZG.주문.다시그리기()"); 쪽.wait_for_timeout(300)
    qid = 쪽.evaluate("""() => { ZG.견적자료.추가({요청일: ZG.ui.오늘문자(), 고객명: '김하늘', 연락처: '010-2345-6789', 내용: '몬스테라 15cm 2개'});
        return ZG.견적자료.전부().filter(q=>q.고객명==='김하늘')[0].id; }""")
    주문전 = 쪽.evaluate("ZG.저장소.읽기(ZG.저장소.키.주문).length")
    쪽.get_by_role('tab', name='견적 요청').click(); 쪽.wait_for_timeout(300)
    if 폰:
        쪽.get_by_text('김하늘').first.click(); 쪽.wait_for_timeout(300)
    쪽.get_by_role('button', name='주문올리기').first.click(); 쪽.wait_for_timeout(300)
    쪽.locator('textarea').last.fill(문자)
    쪽.screenshot(path=str(샷 / ('%s-1-문자창.png' % 이름)))
    쪽.get_by_role('button', name='주문 채우기').click(); 쪽.wait_for_timeout(500)
    본다('뷰가 수동', 쪽.evaluate("ZG.주문.상태.뷰") == '수동')
    값 = 쪽.evaluate("Array.from(document.querySelectorAll('#앱 input.inp')).slice(0,4).map(i=>i.value)")
    본다('받는분·전화·우편·주소 채워짐', 값[:2] == ['김하늘', '010-2345-6789'] and 값[2] == '04524' and '세종대로' in 값[3], 값)
    경로 = 쪽.evaluate("(document.querySelector('#앱 .seg .on')||{}).textContent")
    본다('경로=문자', 경로 == '문자', 경로)
    쪽.locator('input[placeholder="품목명 · 학명으로 찾기"]').first.click()
    쪽.keyboard.type('추명', delay=50); 쪽.wait_for_timeout(500)
    쪽.locator('.ac .it').first.click(); 쪽.wait_for_timeout(300)
    쪽.screenshot(path=str(샷 / ('%s-2-수동주문-채움.png' % 이름)), full_page=True)
    폭값 = 쪽.evaluate("(document.querySelector('.pc-본문')||document.querySelector('.ph-body')).getBoundingClientRect().width")
    print('    본문 폭', 폭값)
    쪽.get_by_role('button', name='주문등록').click(); 쪽.wait_for_timeout(500)
    if 쪽.get_by_text('같은 주문이 이미 있습니다').count(): print('    겹침 확인창'); 
    본다('등록 후 뷰=목록', 쪽.evaluate("ZG.주문.상태.뷰") == '목록')
    본다('주문 늘었음', 쪽.evaluate("ZG.저장소.읽기(ZG.저장소.키.주문).length") > 주문전)
    본다('견적 완료', 쪽.evaluate("q => ZG.견적자료.전부().filter(x=>x.id===q)[0].상태", qid) == '완료')
    쪽.wait_for_timeout(300)
    쪽.screenshot(path=str(샷 / ('%s-3-완료뒤-목록.png' % 이름)), full_page=True)
    # 뒤로가기: 다시 수동 열고 back
    쪽.evaluate("ZG.주문.열기('수동')"); 쪽.wait_for_timeout(200)
    본다('열기(수동) 그려짐', 쪽.locator('input[placeholder="품목명 · 학명으로 찾기"]').count() > 0)
    쪽.go_back(); 쪽.wait_for_timeout(400)
    본다('popstate 뒤 목록', 쪽.evaluate("ZG.주문.상태.뷰") == '목록' and 쪽.locator('input[placeholder="품목명 · 학명으로 찾기"]').count() == 0)
    if not 폰:
        쪽.evaluate("ZG.주문.열기('출고')"); 쪽.wait_for_timeout(200)
        본다('PC 출고뷰는 여전히 목록으로', 쪽.evaluate("ZG.주문.상태.뷰") == '목록')
        쪽.evaluate("ZG.주문.열기('수동')"); 쪽.wait_for_timeout(200)
        쪽.get_by_role('button', name='‹ 주문 조회').click(); 쪽.wait_for_timeout(200)
        본다('PC ‹ 주문 조회 버튼', 쪽.evaluate("ZG.주문.상태.뷰") == '목록')
        for 탭 in ['주문 조회', '고객', '견적 요청', '주문 조회']:
            쪽.get_by_role('tab', name=탭).click(); 쪽.wait_for_timeout(300)
            본다('탭 %s 열림' % 탭, 쪽.locator('.pc-본문').count() == 1 and len(쪽.inner_text('.pc-본문')) > 10)
        쪽.screenshot(path=str(샷 / 'PC-4-주문조회.png'))
    본다('콘솔/페이지 에러 없음', not 에러, 에러[:5])
    print('    막은 바깥 요청', len(바깥), 바깥[:3])
    브.close()

try:
    with sync_playwright() as p:
        한판(p, 'PC', 1280, 900, False)
        한판(p, '폰', 390, 844, True)
finally:
    서버.terminate(); shutil.rmtree(터, ignore_errors=True)
print('\n합계 %d/%d' % (sum(결과), len(결과)))
