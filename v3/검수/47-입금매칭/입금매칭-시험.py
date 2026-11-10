# -*- coding: utf-8 -*-
# 34단계 2단계 입금 띠·「주문 올릴까요?」·자주 파는 묶음 — python3 v3/검수/47-입금매칭/입금매칭-시험.py
# 🔴 로컬 전용 · 이름·금액은 전부 가짜(공개 저장소). 입금 줄은 ZG.입금줄 에 직접 심고, 01b 받는 길은 가짜 Supabase 로 한 번 더
import re, json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

# 주문(가짜) — [id, 받는분, 단가(1개), 몇 시간 전, 주소]
주문들 = [
    ['m1', '김가람', 15000, 1, '서울 강남구 테헤란로 152'],        # 15,000 + 4,500 = 19,500 ↔ 입금 19,500 → 초록
    ['m2', '이나래', 25500, 1, '서울 마포구 성미산로 21'],         # 30,000 ↔ 24,000 → 주황 6,000 모자람
    ['m3', '박다솜', 7500, 1, '대구 수성구 달구벌대로 2450'],       # 12,000 ↔ 「최입금」 12,000 → 노랑
    ['m4', '정하나', 10500, 1, ''],                               # 15,000 ┐ 정하나 18,000 → 둘 다 골라 주세요
    ['m5', '정하나', 15500, 1, ''],                               # 20,000 ┘
    ['m6', '(주)초록농원', 45500, 1, '경기 수원시 영통구 광교중앙로 145'],  # 50,000 ↔ 「초록농」 50,000 → 초록(앞부분·(주) 무시)
    ['m7', '한겨울', 5500, 1, ''],                                # 10,000 · 입금 없음 → 입금 전
    ['m8', '한늦음', 5500, 30, ''],                               # 30시간 전 → 입금 전(늦음)
    ['m9', '한옛날', 5500, 24 * 8, ''],                           # 8일 전 → 띠 없음
    ['m10', '김가람', 15000, 1, ''],                              # 같은 이름·같은 금액 두 번째 → 김가람 입금은 하나라 고름 → 확정 뒤 입금 전
]
입금들 = {  # id 모양은 deposit-in 그대로 — 입금:<시각16자>:<금액>:<이름>
    '입금:{d}T09:29:19500:김가람': ('김가람', 19500, '09:29'),
    '입금:{d}T09:40:24000:이나래': ('이나래', 24000, '09:40'),
    '입금:{d}T10:02:12000:최입금': ('최입금', 12000, '10:02'),
    '입금:{d}T10:15:18000:정하나': ('정하나', 18000, '10:15'),
    '입금:{d}T10:20:50000:초록농': ('초록농', 50000, '10:20'),
}
심자료 = """([주문들, 입금들]) => {
  const 저 = ZG.저장소, 오늘 = ZG.ui.오늘문자(), 품 = 저.품목들()[1], 지금 = Date.now();
  if (!ZG.업체자료.자사()) 저.덧붙이기(저.키.업체, { id: 'c_self', 이름: '제로가드닝', 내업체: true, 입금계좌: '농협 000-0000-0000-00 제로가드닝' });
  주문들.forEach(([id, 이름, 단가, 시간, 주소]) => {
    const 등록 = 지금 - 시간 * 36e5, 날 = new Date(등록);
    저.덧붙이기(저.키.문자주문, { id, 날짜: 날.getFullYear() + '-' + String(날.getMonth() + 1).padStart(2, '0') + '-' + String(날.getDate()).padStart(2, '0'),
      받는분: 이름, 전화: '01000000000', 메모: '', 주소, 상세주소: '', 우편: '', 배송메시지: '',
      품목: [{ 품목코드: 품.품목코드, 유통명: 품.유통명, 학명: '', 규격: 품.규격 || '', 수량: 1, 단가 }], 배송비: 4500,
      상태: '보냄', 등록일시: 등록, 수정일시: 등록 });
  });
  ZG.입금줄 = ZG.입금줄 || {};
  Object.keys(입금들).forEach(k => { const [이름, 금액, 때] = 입금들[k]; ZG.입금줄[k.replace('{d}', 오늘)] = { 은행: '농협', 이름, 금액, 시각: 오늘 + 'T' + 때 + ':00+09:00', 입구: '시험', 받은시각: '' }; });
  ZG.주문.다시그리기();
}"""

