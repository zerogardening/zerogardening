# -*- coding: utf-8 -*-
# 18단계 ② 주문탭 → 예약 보관 이동 · 되살림 — python3 v3/검수/18-예약/넘김-시험.py
# 🔴 로컬 전용 — supabase CDN·서버 주소를 막는다. 서버 되읽기는 가짜 클라이언트로만 시험한다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '18-예약'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 != '' else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8797', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8797/%EC%A3%BC%EB%AC%B8.html'

# 시험 도구 — 페이지 안 window.T
도구 = """() => {
  const 저 = ZG.저장소, 키 = 저.키, 자 = ZG.문자주문자료, 예 = ZG.예약자료, 오늘 = ZG.ui.오늘문자(), ps = 저.품목들();
  const st = (p, n, 서비스) => { const c = String(p.품목코드), i = c.lastIndexOf('-');
    return { 접두: c.slice(0, i), cm: c.slice(i + 1), 유통명: p.유통명, 학명: p.학명 || '', 수량: n, 단가: 3000, 원코드: c, 서비스: !!서비스 }; };
  const 날 = (n) => { const d = new Date(+오늘.slice(0,4), +오늘.slice(5,7)-1, +오늘.slice(8,10) + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const T = window.T = {
    오늘, 날, 키,
    주문: () => 저.읽기(키.주문), 출고: () => 저.읽기(키.출고), 문: () => 저.읽기(키.문자주문),
    줄들: (이름) => 저.읽기(키.주문).filter(o => o.수령인 === 이름),
    건: (이름) => ZG.주문자료.건으로묶기(T.줄들(이름))[0],
    수동: (이름, 전화, 목록, 바탕더) => 목록.map(([i, n, 서비스, 출처]) => {
      const 바탕 = Object.assign({ 주문번호: '', 판매처: '수동', 출처: 출처 || '수동', 묶음id: '' }, 바탕더 || {});
      if (출처 && 출처 !== '수동') 바탕.판매처 = 출처;
      const 줄 = 저.덧붙이기(키.주문, ZG.주문입력.줄만들기(st(ps[i % ps.length], n, 서비스), { 이름, 전화, 주소: '경기 가평군 설악면 유명로 1834' }, 오늘, '수동', 바탕));
      if (서비스) ZG.서비스품목.출고맞추기(줄);
      return 줄.id; }),
    문자올림: (이름, 전화, 목록, 배송비) => {
      const r = 자.새로저장({ 받는분: 이름, 전화, 품목: 목록.map(([i, n]) => Object.assign(자.담을줄(ps[i % ps.length]), { 수량: n })), 배송비: 배송비 || 0 }, true);
      const 답 = 자.주문올리기(r.id, { 받는분: 이름, 전화, 주소: '서울 마포구 성미산로 21' });
      return { id: r.id, 번호: 답.번호 }; },
    서비스더하기: (이름, i, n) => { const 첫 = T.줄들(이름)[0];
      const 줄 = 저.덧붙이기(키.주문, ZG.주문입력.줄만들기(st(ps[i % ps.length], n, true), { 이름, 전화: 첫.수령인전화, 주소: 첫.수령인주소 }, 오늘, '문자', 첫));
      ZG.서비스품목.출고맞추기(줄); return 줄.id; },
    나감: (id, 송장) => 저.덧붙이기(키.출고, { id: 'sh_t' + Math.random().toString(36).slice(2, 8), 출고일: 오늘, 품목코드: 'X', 수량: 1, 출처: '주문', 주문id: id, 운송장번호: 송장 || '', 등록일시: Date.now() }),
    예약들: () => 저.읽기(키.문자주문).filter(r => r.원본줄들),
    원본에: (id) => 저.읽기(키.문자주문).filter(r => (r.원본줄들 || []).some(o => o.id === id)),
    서비스출고: (id) => 저.읽기(키.출고).filter(s => s.주문id === id && s.출처 === '서비스').length
  };
  return true;
}"""

