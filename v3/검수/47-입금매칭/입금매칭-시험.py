# -*- coding: utf-8 -*-
# 34단계 2단계 입금 띠·「주문 올릴까요?」 + 새 문자 프리셋 — python3 v3/검수/47-입금매칭/입금매칭-시험.py
# 🔴 로컬 전용 · 이름·금액은 전부 가짜(공개 저장소). 입금 줄은 ZG.입금줄 에 직접 심고, 01b 받는 길은 가짜 Supabase 로 한 번 더
import re, json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path(__file__).resolve().parents[2]
여기 = pathlib.Path(__file__).resolve().parent
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}'); sessionStorage.setItem('zg.새판시도','2');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''), flush=True)

# 주문(가짜) — [id, 받는분, 단가(1개), 몇 시간 전, 주소] · 합계 = 단가 + 배송비 4,500 · 규칙 11/10 우람님(이름 기준 · 자동 짝은 적어 고정 · 비슷한 이름은 빨간 확인요청)
주문들 = [
    ['m1', '김가람', 15000, 1, ''],                               # 19,500 ┐ (주소 없음 → 입금완료) 김가람 19,500 입금 하나 → 한 주문에만(오래된 m1) · m10 은 입금 전
    ['m10', '김가람', 15000, 0.9, ''],                            # 19,500 ┘
    ['m25', '김가람꽃', 15000, 1, ''],                            # 김가람 입금은 이미 붙어 확인요청 후보로도 안 나옴 → 입금 전
    ['m2', '이나래', 25500, 1, '서울 마포구 성미산로 21'],         # 30,000 ↔ 24,000 → 주황 6,000 모자람
    ['m3', '박다솜', 7500, 1, ''],                                # 12,000 ↔ 「최입금」 12,000 → 금액만 맞음은 뺐다 → 입금 전
    ['m4', '정하나', 10500, 1, ''],                               # 15,000 ┐ 정하나 18,000 하나 → 한 건만 주황 · 다른 건 입금 전
    ['m5', '정하나', 15500, 0.9, ''],                             # 20,000 ┘
    ['m6', '(주)초록농원', 45500, 1, '경기 수원시 영통구 광교중앙로 145'],  # ↔ 「초록농」(잘림·(주)) → 빨간 확인요청
    ['m21', '김두용', 10500, 1, '경기 수원시 영통구 광교중앙로 145'],      # 15,000 ↔ 「김두용(제로가드닝)」 → 빨간 확인요청
    ['m22', '이두환', 4500, 1, ''],                               # 9,000 ↔ 「이두」(잘림) → 빨간 확인요청
    ['m23', '박 정확', 5500, 1, ''],                              # 10,000 ↔ 「박정확」(띄어쓰기만 다름) → 초록 · 주소 없음
    ['m24', '최둘', 5500, 1, ''],                                 # 10,000 ↔ 최둘 7,000 · 최둘 8,000 → 골라 주세요
    ['m26', '나리', 35500, 1, '서울 어딘가로 2'],                  # 40,000 ↔ 「048-나리」(농협이 앞에 숫자를 붙임 · 13:11 실례) → 초록 · 시험에서 올림으로 바꿈
    ['m30', '자동이', 10500, 1, '서울 어딘가로 30'],              # 15,000 ↔ 자동이 15,000 · 이름·주소 다 있음 → 저절로 주문 올림(주문완료)
    ['m7', '한겨울', 5500, 1, ''],                                # 입금 없음 → 입금 전
    ['m8', '한늦음', 5500, 30, ''],                               # 30시간 전 → 입금 전(늦음)
    ['m9', '한옛날', 5500, 24 * 31, ''],                          # 31일 전 → 띠 없음(11/13 30일로)
]
입금들 = {  # id 모양은 deposit-in 그대로 — 입금:<시각16자>:<금액>:<이름>
    '입금:{d}T09:29:19500:김가람': ('김가람', 19500, '09:29'),
    '입금:{d}T09:40:24000:이나래': ('이나래', 24000, '09:40'),
    '입금:{d}T10:02:12000:최입금': ('최입금', 12000, '10:02'),
    '입금:{d}T10:15:18000:정하나': ('정하나', 18000, '10:15'),
    '입금:{d}T10:20:50000:초록농': ('초록농', 50000, '10:20'),
    '입금:{d}T10:30:15000:김두용(제로가드닝)': ('김두용(제로가드닝)', 15000, '10:30'),
    '입금:{d}T10:31:9000:이두': ('이두', 9000, '10:31'),
    '입금:{d}T10:32:10000:박정확': ('박정확', 10000, '10:32'),
    '입금:{d}T10:33:7000:최둘': ('최둘', 7000, '10:33'),
    '입금:{d}T10:34:8000:최둘': ('최둘', 8000, '10:34'),
    '입금:{d}T10:50:7000:새손님': ('새손님', 7000, '10:50'),
    '입금:{d}T13:11:40000:048-나리': ('048-나리', 40000, '13:11'),
    '입금:{d}T10:40:15000:자동이': ('자동이', 15000, '10:40'),
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
  저.바꾸기(저.키.문자주문, 'm26', { 상태: '올림', 올린주문번호: 'y', 올린일시: 지금 - 0.05 * 36e5 });
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
            def 단계(k): 쪽.click('.단계줄 .단계.' + k); 쪽.wait_for_timeout(200)
            def 이름들(): return 쪽.evaluate("() => " + ("[...document.querySelectorAll('.문카드 .r1 .nm')].map(e => e.textContent)" if 폰 else "[...document.querySelectorAll('tbody tr')].filter(t => t.children.length > 2).map(t => t.children[2].firstChild.textContent)"))
            def 단계글(): return 쪽.evaluate("() => [...document.querySelectorAll('.단계줄 .단계')].map(b => [b.querySelector('span') ? b.querySelector('span').textContent + ' ' + b.querySelector('b').textContent : b.textContent, b.classList.contains('on'), b.classList.contains('빔')])")   # 폰 2판 — 큰 숫자 위·이름 아래
            def 띠글(이름):
                e = 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("%s") .입금띠' % 이름)
                return [e.nth(i).inner_text() for i in range(e.count())]
            j = 판()
            본다('같은 이름 두 주문 + 입금 1건 → 한 주문에만(오래된 m1) · 다른 건 입금 전', j['m1'][:3] == ['맞음', '김가람', True] and j['m10'][0] == '전', [j['m1'], j['m10']])
            본다('처음 맞은 짝을 줄에 적어 고정', 쪽.evaluate("() => (ZG.문자주문자료.하나('m1').입금 || {}).id || ''").endswith(':19500:김가람'))
            본다('붙은 입금은 비슷한 이름(김가람꽃) 후보에도 안 나옴', j['m25'][0] == '전', j['m25'])
            본다('주황 · 금액만 맞는 제안 없음 · 정하나 두 주문에 입금 1건 → 한 건만', j['m2'][0] == '다름' and j['m3'][0] == '전' and sorted([j['m4'][0], j['m5'][0]]) == ['다름', '전'], [j['m2'], j['m3'], j['m4'], j['m5']])
            본다('빨간 확인요청 — 김두용(제로가드닝) · 이두(잘림) · 초록농((주)·잘림) · 자동 확정 안 함', [j[k][:3] for k in ('m21', 'm22', 'm6')] == [['확인', '김두용(제로가드닝)', False], ['확인', '이두', False], ['확인', '초록농', False]], [j[k] for k in ('m21', 'm22', 'm6')])
            본다('정확히 같은 이름(띄어쓰기만 다름) → 초록', j['m23'][:2] == ['맞음', '박정확'], j['m23'])
            본다('048-나리 ↔ 나리 → 초록(앞 숫자 뗌 · 올린 주문)', j['m26'][:3] == ['맞음', '048-나리', True], j['m26'])
            본다('같은 이름 입금 둘 → 골라 주세요', j['m24'][0] == '고름', j['m24'])
            본다('입금 전 · 하루 지나면 늦음 · 31일 전은 없음', j['m7'][0] == '전' and not j['m7'][3] and j['m8'][0] == '전' and j['m8'][3] and 'm9' not in j)
            쪽.evaluate("() => ZG.주문.다시그리기()"); 쪽.wait_for_timeout(300)
            본다('다시 열어도 그대로', 판() == j)
            단계('입금')
            본다('초록 띠 글 「입금 ✓ 시각 · 금액」', any('입금 ✓' in t and '09:29' in t and '19,500원' in t for t in 띠글('김가람')), 띠글('김가람'))
            단계('전')
            본다('주황 띠 「6,000원 모자람」', any('6,000원 모자람' in t for t in 띠글('이나래')), 띠글('이나래'))
            본다('빨간 띠 「확인요청 · 김두용(제로가드닝) 15,000원」', '확인요청 · 김두용(제로가드닝) 15,000원' in 띠글('김두용'), 띠글('김두용'))
            본다('골라 주세요 띠 「최둘 입금 2건」', any('골라 주세요' in t and '2건' in t for t in 띠글('최둘')), 띠글('최둘'))
            단계('주문')
            자동 = 쪽.evaluate("() => { const r = ZG.문자주문자료.하나('m30'), 주 = ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === 'm30'); return [r.상태, !!r.자동올림, 주.map(o => o.id)]; }")
            본다('자동 올리기 — 초록+이름+주소 → 누르지 않아도 올림 1번 · 자동 올림 표시', 자동 == ['올림', True, ['od_sm_m30_0']] and '자동 올림' in 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("자동이")').first.inner_text(), 자동)
            본다('빨강·주황·골라 주세요는 안 올림 · 주소 빠진 초록(김가람·박 정확)도 안 올림', all(쪽.evaluate("(k) => ZG.문자주문자료.하나(k).상태", k) != '올림' for k in ('m6', 'm21', 'm2', 'm24', 'm1', 'm23')))
            본다('「주문 올릴까요?」 단추 없음', 쪽.locator('.btn.큰올림').count() == 0)
            단계('전')
            줄 = 단계글()
            본다('단계 줄 — 입금 전 › 입금완료 › 주문완료 › 발송완료 · 건수 · 고른 것 하나', [x[0].split(' ')[0] for x in 줄] == ['입금', '입금완료', '주문완료', '발송완료'] and [x[1] for x in 줄] == [True, False, False, False] and all(any(c.isdigit() for c in x[0]) for x in 줄), 줄)
            전들 = 이름들(); 단계('입금'); 입들 = 이름들(); 단계('주문'); 주들 = 이름들(); 단계('발송'); 발들 = 이름들()
            본다('고른 단계 목록만 — 입금 전(박다솜) · 입금완료(김가람·박 정확) · 주문완료(자동이) · 발송완료 0건은 흐리게', '박다솜' in 전들 and '박다솜' not in 입들 and {'김가람', '박 정확'} <= set(입들) and '자동이' in 주들 and not 발들 and 단계글()[3][2] and 단계글()[3][1], [len(전들), 입들, 주들, 발들])
            본다('0건 단계 — 「발송완료 없습니다」', '발송완료 없습니다' in 쪽.inner_text('.문자주문'))
            단계('전'); 앞줄 = 이름들()[:5]
            본다('입금 전 맨 위는 손으로 볼 것(빨강·주황·골라 주세요)', set(앞줄) <= {'(주)초록농원', '김두용', '이두환', '이나래', '최둘', '정하나'} and len(앞줄) == 5, 앞줄)
            쪽.evaluate("() => { const 저 = ZG.저장소; 저.덧붙이기(저.키.출고, { id: 'out_m30', 출처: '주문', 주문id: 'od_sm_m30_0', 운송장번호: '12345678901', 등록일시: Date.now() }); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(300)
            단계('발송'); 본다('송장 들어가면 발송완료 단계 · 발송완료 문자 단추', 단계글()[3][0] == '발송완료 1' and 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("자동이") button:has-text("발송완료 문자")').count() == 1, 단계글())
            # 두 기기가 같이 올림 — 상대 기기 몫을 흉내(상태만 되돌려 다시 올림) → 주문 줄 그대로 하나
            쪽.evaluate("() => { const 자 = ZG.문자주문자료, 저 = ZG.저장소; 저.바꾸기(저.키.문자주문, 'm30', { 상태: '보냄' }); 자.주문올리기('m30', 자.하나('m30')); }")
            본다('두 번 올려도 주문 줄 하나(같은 id)', 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === 'm30').length") == 1)
            # 맨 위 날짜 ‹ › · 가운데 누르면 달력 팝업 · 칩 이름
            오늘 = 쪽.evaluate("() => ZG.ui.오늘문자()")
            칩 = 쪽.locator('.문자주문 .발송칩')
            본다('칩 = 날짜줄 오른쪽 🚚 아이콘(글자 없음 · 배지 1 · 손가락 크기) · 달력은 화면에 없음', 칩.locator('svg').count() == 1 and '발송문자' not in 칩.inner_text() and 칩.locator('.배지').inner_text() == '1' and 칩.bounding_box()['width'] >= 44 and 칩.bounding_box()['height'] >= 44 and 쪽.locator('.문자주문 .cal').count() == 0, 칩.inner_text())
            가 = 쪽.evaluate("() => { const d = document.querySelector('.날짜칸').getBoundingClientRect(), c = document.querySelector('.날짜머리').getBoundingClientRect(), b = document.querySelector('.발송칩').getBoundingClientRect(); a = document.querySelector('.새문자칩').getBoundingClientRect(); return [Math.round((a.left + b.right) / 2 - (c.left + c.width / 2)), Math.round(b.left - d.right)]; }")
            if 폰:   # 11/12 2판 — 폰은 [검색][새 문자] ‹ 날짜 › [발송] 한 줄을 꽉 채움
                끝 = 쪽.evaluate("() => { const c = document.querySelector('.날짜머리').getBoundingClientRect(), s = document.querySelector('.검색칩').getBoundingClientRect(), b = document.querySelector('.발송칩').getBoundingClientRect(); return [Math.round(s.left - c.left), Math.round(c.right - b.right)]; }")
                본다('폰 「[검색][새 문자] ‹ 날짜 › [발송]」 한 줄 꽉 · 발송은 날짜줄 바로 옆', abs(끝[0]) <= 2 and abs(끝[1]) <= 2 and 0 < 가[1] <= 16, [끝, 가])
            else: 본다('「✉️ ‹ 날짜 › 🚚」 묶음이 가운데(±2px) · 🚚는 날짜줄 바로 옆', abs(가[0]) <= 2 and 0 < 가[1] <= 16, 가)
            쪽.click('.발송칩'); 쪽.wait_for_timeout(300)
            본다('🚚 누르면 발송문자 안 보낸 모든 내역 · 단계 줄 숨김', 쪽.evaluate("() => ZG.문자주문.상태.발송모음") and 쪽.locator('.단계줄').is_hidden() and 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("자동이")').count() == 1)
            쪽.click('.발송칩'); 쪽.wait_for_timeout(300)
            본다('다시 누르면 돌아옴', not 쪽.evaluate("() => ZG.문자주문.상태.발송모음") and 쪽.locator('.단계줄').is_visible())
            쪽.click('.발송칩'); 쪽.wait_for_timeout(200); 쪽.click('.날짜칸 button[aria-label="다음날"]'); 쪽.wait_for_timeout(200); 쪽.click('.날짜칸 button[aria-label="전날"]'); 쪽.wait_for_timeout(300)
            본다('🚚 목록에서 날짜를 누르면 돌아옴', not 쪽.evaluate("() => ZG.문자주문.상태.발송모음"))
            단계('주문'); 쪽.click('.날짜칸 button[aria-label="다음날"]'); 쪽.wait_for_timeout(250)
            본다('고른 단계는 날짜를 넘겨도 그대로 · 이 기기에 기억', 쪽.evaluate("() => ZG.문자주문.상태.단계") == '주문' and 단계글()[2][1] and 쪽.evaluate("() => localStorage.getItem('zg.v3.문자단계')") == '주문')
            쪽.screenshot(path=str(여기 / ('7-단계줄-' + 틀 + '.png')), animations='disabled')
            쪽.click('.날짜칸 button[aria-label="전날"]'); 쪽.wait_for_timeout(250)
            쪽.screenshot(path=str(여기 / ('6-날짜줄-' + 틀 + '.png')), animations='disabled')
            본다('가운데 날짜 「YYYY.MM.DD (요일)」 · 폰 2판은 「MM.DD (요일)」', 쪽.locator('.날짜칸 .오늘날').inner_text().startswith((오늘[5:] if 폰 else 오늘).replace('-', '.')))
            쪽.click('.날짜칸 button[aria-label="전날"]'); 쪽.wait_for_timeout(250)
            어제 = 쪽.evaluate("() => ZG.문자주문.상태.날짜")
            쪽.click('.날짜칸 button[aria-label="다음날"]'); 쪽.wait_for_timeout(250)
            본다('‹ › 하루씩', 어제 < 오늘 and 쪽.evaluate("() => ZG.문자주문.상태.날짜") == 오늘, 어제)
            쪽.click('.날짜칸 .오늘날'); 쪽.wait_for_timeout(250)
            본다('가운데 누르면 달력 팝업', 쪽.locator('.askbox.달력창 .cal').count() == 1)
            쪽.screenshot(path=str(여기 / ('5-달력창-' + 틀 + '.png')), animations='disabled')
            쪽.click('.askbox.달력창 .calhd button[aria-label="지난 달"]'); 쪽.wait_for_timeout(150)
            쪽.click('.askbox.달력창 .cal button.d >> nth=0'); 쪽.wait_for_timeout(300)
            본다('달 넘겨 날 누르면 닫히고 그날로', 쪽.locator('.askbox').count() == 0 and 쪽.evaluate("() => ZG.문자주문.상태.날짜").endswith('-01') and 쪽.evaluate("() => ZG.문자주문.상태.날짜") < 오늘)
            쪽.evaluate("(d) => { ZG.문자주문.상태.날짜 = d; ZG.주문.다시그리기(); }", 오늘); 쪽.wait_for_timeout(300)
            # 두 기기가 같은 입금을 붙임 — 먼저 붙인 것(입금.때)이 이긴다
            쪽.evaluate("() => { const 저 = ZG.저장소, d = ZG.문자주문자료.하나('m1').입금.id; 저.바꾸기(저.키.문자주문, 'm10', { 입금: { id: d, 뗀: [], 때: Date.now() + 5000 } }); }")
            j2 = 판()
            본다('두 기기 동시 — 늦게 붙인 m10 은 지고 입금 전', j2['m1'][0] == '맞음' and j2['m10'][0] == '전', [j2['m1'], j2['m10']])
            쪽.evaluate("() => { const 저 = ZG.저장소; 저.바꾸기(저.키.문자주문, 'm10', { 입금: { id: '', 뗀: [] } }); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(200)
            # 올린 주문 — 입금 줄 없어도 「입금 ✓ (주문 올림)」 · 회색은 안 올린 것만 · 목록은 안 올린 것 위·오래된 것 위
            쪽.evaluate("""() => { const 저 = ZG.저장소, 품 = 저.품목들()[1], 지금 = Date.now(), 오늘 = ZG.ui.오늘문자();
              [['m11', '송올림', 3], ['m12', '송옛올림', 24 * 9], ['m13', '송새올림', 0.5]].forEach(([id, 이름, 시간]) => 저.덧붙이기(저.키.문자주문, { id, 날짜: 시간 > 24 ? '2026-10-01' : 오늘, 받는분: 이름, 전화: '', 주소: '서울 어딘가로 1',
                품목: [{ 품목코드: 품.품목코드, 유통명: 품.유통명, 수량: 1, 단가: 777 }], 배송비: 0, 상태: '올림', 올린주문번호: 'x', 등록일시: 지금 - 시간 * 36e5, 수정일시: 0 }));
              저.바꾸기(저.키.문자주문, 'm11', { 올린일시: 지금 - 0.1 * 36e5 });   // 3시간 전에 만들고 6분 전에 올림 → 30분 전에 만들어 올린 시각 없는 m13 보다 위
              저.바꾸기(저.키.문자주문, 'm7', { 등록일시: 지금 - 5 * 36e5 }); ZG.주문.다시그리기(); }""")
            쪽.wait_for_timeout(300)
            단계('주문')
            본다('올린 주문 — 「입금 ✓ (주문 올림)」 초록 · 9일 지난 것도', any(t == '입금 ✓ (주문 올림)' for t in 띠글('송올림')) and 쪽.evaluate("() => { const e = ZG.입금매칭.띠(ZG.문자주문자료.하나('m12'), undefined); return e && e.className === '입금띠 올림'; }"), 띠글('송올림'))
            본다('회색 「입금 전」은 안 올린 것만', all(v[0] != '전' for k, v in 판().items() if k in ('m11', 'm12', 'm13')))
            화면 = []
            for _k in ('전', '입금', '주문', '발송'): 단계(_k); 화면 += 이름들()
            기대 = 쪽.evaluate("() => { const 자 = ZG.문자주문자료, 판 = ZG.입금매칭.판정(), 색 = 자.발송색인(), 때 = r => (r.상태 === '올림' && r.올린일시) || r.등록일시; const 구 = r => r.상태 === '올림' ? (자.발송정보(r, 색).됨 ? 3 : 2) : (판[r.id] && 판[r.id].결 === '맞음' ? 1 : 0); const 볼 = r => 판[r.id] && /확인|다름|고름/.test(판[r.id].결) ? 1 : 0; return 자.전부().filter(r => r.날짜 === ZG.ui.오늘문자()).sort((a, b) => 구(a) - 구(b) || 볼(b) - 볼(a) || 때(b) - 때(a)).map(r => r.받는분); }")
            본다('차례 — 구역(입금 전 → 입금완료 → 주문완료 → 발송완료) · 입금 전은 손으로 볼 것 먼저 · 그 안 최신이 위 · 올린 것은 올린 시각(송올림 6분 전 → 송새올림 30분 전)', 화면 == 기대 and 화면.index('송올림') < 화면.index('송새올림'), 화면)
            m11시 = 쪽.evaluate("() => { const d = new Date(ZG.문자주문자료.하나('m11').올린일시); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }")
            단계('주문')
            본다('올린 줄 시각 칸 = 올린 시각', m11시 in 쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("송올림")').first.inner_text(), m11시)
            단계('전')
            쪽.screenshot(path=str(여기 / ('1-띠-' + 틀 + '.png')), full_page=폰, animations='disabled')

            # 빨강 → 맞음(김두용) — 고정 · 초록 · 올릴까요
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("김두용") .입금띠').first.click(); 쪽.wait_for_timeout(300)
            창 = 쪽.inner_text('.askbox') if 쪽.query_selector('.askbox') else ''
            본다('빨강 누름 — 입금자명·금액·시각 · 맞음/아님', '김두용(제로가드닝)' in 창 and '15,000원' in 창 and '10:30' in 창 and '맞음' in 창 and '아님' in 창, 창.replace('\n', ' / '))
            쪽.screenshot(path=str(여기 / ('2-확인창-' + 틀 + '.png')), animations='disabled')
            쪽.click('.askbox button:has-text("맞음")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate("() => ZG.문자주문자료.하나('m21')")
            본다('맞음 — 짝 고정 · 초록 · 주소 있어 저절로 주문 올림', 판()['m21'][:3] == ['맞음', '김두용(제로가드닝)', True] and r['상태'] == '올림' and r.get('자동올림') is True)
            # 빨강 → 아님(이두환)
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("이두환") .입금띠').first.click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox button:has-text("아님")'); 쪽.wait_for_timeout(300)
            본다('아님 — 입금 전 · 뗀 목록', 판()['m22'][0] == '전' and 쪽.evaluate("() => ZG.문자주문자료.하나('m22').입금.뗀.length") == 1)
            # 골라 주세요 → 7,000
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("최둘") .입금띠').first.click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox button:has-text("7,000원")'); 쪽.wait_for_timeout(300)
            본다('골라 주세요 → 고른 입금 고정(금액 달라 주황)', 판()['m24'][:3] == ['다름', '최둘', True], 판()['m24'])
            # 초록 떼어 내기(m1) → m1 입금 전 · 그 입금은 같은 이름 m10 에 새로 고정
            단계('입금')
            쪽.locator(('.문카드' if 폰 else 'tr') + ':has-text("김가람") .입금띠.맞음').first.click(); 쪽.wait_for_timeout(300)
            쪽.click('.askbox button:has-text("떼어 내기")'); 쪽.wait_for_timeout(300)
            j = 판(); r = 쪽.evaluate("() => ZG.문자주문자료.하나('m1')")
            본다('떼어 내기 — m1 입금 전 · 뗀 목록 · 그 입금은 m10 에 새로 고정', j['m1'][0] == '전' and r['입금']['id'] == '' and len(r['입금']['뗀']) == 1 and j['m10'][:3] == ['맞음', '김가람', True], [j['m1'], j['m10']])

            # 김두용 — 자동으로 올라간 주문 줄 확인 · 박 정확(주소 없음)은 입금완료에 남음
            r = 쪽.evaluate("() => ZG.문자주문자료.하나('m21')")
            주 = 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === 'm21')")
            본다('자동 올림 — 주문 줄 1 · 주소 · 짝 남김 · 띠 초록', len(주) == 1 and '광교중앙로 145' in 주[0]['수령인주소'] and r['입금']['id'].endswith(':15000:김두용(제로가드닝)') and 판()['m21'][0] == '맞음', [r['상태'], len(주)])
            본다('주소 넣으면 그때 자동 올림(박 정확)', 쪽.evaluate("() => ZG.문자주문자료.하나('m23').상태") != '올림')
            쪽.evaluate("() => { ZG.저장소.바꾸기(ZG.저장소.키.문자주문, 'm23', { 주소: '서울 어딘가로 23' }); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(300)
            본다('→ 주소 생기자 저절로 주문완료', 쪽.evaluate("() => ZG.문자주문자료.하나('m23').상태") == '올림')
            단계('주문')
            쪽.screenshot(path=str(여기 / ('3-올린뒤-' + 틀 + '.png')), full_page=폰, animations='disabled')

            # 저장하는 순간 — 그 이름 입금을 바로 찾아 짝 · 짧은 안내
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(400)
            쪽.evaluate("() => { const s = ZG.문자주문새문자.상태, 품 = ZG.저장소.품목들()[1]; s.담은것 = [Object.assign(ZG.문자주문자료.담을줄(품), { 단가: 2500 })]; ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(200)
            쪽.fill('.문자주문 input[placeholder="받는 분"]', '새손님'); 쪽.wait_for_timeout(250)
            쪽.click('.문자주문 .보냄줄 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            안 = [쪽.locator('.toast').nth(i).inner_text() for i in range(쪽.locator('.toast').count())]
            r = 쪽.evaluate("() => ZG.문자주문자료.전부().filter(r => r.받는분 === '새손님')[0]")
            본다('저장 직후 「새손님님 입금 있음 · 7,000원 · 시각」 · 짝 고정', any('새손님님 입금 있음 · 7,000원' in t and '10:50' in t for t in 안) and r['입금']['id'].endswith(':7000:새손님'), 안)
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(300)

            # 프리셋(20j) — 우람님이 골라 저장 · 품목·수량·배송비(무료배송)·문자 · 4자 · 5개 · 길게 눌러 고치기
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(400)
            S = lambda: 쪽.evaluate("() => JSON.parse(JSON.stringify(ZG.문자주문새문자.상태))")
            목 = lambda: 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.문자프리셋).목록 || []")
            본다('처음엔 ＋ 하나', 쪽.locator('.프리셋줄 .btn.프리셋').count() == 1 and 쪽.locator('.프리셋줄 .더').count() == 1)
            쪽.evaluate("""() => { const 품 = ZG.저장소.품목들(), 자 = ZG.문자주문자료, s = ZG.문자주문새문자.상태;
              s.담은것 = [Object.assign(자.담을줄(품[2]), { 수량: 3 }), Object.assign(자.담을줄(품[3]), { 수량: 2, 단가: 9000 })]; ZG.주문.다시그리기(); }""")
            쪽.wait_for_timeout(200)
            쪽.click('.문자주문 button:has-text("무료배송")'); 쪽.wait_for_timeout(150)
            쪽.click('.프리셋줄 .더'); 쪽.wait_for_timeout(200)
            쪽.fill('.askbox input', '봄세트한가득'); 쪽.wait_for_timeout(100)
            본다('이름 칸 4자까지', 쪽.input_value('.askbox input') == '봄세트한')
            쪽.click('.askbox button:has-text("저장")'); 쪽.wait_for_timeout(300)
            기 = 쪽.input_value('.askbox.글창 textarea')
            본다('문자 칸 — 지금 견적 글 · 받는 분 자리 {이름}', '{이름} 님 주문 안내' in 기 and '무료배송' in 기, 기[:40].replace('\n', ' / '))
            쪽.fill('.askbox.글창 textarea', 기.replace('합계:', '🌸 봄 특가\n합계:')); 쪽.click('.askbox.글창 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            m = 목()
            본다('저장 — 이름·품목 2·수량·단가·무료배송·문자', len(m) == 1 and m[0]['이름'] == '봄세트한' and [x['수량'] for x in m[0]['품목']] == [3, 2] and m[0]['품목'][1]['단가'] == 9000 and m[0]['배송비'] == 0 and m[0]['무료배송'] is True and '봄 특가' in m[0]['문자'], m and {k: m[0][k] for k in ('이름', '배송비', '무료배송')})
            본다('단추 폭은 글자만큼', 쪽.evaluate("() => { const b = [...document.querySelectorAll('.프리셋줄 .btn.프리셋')]; return b[0].offsetWidth > b[1].offsetWidth; }"))
            # 비운 새 문자에서 누르면 셋이 한 번에
            쪽.evaluate("() => { const s = ZG.문자주문새문자.상태; s.담은것 = []; s.배송비 = 4500; s.무료배송 = false; s.문자글 = ''; ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(200)
            쪽.click('.프리셋줄 .btn.프리셋:has-text("봄세트한")'); 쪽.wait_for_timeout(300)
            s = S(); 말 = 쪽.inner_text('.문자주문 .말풍선')
            본다('누름 — 품목·수량·무료배송·문자가 한 번에', [x['수량'] for x in s['담은것']] == [3, 2] and s['배송비'] == 0 and s['무료배송'] and '봄 특가' in 말 and 말.split('\n')[1] == '주문 안내', 말[:60].replace('\n', ' / '))
            쪽.fill('.문자주문 input[placeholder="받는 분"]', '김가람'); 쪽.wait_for_timeout(300)
            본다('받는 분 넣으면 {이름} 자리에', '김가람 님 주문 안내' in 쪽.inner_text('.문자주문 .말풍선'))
            쪽.click('.문자주문 .보냄줄 button:has-text("저장")'); 쪽.wait_for_timeout(300)
            r = 쪽.evaluate("() => { const r = ZG.문자주문자료.전부().filter(r => r.받는분 === '김가람' && r.문자글)[0]; return r && { 글: ZG.문자주문자료.문자내용(r), 무료: r.무료배송 }; }")
            본다('저장한 줄도 프리셋 문자로(다시 보내기도 같은 글)', r and '봄 특가' in r['글'] and '김가람 님 주문 안내' in r['글'] and r['무료'], r)
            쪽.click('.새문자칩'); 쪽.wait_for_timeout(300)   # 저장하면 목록(메인) — 다시 새 문자로
            쪽.click('.프리셋줄 .btn.프리셋:has-text("봄세트한")'); 쪽.wait_for_timeout(300)
            쪽.evaluate("() => { ZG.문자주문새문자.상태.담은것[0].수량 = 4; ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(300)
            말 = 쪽.inner_text('.문자주문 .말풍선')
            본다('수량을 바꾸면 보통 견적 글로(금액 안 어긋나게)', '봄 특가' not in 말 and '4개X' in 말, 말[:50].replace('\n', ' / '))
            # 길게 누름(PC 는 오른쪽 단추) → 이름 바꾸기
            b = 쪽.locator('.프리셋줄 .btn.프리셋:has-text("봄세트한")')
            if 폰:
                bb = b.bounding_box(); 쪽.mouse.move(bb['x'] + 5, bb['y'] + 5); 쪽.mouse.down(); 쪽.wait_for_timeout(700); 쪽.mouse.up()
            else: b.click(button='right')
            쪽.wait_for_timeout(300)
            본다('길게 누름 — 고치기 메뉴 넷', 쪽.locator('.askbox .picklist button').count() == 4 and 쪽.evaluate("() => ZG.문자주문새문자.상태.담은것[0].수량") == 4)
            쪽.click('.askbox button:has-text("이름 바꾸기")'); 쪽.wait_for_timeout(200)
            쪽.fill('.askbox input', '봄세트'); 쪽.click('.askbox button:has-text("저장")'); 쪽.wait_for_timeout(300)
            본다('이름 바꿈', [x['이름'] for x in 목()] == ['봄세트'])
            # 5개까지 · 폰 한 줄
            쪽.evaluate("() => { const 저 = ZG.저장소, m = 저.읽기(저.키.문자프리셋).목록; ['가을모음', '작약다섯', '수국셋', '튤립'].forEach(n => m.push(Object.assign({}, m[0], { 이름: n }))); 저.전체쓰기(저.키.문자프리셋, { 목록: m }); ZG.주문.다시그리기(); }")
            쪽.wait_for_timeout(300)
            위 = 쪽.evaluate("() => [...document.querySelectorAll('.프리셋줄 .btn.프리셋')].map(b => Math.round(b.getBoundingClientRect().top))")
            본다('5개 — ＋ 사라짐 · 한 줄', len(위) == 5 and len(set(위)) == 1 and 쪽.locator('.프리셋줄 .더').count() == 0, 위)
            쪽.screenshot(path=str(여기 / ('4-프리셋-' + 틀 + '.png')), full_page=폰, animations='disabled')
            b = 쪽.locator('.프리셋줄 .btn.프리셋:has-text("튤립")')
            if 폰:
                bb = b.bounding_box(); 쪽.mouse.move(bb['x'] + 5, bb['y'] + 5); 쪽.mouse.down(); 쪽.wait_for_timeout(700); 쪽.mouse.up()
            else: b.click(button='right')
            쪽.wait_for_timeout(300); 쪽.click('.askbox button:has-text("지우기")'); 쪽.wait_for_timeout(200)
            쪽.click('.askbox button:has-text("지우기")'); 쪽.wait_for_timeout(300)
            본다('지우기 — 4개 · ＋ 돌아옴', [x['이름'] for x in 목()] == ['봄세트', '가을모음', '작약다섯', '수국셋'] and 쪽.locator('.프리셋줄 .더').count() == 1)
            본다('콘솔 빨간 에러 0 (' + 틀 + ')', not 쪽._오류, 쪽._오류[:3])
            쪽.close()

        # ── 01b 받는 길 — 가짜 서버에서 입금 줄을 받아 띠가 서고, 실시간으로 지우고 더한다
        print('\n[01b 가짜 서버]')
        오늘 = time.strftime('%Y-%m-%d')
        자 = {'문자주문': [{'id': 's1', '내용': {'id': 's1', '날짜': 오늘, '받는분': '서버받음', '전화': '', '주소': '서울 어딘가로 1', '품목': [{'품목코드': 'X-10', '유통명': '시험풀', '수량': 1, '단가': 5500}], '배송비': 4500, '상태': '보냄', '등록일시': int(time.time() * 1000) - 3600e3, '수정일시': 0}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'}],
              '공유설정': [{'id': '입금:%sT08:00:10000:서버받음' % 오늘, '내용': {'은행': '농협', '이름': '서버받음', '금액': 10000, '시각': 오늘 + 'T08:00:00+09:00', '입구': '시험'}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'},
                          {'id': '문자프리셋', '내용': {'목록': [{'이름': '서버셋', '품목': [], '배송비': 4500, '무료배송': False, '문자': ''}]}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'},
                          {'id': '동봉카드설정', '내용': {}, '삭제됨': False, '수정시각': '2026-11-10T00:00:00+00:00'}]}
        쪽 = 쪽열기(브, False, 'window.__가짜자료 = ' + json.dumps(자, ensure_ascii=False) + ';' + 가짜)
        쪽.wait_for_function("() => Object.keys(ZG.입금줄 || {}).length > 0", timeout=10000)
        본다('처음 받기 — 입금 줄이 ZG.입금줄 로(로컬 저장 없음)', list(쪽.evaluate("() => ZG.입금줄").keys()) == [자['공유설정'][0]['id']] and not 쪽.evaluate("() => Object.keys(localStorage).some(k => k.indexOf('입금') >= 0)"))
        본다('프리셋 — 공유설정 한 줄을 받아 이 기기에(기기 사이 같이)', [x['이름'] for x in 쪽.evaluate("() => ZG.저장소.읽기(ZG.저장소.키.문자프리셋).목록 || []")] == ['서버셋'])
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