# 01b 받는 길 — 가짜 Supabase(43-가볍게받기 와 같은 틀을 줄임) · 구독 콜백을 붙잡아 실시간 줄도 흘려 본다
가짜 = """(() => {
  const 자료 = window.__가짜자료 || {}; window.__콜백 = {};
  function 답(표, 일) {
    const 이름 = 일.map(x => x[0]);
    if (이름.some(n => /upsert|insert|update|delete/.test(n))) return { data: null, error: null };
    const eq = 일.find(x => x[0] === 'eq');
    if (표 === 'v3_공유설정' && eq && eq[1][1] === '서버상태') return { data: { 내용: { 올림완료: true } }, error: null };
    if (이름.includes('maybeSingle') || 이름.includes('single')) return { data: null, error: null };
    const r = 일.find(x => x[0] === 'range');
    if (!r) return { data: [], error: null, count: 0 };
    return { data: (자료[표.replace('v3_', '')] || []).slice(r[1][0], r[1][1] + 1), error: null };
  }
  function 체인(표, 일) {
    return new Proxy(function () {}, { get(_, k) {
      if (k === 'then') return (ok, no) => Promise.resolve(답(표, 일)).then(ok, no);
      return (...a) => 체인(표, 일.concat([[k, a]]));
    } });
  }
  const 채널 = () => ({ on(ev, 거름, cb) { if (거름 && 거름.table) window.__콜백[거름.table.replace('v3_', '')] = cb; return this; },
    subscribe(cb) { if (cb) setTimeout(() => cb('SUBSCRIBED'), 0); return this; }, unsubscribe() { return Promise.resolve(); } });
  const 손 = { from: (표) => 체인(표, []), channel: 채널, removeChannel: () => Promise.resolve(), getChannels: () => [],
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't', user: { id: 'u' } } } }),
            getUser: () => Promise.resolve({ data: { user: { id: 'u' } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    functions: { invoke: () => Promise.resolve({ data: { ok: true }, error: null }) }, storage: { from: () => 체인('storage', []) } };
  Object.defineProperty(window, 'supabase', { value: { createClient: () => 손 }, writable: false });
})();"""