def PC시험(브):
    print('\nPC')
    쪽 = 브.new_page(viewport={'width': 1440, 'height': 1000})
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort()); 쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소); 쪽.wait_for_timeout(2000)
    쪽.evaluate("() => { ZG.시드.심기(); }")
    쪽.evaluate(도구)
    E = 쪽.evaluate
    E("""() => {
      T.수동('넘김윤서진', '010-7712-3345', [[20, 2], [21, 4]]);
      T.수동('넘김한결', '010-1212-3434', [[22, 1]]);
      T.수동('넘김박하늘', '010-3411-2174', [[23, 10]], null); T.수동('넘김마켓', '010-5555-0001', [[23, 1, false, '카페24']]);
      T.수동('넘김섞임', '010-5555-0002', [[24, 1]]); T.수동('넘김섞임', '010-5555-0002', [[25, 1, false, '카페24']]);
      const e = T.수동('넘김배송', '010-5555-0003', [[26, 1]]); T.나감(e[0], '11111111111');
      window.문F = T.문자올림('넘김문자', '010-6666-0001', [[27, 3]], 4500);
      T.서비스더하기('넘김문자', 28, 1);
      return true; }""")
    E("() => { ZG.견적탭.탭으로('주문'); ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(500)

    # ── 단추 — 고른 것 0 이면 꺼짐 · 마켓 · 섞인 건 꺼짐
    넘김 = lambda: 쪽.query_selector('.tbar button.넘김')
    본다('PC 「예약으로 넘기기」 단추 — 고른 것 없으면 꺼짐', 넘김() and 넘김().is_disabled())
    def 고르기(이름):
        쪽.click('button[aria-label="%s 고르기"]' % 이름); 쪽.wait_for_timeout(150)
    고르기('넘김마켓'); 본다('마켓 주문 고르면 꺼짐', 넘김().is_disabled()); 고르기('넘김마켓')
    고르기('넘김섞임'); 본다('마켓 줄 섞인 건 고르면 꺼짐', 넘김().is_disabled()); 고르기('넘김섞임')
    고르기('넘김배송'); 본다('배송완료 건은 단추 살아 있음', not 넘김().is_disabled())
    넘김().click(); 쪽.wait_for_timeout(300)
    본다('배송완료 건 — 누르면 ⛔ 토스트 · 팝업 안 뜸', '배송완료된 주문은 넘길 수 없음' in 쪽.inner_text('#토스트칸') and 쪽.query_selector('.askbox') is None)
    고르기('넘김배송')

    # ── 여러 건 넘기기 (예약일 정하기)
    고르기('넘김윤서진'); 고르기('넘김한결')
    본다('수동 두 건 — 단추 켜짐', not 넘김().is_disabled())
    넘김().click(); 쪽.wait_for_timeout(300)
    본다('확인 팝업 — 건 둘 · 결과줄 · 날짜 미정 기본', 쪽.query_selector_all('.넘김창 .넘김건').__len__() == 2 and '예약 리스트로 이동' in 쪽.inner_text('.넘김창 .결과줄')
         and 'on' in (쪽.get_attribute('.넘김창 .예약고름 button:has-text("날짜 미정")', 'class') or ''))
    쪽.screenshot(path=str(여기 / '4-넘김팝업-PC.png'), animations='disabled')
    쪽.click('.넘김창 .예약고름 button:has-text("예약일 정하기")'); 쪽.wait_for_timeout(150)
    본다('정하기 고르고 날 안 고르면 넘기기 꺼짐', 쪽.is_disabled('.넘김창 .btnrow button:has-text("예약으로 넘기기")'))
    d3 = E("() => T.날(3)"); 글 = E("(d) => ZG.예약화면.날글(d)", d3)
    if d3[:7] != E("() => T.오늘")[:7]: 쪽.click('.넘김창 .날짜판 .calhd button >> nth=1')
    쪽.click('.넘김창 .날짜판 button[aria-label="%s"]' % 글); 쪽.wait_for_timeout(150)
    쪽.screenshot(path=str(여기 / '4b-넘김팝업-날짜-PC.png'), animations='disabled')
    본다('날 고르면 켜짐', not 쪽.is_disabled('.넘김창 .btnrow button:has-text("예약으로 넘기기")'))
    쪽.click('.넘김창 .btnrow button:has-text("예약으로 넘기기")'); 쪽.wait_for_timeout(700)
    r = E("""() => ({ 남은: T.줄들('넘김윤서진').length + T.줄들('넘김한결').length, 예약: T.예약들().map(r => [r.받는분, r.예약일, r.원본줄들.length, r.예약]),
                     창: !!document.querySelector('.askbox'), 탭: ZG.견적탭.지금탭(), 갈래: ZG.문자주문.상태.갈래 })""")
    본다('넘김 — 주문에서 빠짐 · 예약 줄 둘(예약일 · 원본 2/1줄)', r['남은'] == 0 and sorted(r['예약']) == sorted([['넘김윤서진', d3, 2, True], ['넘김한결', d3, 1, True]]), r)
    본다('넘김 뒤 — 문자주문 탭 예약 갈래', not r['창'] and r['탭'] == '문자' and r['갈래'] == '예약', r)
    본다('옮긴 줄 보라 강조 둘 · 토스트 「외 1건」', len(쪽.query_selector_all('tbody tr.옮겨옴')) == 2 and '외 1건' in 쪽.inner_text('#토스트칸'))
    본다('옮긴 줄 「↩ 주문탭에서 옴」 칩', 쪽.query_selector('tr.옮겨옴 .옴') is not None)
    쪽.screenshot(path=str(여기 / '5-넘긴뒤-PC.png'), full_page=True, animations='disabled')
    본다('잠긴 예약 — 되살리기 막힘', '전이라 올릴 수 없습니다' in str(E("() => ZG.문자주문자료.주문올리기(T.예약들().find(r => r.받는분 === '넘김한결').id, {})")))

    # ── 원본 줄 펼친 판 — 예약칸만
    쪽.click('tr:has-text("넘김윤서진") td.fx'); 쪽.wait_for_timeout(300)
    본다('원본판 — 받는 분 입력칸 없음 · 예약칸 있음', 쪽.query_selector('.원본판') is not None and 쪽.query_selector('.원본판 input:not([readonly])') is None and 쪽.query_selector('.원본판 .예약필드') is not None)
    쪽.screenshot(path=str(여기 / '6-원본판-PC.png'), full_page=True, animations='disabled')
    쪽.click('.원본판 .예약고름 button:has-text("날짜 미정")'); 쪽.click('.원본판 button:has-text("저장")'); 쪽.wait_for_timeout(300)
    r = E("() => { const r = T.예약들().find(r => r.받는분 === '넘김윤서진'); return [r.예약, r.예약일, r.품목.length, r.원본줄들.length]; }")
    본다('원본판 저장 — 날짜 미정으로 · 품목 그대로', r == [True, '', 2, 2], r)
    r = E("() => { const r = T.예약들().find(r => r.받는분 === '넘김윤서진'); ZG.문자주문자료.고치기(r.id, { 받는분: '바뀜', 품목: [], 예약: true, 예약일: '' }); return ZG.문자주문자료.하나(r.id).받는분; }")
    본다('자료층 — 원본 줄은 사람·품목 안 받음', r == '넘김윤서진', r)

    # ── 문자 올림 건 + 서비스 줄 넘기기 (흡수)
    E("() => { ZG.견적탭.탭으로('주문'); ZG.주문.상태.고른 = {}; ZG.주문.다시그리기(); }"); 쪽.wait_for_timeout(400)
    고르기('넘김문자'); 넘김().click(); 쪽.wait_for_timeout(300)
    본다('문자 올림 건 팝업 — 문자주문 · 배송비 4,500', '문자주문' in 쪽.inner_text('.넘김창 .넘김건') and '배송비 4,500' in 쪽.inner_text('.넘김창 .합'), 쪽.inner_text('.넘김창 .합'))
    쪽.click('.넘김창 .btnrow button:has-text("예약으로 넘기기")'); 쪽.wait_for_timeout(700)
    r = E("""() => { const R = T.예약들().find(r => r.받는분 === '넘김문자'); const 옛 = ZG.문자주문자료.하나(문F.id);
      return { 옛없음: !옛, 상태: R.상태, 날짜: R.날짜 === T.오늘, 배송비: R.배송비, 원본: R.원본줄들.length, 품목: R.품목.length, 남은: T.줄들('넘김문자').length,
               서비스출고: R.원본줄들.filter(o => o.서비스).map(o => T.서비스출고(o.id)).join(), 예약일: R.예약일 }; }""")
    본다('흡수 — 옛 문자주문 지움 · 보냄 · 배송비 · 원본 2(서비스 포함) · 품목 1 · 날짜 미정', r['옛없음'] and r['상태'] == '보냄' and r['날짜'] and r['배송비'] == 4500 and r['원본'] == 2 and r['품목'] == 1 and r['남은'] == 0 and r['예약일'] == '', r)
    본다('서비스 출고 지움(재고 돌아옴)', r['서비스출고'] == '0', r)

    # ── 되살림 — 화면 주문올리기 (판 안 열고 바로)
    b = 쪽.query_selector('tr:has-text("넘김문자") td.상태칸 button:has-text("주문올리기")')
    본다('날짜 미정 원본 줄 — 주문올리기 열림', b and not b.is_disabled())
    b.click(); 쪽.wait_for_timeout(400)
    r = E("""() => { const R = ZG.문자주문자료.전부().find(r => r.받는분 === '넘김문자'); const 줄 = T.줄들('넘김문자');
      return { 판: !!document.querySelector('.올림판'), 상태: R.상태, 원본: R.원본줄들, 번호: R.올린주문번호, 줄수: 줄.length,
               같은id: 줄.every(o => o.문자주문id === R.id), 오늘: 줄.every(o => o.주문일 === T.오늘), 줄번호: 줄.map(o => o.주문번호),
               서비스출고: 줄.filter(o => o.서비스).map(o => T.서비스출고(o.id)).join(), 문F번호: 문F.번호 }; }""")
    본다('되살림 — 받는 분 판 안 열림 · 올림 · 원본 비움', not r['판'] and r['상태'] == '올림' and r['원본'] is None, r)
    본다('되살림 — 줄 2(서비스 포함) · 문자주문id · 오늘 · 원래 번호', r['줄수'] == 2 and r['같은id'] and r['오늘'] and r['번호'] == r['문F번호'] and set(r['줄번호']) == {r['문F번호']}, r)
    본다('되살림 — 서비스 출고 다시 생김', r['서비스출고'] == '1', r)
    # 되살린 뒤 삭제 — 서비스 줄·출고까지
    r = E("""() => { const R = ZG.문자주문자료.전부().find(r => r.받는분 === '넘김문자'); const ids = T.줄들('넘김문자').map(o => o.id);
      const 답 = ZG.문자주문자료.올림지우기(R.id); return { 답, 남은: T.줄들('넘김문자').length, 출고: ids.map(T.서비스출고).reduce((a, b) => a + b, 0) }; }""")
    본다('되살린 뒤 올림 삭제 — 서비스 줄·출고까지', r['남은'] == 0 and r['출고'] == 0 and r['답'].get('지운주문수') == 1, r)

    # ── 🔴 번호 충돌 → 새 번호 · 출력번호 지움 · 발송완료
    r = E("""async () => {
      const X = T.문자올림('충돌엑스', '010-7000-0001', [[30, 1]], 3000);
      T.줄들('충돌엑스').forEach(o => ZG.저장소.바꾸기(T.키.주문, o.id, { 출력번호: 7 }));
      const 옮김 = await ZG.예약자료.옮기기([T.건('충돌엑스')], '');
      const Y = T.문자올림('충돌와이', '010-7000-0002', [[31, 1]], 3000);
      const R = T.예약들().find(r => r.받는분 === '충돌엑스');
      const 원번호 = R.원본줄들[0].주문번호;
      const 답 = ZG.문자주문자료.주문올리기(R.id, {});
      const 엑스 = T.줄들('충돌엑스'), 와이 = T.줄들('충돌와이');
      return { 옮김, X번호: X.번호, Y번호: Y.번호, 원번호, 답, 엑스번호: 엑스.map(o => o.주문번호), 출력: 엑스.map(o => o.출력번호 === undefined),
               와이: 와이.map(o => [o.주문번호, o.문자주문id === Y.id]), Rid: R.id, Yid: Y.id }; }""")
    본다('충돌 상황 — 옮긴 뒤 다른 문자주문이 같은 번호를 받음', r['옮김'].get('새id들') and r['Y번호'] == r['X번호'] == r['원번호'], r)
    본다('되살림 — 번호 충돌이면 새 번호', r['답'].get('번호') and r['답']['번호'] != r['원번호'] and r['엑스번호'] == [r['답']['번호']], r)
    본다('되살림 — 출력번호 지움 · 남의 주문(와이) 그대로', all(r['출력']) and r['와이'] == [[r['Y번호'], True]], r)
    r = E("""(a) => { const [Rid, Yid] = a; T.줄들('충돌엑스').forEach(o => T.나감(o.id, '22222222222'));
      const 자 = ZG.문자주문자료, R = 자.하나(Rid), Y = 자.하나(Yid);
      return { R: 자.발송정보(R), Y: 자.발송정보(Y), 지움: 자.올림지우기(Rid) }; }""", [r['Rid'], r['Yid']])
    본다('되살린 뒤 발송완료 — 제 줄로 잡힘 · 남의 주문은 안 잡힘', r['R']['됨'] and r['R']['송장'] == ['22222222222'] and not r['Y']['됨'], r)
    본다('발송완료 뒤 올림 삭제 막힘', '배송완료' in str(r['지움'].get('오류', '')), r['지움'])

    # ── 🔴 끊김 1 — 예약 줄 쓴 뒤 주문 지우기 전에 멈춤 → 재시도 멱등
    r = E("""async () => {
      T.수동('끊김지', '010-8000-0001', [[32, 1], [33, 2]]);
      const g = T.건('끊김지'), 저 = ZG.저장소, 옛 = 저.지우기;
      저.지우기 = function (k, id) { if (k === T.키.주문) throw new Error('끊김'); return 옛.apply(this, arguments); };
      const 첫 = await ZG.예약자료.옮기기([g], '');
      저.지우기 = 옛;
      const 중간 = { 예약: T.원본에(g.줄들[0].id).length, 남은: T.줄들('끊김지').length };
      const 둘 = await ZG.예약자료.옮기기([g], '');
      return { 첫, 중간, 둘, 예약: T.원본에(g.줄들[0].id).map(r => r.원본줄들.length), 남은: T.줄들('끊김지').length }; }""")
    본다('끊김(지우기 전) — 오류 · 예약 줄 1 · 주문 그대로', r['첫'].get('오류') and r['중간'] == {'예약': 1, '남은': 2}, r)
    본다('재시도 — 예약 줄 그대로 하나 · 주문 지움', r['둘'].get('새id들') and r['예약'] == [2] and r['남은'] == 0, r)

    # ── 🔴 끊김 2 — 주문 한 줄 지운 뒤 멈춤 → 재시도
    r = E("""async () => {
      T.수동('끊김반', '010-8000-0002', [[34, 1], [35, 2]]);
      const g = T.건('끊김반'), 저 = ZG.저장소, 옛 = 저.지우기; let n = 0;
      저.지우기 = function (k, id) { if (k === T.키.주문 && ++n === 2) throw new Error('끊김'); return 옛.apply(this, arguments); };
      const 첫 = await ZG.예약자료.옮기기([g], '');
      저.지우기 = 옛;
      const 중간 = T.줄들('끊김반').length;
      const 둘 = await ZG.예약자료.옮기기([g], '');
      return { 첫, 중간, 둘, 예약: T.원본에(g.줄들[0].id).map(r => r.원본줄들.length), 남은: T.줄들('끊김반').length }; }""")
    본다('끊김(반쯤 지움) — 오류 · 한 줄 남음', r['첫'].get('오류') and r['중간'] == 1, r)
    본다('재시도 — 예약 줄 하나(원본 2줄) · 남은 줄 지움 · 중복 없음', r['둘'].get('새id들') and r['예약'] == [2] and r['남은'] == 0, r)

    # ── 🔴 되살리기 끊김 — 한 줄만 들어간 상태에서 다시 누름
    r = E("""async () => {
      T.수동('되끊김', '010-8000-0003', [[36, 1], [37, 1]]);
      await ZG.예약자료.옮기기([T.건('되끊김')], '');
      const R = T.예약들().find(r => r.받는분 === '되끊김');
      const 반 = Object.assign({}, R.원본줄들[0], { 주문번호: '', 주문일: T.오늘, 문자주문id: R.id });
      ZG.저장소.덧붙이기(T.키.주문, 반);
      const 답 = ZG.문자주문자료.주문올리기(R.id, {});
      const 줄 = T.줄들('되끊김');
      return { 답, 줄수: 줄.length, id들: 줄.map(o => o.id).sort().join() === R.원본줄들.map(o => o.id).sort().join() }; }""")
    본다('되살리기 재시도 — 있는 줄 건너뜀 · 두 벌 없음', r['답'].get('번호') is not None and r['줄수'] == 2 and r['id들'], r)

    # ── 되살린 뒤 다시 옮기기 — 올림 줄을 흡수해 새 예약 줄
    r = E("""async () => {
      const 옛 = ZG.문자주문자료.전부().find(r => r.받는분 === '되끊김');
      const 답 = await ZG.예약자료.옮기기([T.건('되끊김')], '');
      return { 답, 옛없음: !ZG.문자주문자료.하나(옛.id), 예약: T.예약들().filter(r => r.받는분 === '되끊김').map(r => [r.상태, r.원본줄들.length]), 남은: T.줄들('되끊김').length }; }""")
    본다('되살린 뒤 다시 옮김 — 올림 줄 흡수 · 새 예약 줄 하나', r['답'].get('새id들') and r['옛없음'] and r['예약'] == [['저장', 2]] and r['남은'] == 0, r)

    # ── 🔴 서버 되읽기 — 못 맞으면 지우지 않는다 · 맞으면 이어서
    r = E("""async () => {
      T.수동('서버확인', '010-8000-0004', [[38, 1]]);
      const g = T.건('서버확인'), 서 = ZG.서버, 옛 = { 켜짐: 서.켜짐, 클라이언트: 서.클라이언트 }, 옛깨우기 = ZG.보내기.깨우기;
      let 모드 = 'empty', 읽음 = 0;
      const 가짜 = { from: () => ({
        select: () => ({ in: (c, ids) => { 읽음++; return Promise.resolve({ data: 모드 === 'empty' ? [] :
          ZG.문자주문자료.전부().filter(r => ids.includes(r.id)).map(r => ({ id: r.id, 내용: JSON.parse(JSON.stringify(r)), 삭제됨: false })), error: null }); } }),
        upsert: () => Promise.resolve({ error: null }) }) };
      서.켜짐 = true; 서.클라이언트 = 가짜; ZG.보내기.깨우기 = () => Promise.resolve();
      try {
        const 첫 = await ZG.예약자료.옮기기([g], '');
        const 중간 = { 읽음, 남은: T.줄들('서버확인').length, 예약: T.원본에(g.줄들[0].id).length };
        모드 = 'echo';
        const 둘 = await ZG.예약자료.옮기기([g], '');
        return { 첫, 중간, 둘, 남은: T.줄들('서버확인').length, 예약: T.원본에(g.줄들[0].id).length };
      } finally { 서.켜짐 = 옛.켜짐; 서.클라이언트 = 옛.클라이언트; ZG.보내기.깨우기 = 옛깨우기; } }""")
    본다('서버 확인 실패 — 세 번 읽고 주문 그대로 · 오류 글', '서버에서 확인하지 못해' in str(r['첫'].get('오류', '')) and r['중간']['읽음'] == 3 and r['중간']['남은'] == 1 and r['중간']['예약'] == 1, r)
    본다('서버 확인 성공 — 이어서 지움 · 예약 줄 하나', r['둘'].get('새id들') and r['남은'] == 0 and r['예약'] == 1, r)

    # ── 지우기 확인 문구
    E("() => { ZG.견적탭.탭으로('문자'); ZG.문자주문.예약으로([]); }"); 쪽.wait_for_timeout(300)
    쪽.click('tr:has-text("넘김한결") td.fx'); 쪽.wait_for_timeout(300)
    쪽.click('.원본판 button:has-text("삭제")'); 쪽.wait_for_timeout(200)
    본다('원본 줄 지우기 — 「주문도 함께 없어집니다」', '주문도 함께 없어집니다' in 쪽.inner_text('.askbox'))
    쪽.keyboard.press('Escape')
    본다('콘솔 에러 없음', not 오류, 오류)
    쪽.close()

def 폰시험(브):
    print('\n폰')
    쪽 = 브.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    오류 = []
    쪽.on('pageerror', lambda e: 오류.append(str(e)))
    쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
    쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort()); 쪽.route('**supabase.co**', lambda r: r.abort())
    쪽.add_init_script(심기)
    쪽.goto(주소); 쪽.wait_for_timeout(2000)
    쪽.evaluate("() => { ZG.시드.심기(); }")
    쪽.evaluate(도구)
    E = 쪽.evaluate
    E("""() => { T.수동('폰윤서진', '010-7712-3345', [[20, 2], [21, 4]]);
      T.수동('폰마켓', '010-5555-0001', [[23, 1, false, '카페24']]);
      const e = T.수동('폰배송', '010-5555-0003', [[26, 1]]); T.나감(e[0], '11111111111'); return true; }""")
    def 상세(이름):
        E("(이름) => { ZG.견적탭.탭으로('주문'); ZG.주문.열기('상세', T.건(이름).묶음키); }", 이름); 쪽.wait_for_timeout(400)
        return 쪽.query_selector('button.넘김큰')
    b = 상세('폰마켓'); 본다('폰 마켓 주문 — 단추 꺼짐', b and b.is_disabled())
    b = 상세('폰배송'); b.click(); 쪽.wait_for_timeout(300)
    본다('폰 배송완료 — 누르면 ⛔ 토스트', '배송완료된 주문은 넘길 수 없음' in 쪽.inner_text('#토스트칸') and 쪽.query_selector('.askbox') is None)
    b = 상세('폰윤서진'); 본다('폰 수동주문 상세 — 단추 켜짐', b and not b.is_disabled())
    쪽.screenshot(path=str(여기 / '4-넘김단추-폰.png'), animations='disabled')
    b.click(); 쪽.wait_for_timeout(300)
    본다('폰 팝업 — 한 건', len(쪽.query_selector_all('.넘김창.폰 .넘김건')) == 1)
    쪽.screenshot(path=str(여기 / '4b-넘김팝업-폰.png'), animations='disabled')
    쪽.click('.넘김창 .btnrow button:has-text("예약으로 넘기기")'); 쪽.wait_for_timeout(700)
    r = E("() => ({ 남은: T.줄들('폰윤서진').length, 예약: T.예약들().length, 탭: ZG.견적탭.지금탭(), 뷰: ZG.주문.상태.뷰, 갈래: ZG.문자주문.상태.갈래 })")
    본다('폰 넘김 — 주문 빠짐 · 예약 줄 · 문자주문 예약 갈래 · 주문 뷰는 목록', r == {'남은': 0, '예약': 1, '탭': '문자', '뷰': '목록', '갈래': '예약'}, r)
    본다('폰 — 옮긴 카드 보라 · 「주문탭에서 옴」', 쪽.query_selector('.문카드.옮겨옴 .옴') is not None)
    쪽.screenshot(path=str(여기 / '5-넘긴뒤-폰.png'), full_page=True, animations='disabled')
    쪽.click('.문카드.옮겨옴 .r1'); 쪽.wait_for_timeout(300)
    본다('폰 원본판 — 입력칸 없음 · 예약칸', 쪽.query_selector('.원본판') is not None and 쪽.query_selector('.원본판 .예약필드') is not None)
    쪽.screenshot(path=str(여기 / '6-원본판-폰.png'), full_page=True, animations='disabled')
    쪽.click('.원본판 button:has-text("주문올리기")'); 쪽.wait_for_timeout(400)
    r = E("() => ({ 줄: T.줄들('폰윤서진').length, 예약: T.예약들().length })")
    본다('폰 되살림 — 주문 2줄 돌아옴 · 예약 리스트에서 빠짐', r == {'줄': 2, '예약': 0}, r)
    본다('콘솔 에러 없음', not 오류, 오류)
    쪽.close()

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        PC시험(브)
        폰시험(브)
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
