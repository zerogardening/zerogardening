# -*- coding: utf-8 -*-
# 17단계 ④ 문자주문 올림 삭제 — 주문번호 재사용 — python3 v3/검수/17-개선/번호재사용-시험.py
# X 올림 → 주문탭에서 X 건 삭제 → 같은 날 Y 올림(같은 번호를 받음) → 문자주문에서 X 삭제해도 Y 는 그대로
# 🔴 로컬 전용 — supabase CDN 을 막아 서버에 아무것도 안 간다.
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
여기 = 뿌리 / '검수' / '17-개선'
심기 = "localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8795', '-d', str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
주소 = 'http://localhost:8795/%EC%A3%BC%EB%AC%B8.html'

# X 에 서비스 줄까지 얹고, 주문탭 건삭제(08c)와 같은 동작으로 X 건을 지운 뒤 Y 를 올린다
만들기 = """() => {
  const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들();
  const 사람 = (n, t) => ({ 받는분: n, 전화: t, 주소: '서울 종로구 1', 상세주소: '', 우편: '03000', 배송메시지: '' });
  const X = 자.새로저장({ 받는분: '시험취소', 전화: '01012120000', 품목: [자.담을줄(ps[10])] }, true);
  const x = 자.주문올리기(X.id, 사람('시험취소', '01012120000'));
  const g = ZG.주문자료.건으로묶기(저.읽기(저.키.주문).filter(o => o.문자주문id === X.id))[0];
  const p = ps[6], 자리 = p.품목코드.lastIndexOf('-');
  const st = { 접두: p.품목코드.slice(0, 자리), cm: Number(p.품목코드.slice(자리 + 1)) || p.품목코드.slice(자리 + 1), 유통명: p.유통명, 학명: p.학명, 수량: 2, 단가: 0, 원코드: p.품목코드, 서비스: true };
  ZG.서비스품목.출고맞추기(저.덧붙이기(저.키.주문, ZG.주문입력.줄만들기(st, { 이름: g.수령인, 전화: g.전화, 주소: g.주소 }, g.주문일, g.판매처, g.줄들[0])));
  저.읽기(저.키.주문).filter(o => o.주문번호 === x.번호).forEach(o => { 저.지우기(저.키.주문, o.id); ZG.서비스품목.출고지우기(o.id); });
  const Y = 자.새로저장({ 받는분: '시험새손님', 전화: '01034340000', 품목: [자.담을줄(ps[11]), 자.담을줄(ps[12])] }, true);
  const y = 자.주문올리기(Y.id, 사람('시험새손님', '01034340000'));
  ZG.문자주문.목록으로();
  return { X: X.id, Y: Y.id, x: x.번호, y: y.번호 };
}"""
상태 = """(m) => { const 저 = ZG.저장소, 주 = 저.읽기(저.키.주문);
  return { Y줄: 주.filter(o => o.주문번호 === m.y).length, Y문자id줄: 주.filter(o => o.문자주문id === m.Y).length,
    X있나: !!ZG.문자주문자료.하나(m.X), Y있나: !!ZG.문자주문자료.하나(m.Y),
    서비스출고: 저.읽기(저.키.출고).filter(s => s.출처 === '서비스').length }; }"""