서버 = subprocess.Popen([sys.executable, str(뿌리 / '검수' / '_시험서버.py'), '8853', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
밑 = 'http://localhost:8853/%EC%A3%BC%EB%AC%B8.html'

def 쪽열기(브, 폰, 앞=''):
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1400}, device_scale_factor=2 if 폰 else 1, service_workers='block')
    쪽._오류 = []
    쪽.on('pageerror', lambda e: 쪽._오류.append(str(e)))
    쪽.on('console', lambda m: 쪽._오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    for 길 in ('**cdn.jsdelivr.net**', '**supabase.co**', '**daumcdn.net**'): 쪽.route(길, lambda r: r.abort())
    쪽.add_init_script(앞 + 심기)
    쪽.goto(밑); 쪽.wait_for_function('!!(window.ZG && ZG.문자주문 && ZG.입금매칭)', timeout=20000)
    return 쪽

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (True, False):
            틀 = '폰' if 폰 else 'PC'
            print('\n[' + 틀 + ']')
            쪽 = 쪽열기(브, 폰, (뿌리 / 'js' / '00-시드.js').read_text(encoding='utf-8') + ';')
            쪽.evaluate("() => ZG.시드.심기()")
            쪽.evaluate(심자료, [주문들, 입금들])
            쪽.locator('button', has_text=re.compile(r'^\s*문자(주문)?\s*$')).first.click(); 쪽.wait_for_timeout(300)
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)
            판 = lambda: 쪽.evaluate("() => { const p = ZG.입금매칭.판정(), o = {}; Object.keys(p).forEach(k => o[k] = [p[k].결, p[k].입금 ? p[k].입금.이름 : '', !!p[k].확정, !!p[k].늦음]); return o; }")
            def 카드(id):
                return ('.문카드' if 폰 else 'tr') + ':has(:text-is("%s"))' % 쪽.evaluate("id => ZG.문자주문자료.하나(id).받는분", id)
            def 띠글(이름):
                e = 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("%s") .입금띠' % 이름)
                return [e.nth(i).inner_text() for i in range(e.count())]
            j = 판()
            본다('판정 — 초록·주황·노랑·골라·앞부분', j['m2'][0] == '다름' and j['m3'][:2] == ['물음', '최입금'] and j['m4'][0] == j['m5'][0] == '고름' and j['m6'][0] == '맞음', j)
            본다('판정 — 입금 전 · 하루 지나면 늦음 · 8일 전은 없음', j['m7'][0] == '전' and not j['m7'][3] and j['m8'][0] == '전' and j['m8'][3] and 'm9' not in j)
            본다('같은 이름·같은 금액 두 건(m1·m10) — 둘 다 골라 주세요', j['m1'][0] == j['m10'][0] == '고름', [j['m1'], j['m10']])
            # m1·m10 은 김가람·19,500 두 건이라 골라야 한다 — m10 을 지우고 다시 본다(이름 하나 → 초록)
            쪽.evaluate("() => { ZG.문자주문자료.지우기('m10'); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(300)
            j = 판()
            본다('m10 지운 뒤 — 김가람 초록', j['m1'][0] == '맞음' and 'm10' not in j, j.get('m1'))
            본다('초록 띠 글 「입금 ✓ 시각 · 금액」', any('입금 ✓' in t and '09:29' in t and '19,500원' in t for t in 띠글('김가람')), 띠글('김가람'))
            본다('주황 띠 「6,000원 모자람」', any('금액 다름' in t and '24,000원 들어옴' in t and '6,000원 모자람' in t for t in 띠글('이나래')), 띠글('이나래'))
            본다('노랑 띠 「이분 입금일까요?」', any('이분 입금일까요?' in t and '최입금' in t for t in 띠글('박다솜')), 띠글('박다솜'))
            본다('골라 주세요 띠 둘', len([t for t in 띠글('정하나') if '골라 주세요' in t]) == 2, 띠글('정하나'))
            본다('입금 전 띠', any(t == '입금 전' for t in 띠글('한겨울')), 띠글('한겨울'))
            본다('「주문 올릴까요?」 — 초록 카드만(김가람·초록농원)', 쪽.locator('.btn.큰올림').count() == 2, 쪽.locator('.btn.큰올림').count())
            쪽.screenshot(path=str(여기 / ('1-띠-' + 틀 + '.png')), full_page=폰, animations='disabled')

            # 노랑 → 맞음
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("박다솜") .입금띠').first.click(); 쪽.wait_for_timeout(300)
            창 = 쪽.inner_text('.askbox') if 쪽.query_selector('.askbox') else ''
            본다('노랑 누름 — 입금 정보 · 맞음/아님', '12,000원' in 창 and '최입금' in 창 and '맞음' in 창 and '아님' in 창, 창.replace('\n', ' / '))
            쪽.screenshot(path=str(여기 / ('2-노랑창-' + 틀 + '.png')), animations='disabled')
            쪽.click('.askbox button:has-text("맞음")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate("() => ZG.문자주문자료.하나('m3')")
            본다('맞음 — 문자주문 줄 「입금」 칸에 짝 · 초록 · 올릴까요', r['입금']['id'].endswith(':12000:최입금') and 판()['m3'][:3] == ['맞음', '최입금', True] and 쪽.locator('.btn.큰올림').count() == 3)
            # 골라 주세요 → 이 주문
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("정하나") .입금띠').first.click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox button:has-text("이 주문 입금이 맞음")'); 쪽.wait_for_timeout(300)
            j = 판()
            짝 = [k for k in ('m4', 'm5') if j[k][2]]
            본다('골라 주세요 → 고른 한 건에만 붙음 · 다른 건 입금 전', len(짝) == 1 and j[짝[0]][0] == '다름' and j[[k for k in ('m4', 'm5') if k not in 짝][0]][0] == '전', [j['m4'], j['m5']])
            # 초록 → 떼어 내기
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("김가람") .입금띠').first.click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox button:has-text("떼어 내기")'); 쪽.wait_for_timeout(300)
            j = 판(); r = 쪽.evaluate("() => ZG.문자주문자료.하나('m1')")
            본다('떼어 내기 — 입금 전으로 · 뗀 목록에 남아 다시 안 붙음', j['m1'][0] == '전' and len(r['입금']['뗀']) == 1 and r['입금']['id'] == '', [j['m1'], r.get('입금')])
            본다('뗀 입금은 다른 주문에도 안 붙음(이름 맞는 주문 없음)', not any(v[1] == '김가람' for v in j.values()))

            # 주문 올릴까요 — 주소 있는 초록(초록농원) → 올림 · 주소 없는 초록(박다솜은 주소 있음 → 주소 비운 줄로)
            쪽.evaluate("() => { ZG.저장소.바꾸기(ZG.저장소.키.문자주문, 'm3', { 주소: '' }); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(300)
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("박다솜") .btn.큰올림').click(); 쪽.wait_for_timeout(300)
            본다('주소 빈 줄 — 안 올리고 안내', 쪽.evaluate("() => ZG.문자주문자료.하나('m3').상태") != '올림' and '주소' in (쪽.inner_text('.toast') if 쪽.query_selector('.toast') else 쪽.inner_text('body')))
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("초록농원") .btn.큰올림').click(); 쪽.wait_for_timeout(400)
            r = 쪽.evaluate("() => ZG.문자주문자료.하나('m6')")
            주 = 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === 'm6')")
            본다('한 번 누름 — 주문 올림 · 주문 줄 생김 · 짝 남김 · 띠 그대로 초록', r['상태'] == '올림' and len(주) == 1 and '광교중앙로 145' in 주[0]['수령인주소'] and r['입금']['id'].endswith(':50000:초록농') and 판()['m6'][0] == '맞음', [r['상태'], len(주)])
            쪽.screenshot(path=str(여기 / ('3-올린뒤-' + 틀 + '.png')), full_page=폰, animations='disabled')

            # 자주 파는 묶음 — 같은 조합 세 번·두 번·한 번
            쪽.evaluate("""() => { const 저 = ZG.저장소, 품 = 저.품목들(), 지금 = Date.now();
              const 넣 = (id, 줄) => 저.덧붙이기(저.키.문자주문, { id, 날짜: '2026-10-01', 받는분: '묶음' + id, 전화: '', 품목: 줄.map(([i, n]) => ({ 품목코드: 품[i].품목코드, 유통명: 품[i].유통명, 수량: n, 단가: 1 })), 배송비: 0, 상태: '올림', 등록일시: 지금 - 864e5 * 20, 수정일시: 0 });
              ['a', 'b', 'c'].forEach(k => 넣('묶' + k, [[2, 3], [3, 2]]));
              ['d', 'e'].forEach(k => 넣('묶' + k, [[4, 5]]));
              넣('묶f', [[2, 1]]); 넣('묶g', [[2, 1]]);
              ZG.문자주문새문자.상태.담은것 = []; }""")
            쪽.locator('button', has_text='새 문자').first.click(); 쪽.wait_for_timeout(400)
            단 = 쪽.locator('.묶음줄 .btn.묶음')
            글들 = [단.nth(i).inner_text() for i in range(단.count())]
            품3 = 쪽.evaluate("() => ZG.저장소.품목들()[2].유통명")
            본다('묶음 — 두 번 넘게 나온 조합만 · 많이 나온 순 · 1개짜리 하나는 빼고', len(글들) == 2 and 글들[0].count('+') == 1 and 글들[1].endswith(' 5') and 품3 in 글들[0], 글들)
            단.first.click(); 쪽.wait_for_timeout(300)
            담 = 쪽.evaluate("() => ZG.문자주문새문자.상태.담은것.map(r => [r.품목코드, r.수량, r.단가])")
            기단 = 쪽.evaluate("() => { const 품 = ZG.저장소.품목들(); return [ZG.문자주문자료.담을줄(품[2]).단가, ZG.문자주문자료.담을줄(품[3]).단가]; }")
            본다('묶음 누름 — 품목·수량 담김 · 단가는 지금 값', sorted(x[1] for x in 담) == [2, 3] and sorted(x[2] for x in 담) == sorted(기단), 담)
            단.first.click(); 쪽.wait_for_timeout(300)
            본다('한 번 더 — 수량 더함', sorted(x[1] for x in 쪽.evaluate("() => ZG.문자주문새문자.상태.담은것.map(r => [r.품목코드, r.수량])")) == [4, 6])
            쪽.screenshot(path=str(여기 / ('4-묶음-' + 틀 + '.png')), full_page=폰, animations='disabled')
            본다('콘솔 빨간 에러 0 (' + 틀 + ')', not 쪽._오류, 쪽._오류[:3])
            쪽.close()

        # ── 01b 받는 길 — 가짜 서버에서 입금 줄을 받아 띠가 서고, 실시간으로 지우고 더한다
        print('\n[01b 가짜 서버]')
        오늘 = time.strftime('%Y-%m-%d')
        자 = {'문자주문': [{'id': 's1', '내용': {'id': 's1', '날짜': 오늘, '받는분': '서버받음', '전화': '', '주소': '서울 어딘가로 1', '품목': [{'품목코드': 'X-10', '유통명': '시험풀', '수량': 1, '단가': 5500}], '배송비': 4500, '상태': '보냄', '등록일시': int(time.time() * 1000) - 3600e3, '수정일시': 0}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'}],
              '공유설정': [{'id': '입금:%sT08:00:10000:서버받음' % 오늘, '내용': {'은행': '농협', '이름': '서버받음', '금액': 10000, '시각': 오늘 + 'T08:00:00+09:00', '입구': '시험'}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'},
                          {'id': '동봉카드설정', '내용': {}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'}]}
        쪽 = 쪽열기(브, False, 'window.__가짜자료 = ' + json.dumps(자, ensure_ascii=False) + ';' + 가짜)
        쪽.wait_for_function("() => Object.keys(ZG.입금줄 || {}).length > 0", timeout=10000)
        본다('처음 받기 — 입금 줄이 ZG.입금줄 로(로컬 저장 없음)', list(쪽.evaluate("() => ZG.입금줄").keys()) == [자['공유설정'][0]['id']] and not 쪽.evaluate("() => Object.keys(localStorage).some(k => k.indexOf('입금') >= 0)"))
        본다('서버 문자주문 + 서버 입금 → 초록', 쪽.evaluate("() => ZG.입금매칭.판정().s1.결") == '맞음')
        쪽.evaluate("(id) => window.__콜백['공유설정']({ eventType: 'DELETE', old: { id }, new: {} })", 자['공유설정'][0]['id']); 쪽.wait_for_timeout(300)
        본다('실시간 지움 → 입금 전', 쪽.evaluate("() => ZG.입금매칭.판정().s1.결") == '전')
        쪽.evaluate("(오늘) => window.__콜백['공유설정']({ eventType: 'INSERT', new: { id: '입금:' + 오늘 + 'T08:30:10000:서버받음', 내용: { 은행: '농협', 이름: '서버받음', 금액: 10000, 시각: 오늘 + 'T08:30:00+09:00' }, 수정시각: '2026-11-10T01:00:00+00:00' } })", 오늘); 쪽.wait_for_timeout(600)
        본다('실시간 새 입금 → 초록 · 다시 그림', 쪽.evaluate("() => ZG.입금매칭.판정().s1.결") == '맞음')
        본다('콘솔 빨간 에러 0 (가짜 서버)', not 쪽._오류, 쪽._오류[:3])
        쪽.close(); 브.close()
finally:
    서버.kill()
print('\n%d/%d' % (sum(결과), len(결과)))
