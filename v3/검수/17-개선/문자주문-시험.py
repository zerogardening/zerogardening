# -*- coding: utf-8 -*-
# 17단계 ④ 문자주문 고치기·올림 삭제 — python3 v3/검수/17-개선/문자주문-시험.py
# 🔴 로컬 전용 — supabase CDN 을 막아 서버에 아무것도 안 간다. 시험용 문자주문을 여기서 만들어 지운다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '17-개선'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8794', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8794/%EC%A3%BC%EB%AC%B8.html'

# 보냄 A · 저장 B · 올림 C(서비스 줄 하나 얹음) · 올림 D(발송완료)
만들기 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소;
  const ps = 저.품목들();
  const 줄 = (p, n) => Object.assign(자.담을줄(p), { 수량: n });
  const A = 자.새로저장({ 받는분: '시험보냄', 전화: '01011112222', 품목: [줄(ps[0], 3), 줄(ps[1], 2)], 배송비: 3000 }, true);
  const B = 자.새로저장({ 받는분: '시험저장', 전화: '01033334444', 품목: [줄(ps[2], 1)] }, false);
  const C = 자.새로저장({ 받는분: '시험올림', 전화: '01055556666', 품목: [줄(ps[3], 4), 줄(ps[4], 2)] }, true);
  const D = 자.새로저장({ 받는분: '시험발송', 전화: '01077778888', 품목: [줄(ps[5], 1)] }, true);
  const 사람 = r => ({ 받는분: r.받는분, 전화: r.전화, 주소: '서울 마포구 성미산로 21', 상세주소: '', 우편: '03980', 배송메시지: '' });
  const c = 자.주문올리기(C.id, 사람(C)), d = 자.주문올리기(D.id, 사람(D));
  // C 에 서비스 품목 — 08e 가 하는 그대로(문자주문id 없이 주문번호·판매처만 물려받는다)
  const g = ZG.주문자료.건으로묶기(저.읽기(저.키.주문).filter(o => o.문자주문id === C.id))[0];
  const p = ps[6], 자리 = p.품목코드.lastIndexOf('-');
  const st = { 접두: p.품목코드.slice(0, 자리), cm: Number(p.품목코드.slice(자리 + 1)) || p.품목코드.slice(자리 + 1), 유통명: p.유통명, 학명: p.학명, 수량: 2, 단가: 0, 원코드: p.품목코드, 서비스: true };
  const 서줄 = 저.덧붙이기(저.키.주문, ZG.주문입력.줄만들기(st, { 이름: g.수령인, 전화: g.전화, 주소: g.주소 }, g.주문일, g.판매처, g.줄들[0]));
  ZG.서비스품목.출고맞추기(서줄);
  // D 는 배송완료로 — 나간 줄이 생긴다
  const dj = 저.읽기(저.키.주문).filter(o => o.문자주문id === D.id);
  ZG.배송완료.출고넣기(dj, ZG.ui.오늘문자(), null, { 배치: ZG.배송완료.새배치() });
  ZG.문자주문.목록으로();
  return { A: A.id, B: B.id, C: C.id, D: D.id, c: c.번호, d: d.번호, 서비스코드: p.품목코드 };
}"""

상태보기 = """(m) => { const 저 = ZG.저장소;
  const 주문 = 저.읽기(저.키.주문), 출고 = 저.읽기(저.키.출고);
  const C줄 = 주문.filter(o => o.주문번호 === m.c && o.판매처 === '문자');
  return { C줄: C줄.length, C서비스: C줄.filter(o => o.서비스).length,
    서비스출고: 출고.filter(s => s.출처 === '서비스' && C줄.some(o => o.id === s.주문id)).length,
    전체서비스출고: 출고.filter(s => s.출처 === '서비스').length,
    C있나: !!ZG.문자주문자료.하나(m.C), D있나: !!ZG.문자주문자료.하나(m.D),
    D줄: 주문.filter(o => o.주문번호 === m.d).length,
    재고: ZG.계산.현재고(m.서비스코드, ZG.계산.장부()) }; }"""

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        for 폰 in (False, True):
            이름 = '폰' if 폰 else 'PC'
            print('\n' + 이름)
            쪽 = 브.new_page(viewport={'width': 390, 'height': 844} if 폰 else {'width': 1440, 'height': 1000},
                             device_scale_factor=2 if 폰 else 1)
            오류 = []
            쪽.on('pageerror', lambda e: 오류.append(str(e)))
            쪽.on('console', lambda m: 오류.append(m.text) if m.type == 'error' and 'jsdelivr' not in m.text and 'ERR_FAILED' not in m.text else None)
            쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
            쪽.route('**supabase.co**', lambda r: r.abort())
            쪽.add_init_script(심기)
            쪽.goto(주소); 쪽.wait_for_timeout(2000)
            쪽.evaluate("() => { ZG.시드.심기(); }")
            쪽.click('text=문자주문 >> nth=0'); 쪽.wait_for_timeout(500)
            m = 쪽.evaluate(만들기); 쪽.wait_for_timeout(600)
            전 = 쪽.evaluate(상태보기, m)
            본다('준비: C 줄 3(서비스 1)·서비스 출고 1', 전['C줄'] == 3 and 전['C서비스'] == 1 and 전['서비스출고'] == 1, 전)

            # ── 접힌 줄 — 보냄에도 💬 문자
            글 = 쪽.inner_text('.문자주문')
            본다('보냄 줄에도 「💬 문자」', 글.count('💬 문자') >= 2, 글.count('💬 문자'))

            # ── 보냄 A 펼치기
            쪽.click('text=시험보냄'); 쪽.wait_for_timeout(400)
            본다('보냄 펼침 「💬 다시 보내기」', 쪽.query_selector('button:has-text("다시 보내기")') is not None)
            받는칸 = 쪽.query_selector('.문자주문 input[placeholder="받는 분"]')
            받는칸.click(); 받는칸.fill('시험보냄고침'); 쪽.wait_for_timeout(100)
            쪽.click('.문자주문 .btn.빼기 >> nth=0'); 쪽.wait_for_timeout(300)
            본다('빼기 → 품목 1줄', len(쪽.query_selector_all('.문자주문 .btn.빼기')) == 1)
            본다('빼기 뒤 받는 분 글이 살아 있다', 쪽.evaluate("e => e.isConnected && e.value", 받는칸) == '시험보냄고침')
            추가 = 쪽.query_selector('.추가줄 input')
            찾을 = 쪽.evaluate("() => ZG.저장소.품목들()[7].유통명.slice(0, 2)")
            추가.click(); 추가.type(찾을, delay=50); 쪽.wait_for_timeout(400)
            본다('추가칸이 안 갈린다', 쪽.evaluate("e => e.isConnected && document.activeElement === e", 추가))
            본다('후보 목록이 뜬다', 쪽.query_selector('.추가줄 .ac .it') is not None)
            쪽.evaluate("() => document.querySelector('.추가줄').scrollIntoView({ block: 'center' })"); 쪽.wait_for_timeout(200)
            쪽.screenshot(path=str(여기 / ('문자-1-고침-' + 이름 + '.png')))
            쪽.click('.추가줄 .ac .it >> nth=0'); 쪽.wait_for_timeout(300)
            본다('담기 → 품목 2줄 · 검색칸 비움', len(쪽.query_selector_all('.문자주문 .btn.빼기')) == 2 and 추가.input_value() == '')
            추가.click(); 추가.type(찾을, delay=50); 쪽.wait_for_timeout(300); 쪽.keyboard.press('Enter'); 쪽.wait_for_timeout(300)
            본다('같은 품목 다시 담으면 줄은 그대로(수량 +1)', len(쪽.query_selector_all('.문자주문 .btn.빼기')) == 2)
            쪽.click('.문자주문 button:has-text("저장") >> nth=-1'); 쪽.wait_for_timeout(400)
            저장된 = 쪽.evaluate("(id) => { const r = ZG.문자주문자료.하나(id); return [r.받는분, r.품목.length, r.품목[1] && r.품목[1].수량]; }", m['A'])
            본다('저장 — 받는 분·품목 2·추가 수량 2', 저장된 == ['시험보냄고침', 2, 2], 저장된)
            # 품목 0 저장 거부
            쪽.click('text=시험보냄고침'); 쪽.wait_for_timeout(300)
            쪽.click('.문자주문 .btn.빼기 >> nth=0'); 쪽.wait_for_timeout(150); 쪽.click('.문자주문 .btn.빼기 >> nth=0'); 쪽.wait_for_timeout(150)
            쪽.click('.문자주문 button:has-text("저장") >> nth=-1'); 쪽.wait_for_timeout(300)
            토스트 = 쪽.evaluate("() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|')")
            남은 = 쪽.evaluate("(id) => ZG.문자주문자료.하나(id).품목.length", m['A'])
            본다('품목 0 이면 저장 거부·토스트', '품목이 하나는 있어야 합니다' in 토스트 and 남은 == 2, [토스트, 남은])
            본다('20a 고치기도 품목 0 거부', 쪽.evaluate("(id) => ZG.문자주문자료.고치기(id, { 받는분: 'x', 품목: [] }) === null", m['A']))
            쪽.evaluate("() => { ZG.문자주문.목록으로(); }"); 쪽.wait_for_timeout(400)

            # ── 발송완료 D 삭제 → 토스트로 막힘
            if 폰:
                쪽.evaluate("(id) => { const r = ZG.문자주문자료.하나(id); }", m['D'])
            D삭제 = 쪽.evaluate("""(m) => { const 자 = ZG.문자주문자료; const r = 자.하나(m.D);
              return [ZG.주문입력.나간줄(자.지울줄(r)).length, 자.올림지우기(m.D).오류 || ''] }""", m)
            본다('발송완료 줄은 올림지우기가 막는다', D삭제[0] >= 1 and '배송완료' in D삭제[1], D삭제)
            if 폰:
                카드 = 쪽.query_selector('.쓸줄:has-text("시험발송") .쓸단추 button')
                쪽.evaluate("b => b.click()", 카드); 쪽.wait_for_timeout(300)
            else:
                본다('PC 발송완료 줄엔 삭제 단추 없음', 쪽.query_selector('tr:has-text("시험발송") .btn.del') is None)
            if 폰:
                토스트 = 쪽.evaluate("() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|')")
                본다('폰 발송완료 카드 삭제 → 토스트·확인창 없음', '배송완료' in 토스트 and 쪽.query_selector('.askbox') is None, 토스트)

            # ── 올림 C 삭제 — 2단계
            if 폰:
                쪽.evaluate("b => b.click()", 쪽.query_selector('.쓸줄:has-text("시험올림") .쓸단추 button'))
            else:
                쪽.click('tr:has-text("시험올림") .btn.del')
            쪽.wait_for_timeout(300)
            본다('1차 확인', '이 문자주문을 지울까요?' in 쪽.inner_text('.askbox'))
            쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(300)
            둘째 = 쪽.inner_text('.askbox') if 쪽.query_selector('.askbox') else ''
            본다('2차 확인 — 주문 1건·번호', '주문 탭의 주문도 지울까요?' in 둘째 and '1건' in 둘째 and m['c'] in 둘째, 둘째.replace('\n', ' '))
            쪽.screenshot(path=str(여기 / ('문자-2-2차확인-' + 이름 + '.png')))
            쪽.click('.askbox .btn:has-text("취소")'); 쪽.wait_for_timeout(300)
            본다('2차 취소면 아무것도 안 지운다', 쪽.evaluate(상태보기, m)['C줄'] == 3)
            if 폰:
                쪽.evaluate("b => b.click()", 쪽.query_selector('.쓸줄:has-text("시험올림") .쓸단추 button'))
            else:
                쪽.click('tr:has-text("시험올림") .btn.del')
            쪽.wait_for_timeout(200); 쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(200); 쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(400)
            후 = 쪽.evaluate(상태보기, m)
            본다('지운 뒤 — 주문 줄 0·서비스 출고 0·문자주문 없음', 후['C줄'] == 0 and 후['서비스출고'] == 0 and not 후['C있나'], 후)
            본다('재고가 서비스 수량(2)만큼 돌아옴', 후['재고'] == 전['재고'] + 2, [전['재고'], 후['재고']])
            본다('발송완료 D 는 그대로', 후['D있나'] and 후['D줄'] >= 1)
            토스트 = 쪽.evaluate("() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|')")
            본다('토스트 「지웠습니다 — 주문 1건 함께」', '주문 1건 함께' in 토스트, 토스트)
            쪽.screenshot(path=str(여기 / ('문자-3-지운뒤-' + 이름 + '.png')))
            # 주문탭에서 먼저 지운 올림 → 2차 없이
            m2 = 쪽.evaluate("""() => { const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들();
              const E = 자.새로저장({ 받는분: '시험먼저지움', 전화: '01099990000', 품목: [자.담을줄(ps[8])] }, true);
              자.주문올리기(E.id, { 받는분: E.받는분, 전화: E.전화, 주소: '서울', 상세주소: '', 우편: '', 배송메시지: '' });
              저.읽기(저.키.주문).filter(o => o.문자주문id === E.id).forEach(o => 저.지우기(저.키.주문, o.id));
              ZG.문자주문.목록으로(); return E.id; }""")
            쪽.wait_for_timeout(300)
            if 폰:
                쪽.evaluate("b => b.click()", 쪽.query_selector('.쓸줄:has-text("시험먼저지움") .쓸단추 button'))
            else:
                쪽.click('tr:has-text("시험먼저지움") .btn.del')
            쪽.wait_for_timeout(200); 쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(300)
            본다('주문 줄 없으면 2차 없이 지움', 쪽.query_selector('.askbox') is None and not 쪽.evaluate("(id) => !!ZG.문자주문자료.하나(id)", m2))
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