def 삭제누름(쪽, 폰, 이름):
    if 폰: 쪽.evaluate("b => b.click()", 쪽.query_selector('.쓸줄:has-text("%s") .쓸단추 button' % 이름))
    else: 쪽.click('tr:has-text("%s") .btn.del' % 이름)
    쪽.wait_for_timeout(300)

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
            m = 쪽.evaluate(만들기); 쪽.wait_for_timeout(500)
            전 = 쪽.evaluate(상태, m)
            본다('준비: Y 가 X 와 같은 번호를 받음 · Y 줄 2', m['x'] == m['y'] and 전['Y줄'] == 2, [m, 전])
            본다('지울줄(X) — 주문 줄 0', 쪽.evaluate("(id) => ZG.문자주문자료.지울줄(ZG.문자주문자료.하나(id)).length", m['X']) == 0)
            # Y 를 배송완료로 — X 가 Y 의 출고로 발송완료 판정되면 안 된다
            쪽.evaluate("(m) => ZG.배송완료.출고넣기(ZG.저장소.읽기(ZG.저장소.키.주문).filter(o => o.문자주문id === m.Y), ZG.ui.오늘문자(), null, { 배치: ZG.배송완료.새배치() })", m)
            발 = 쪽.evaluate("(m) => [ZG.문자주문자료.발송정보(ZG.문자주문자료.하나(m.X)).됨, ZG.문자주문자료.발송정보(ZG.문자주문자료.하나(m.Y)).됨]", m)
            본다('발송완료 판정 — X 아님 · Y 됨', 발 == [False, True], 발)
            쪽.evaluate("() => ZG.문자주문.목록으로()"); 쪽.wait_for_timeout(400)
            if not 폰:
                본다('PC X 줄엔 삭제 단추가 있다(발송완료로 잘못 막히지 않음)', 쪽.query_selector('tr:has-text("시험취소") .btn.del') is not None)
            삭제누름(쪽, 폰, '시험취소')
            본다('1차 확인', 쪽.query_selector('.askbox') and '이 문자주문을 지울까요?' in 쪽.inner_text('.askbox'))
            쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(400)
            둘째 = 쪽.inner_text('.askbox') if 쪽.query_selector('.askbox') else ''
            본다('2차 확인 없이 지움', 둘째 == '', 둘째.replace('\n', ' '))
            후 = 쪽.evaluate(상태, m)
            본다('X 문자주문만 지워짐 · Y 주문 줄·문자주문 그대로', not 후['X있나'] and 후['Y있나'] and 후['Y줄'] == 2 and 후['Y문자id줄'] == 2, 후)
            토스트 = 쪽.evaluate("() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|')")
            본다('토스트에 「함께」 없음', '지웠습니다' in 토스트 and '함께' not in 토스트, 토스트)
            # 2차 확인 이름은 지울 줄의 수령인 — 주문탭에서 수령인을 고쳤으면 고친 이름
            m2 = 쪽.evaluate("""() => { const 자 = ZG.문자주문자료, 저 = ZG.저장소, ps = 저.품목들();
              const Z = 자.새로저장({ 받는분: '시험문자이름', 전화: '01056560000', 품목: [자.담을줄(ps[13])] }, true);
              const z = 자.주문올리기(Z.id, { 받는분: '시험문자이름', 전화: '01056560000', 주소: '서울', 상세주소: '', 우편: '', 배송메시지: '' });
              저.읽기(저.키.주문).filter(o => o.문자주문id === Z.id).forEach(o => 저.바꾸기(저.키.주문, o.id, { 수령인: '시험주문탭이름' }));
              ZG.문자주문.목록으로(); return { Z: Z.id, z: z.번호 }; }""")
            쪽.wait_for_timeout(400)
            삭제누름(쪽, 폰, '시험문자이름')
            쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(400)
            둘째 = 쪽.inner_text('.askbox') if 쪽.query_selector('.askbox') else ''
            본다('2차 확인 — 번호·주문탭 수령인', m2['z'] in 둘째 and '시험주문탭이름' in 둘째 and '시험문자이름' not in 둘째, 둘째.replace('\n', ' '))
            쪽.screenshot(path=str(여기 / ('문자-4-2차이름-' + 이름 + '.png')))
            쪽.click('.askbox .btn.warn'); 쪽.wait_for_timeout(400)
            본다('Z 함께 삭제됨 · Y 그대로', 쪽.evaluate("(m) => !ZG.문자주문자료.하나(m.Z) && !ZG.저장소.읽기(ZG.저장소.키.주문).some(o => o.주문번호 === m.z && o.문자주문id === m.Z)", m2) and 쪽.evaluate(상태, m)['Y줄'] == 2)
            본다('콘솔 에러 없음', not 오류, 오류)
            쪽.close()
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
