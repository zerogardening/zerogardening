# -*- coding: utf-8 -*-
# 송장·동봉카드 출력번호 = 「뽑은 날(한국시간)」 일련번호 (2026-10-23 우람님 지시)
#   python3 v3/검수/33-송장번호/송장번호-시험.py
# 고치기 전: 날을 묶음id(주문 받은 날)로 갈라 — 주말 주문을 월요일에 뽑으면 토요일에 이어 붙고,
#            월요일 추가 출력(월요일 받은 주문)은 1번부터 다시 나왔다.
# 시계는 Date.now 를 바꿔 돌린다(파일만 태움 · 서버 안 닿음).
import pathlib, re
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  ✓ ' if 참 else '  ✗ ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))

소스 = (뿌리 / 'js' / '08h-주문올리기.js').read_text(encoding='utf-8')
m = re.search(r'  function 로젠항목\(\) \{.*?\n  \}\n', 소스, re.S)
껍데기 = """<!doctype html><meta charset="utf-8"><body>
<script>
window.지금 = Date.UTC(2026, 9, 26, 1, 0);          // 10/26(월) 10:00 KST
Date.now = function () { return window.지금; };
</script>
<script src="../../js/01-저장소.js"></script>
<script src="../../js/02-품목코드.js"></script>
<script src="../../js/03-계산.js"></script>
<script src="../../js/04-공통UI.js"></script>
<script src="../../js/08a-주문자료.js"></script>
<script src="../../js/08i-로젠파일.js"></script>
<script>
var 상태 = null;
""" + m.group(0) + """
window.거르기 = function (항목들, 재발행) { 상태 = { 항목들: 항목들, 재발행: !!재발행 }; return 로젠항목(); };
window.칸 = function (n) {
  var o = new Array(27).fill('');
  o[2] = 'ORD' + n; o[3] = '2026-10-24'; o[4] = '테스트식물'; o[7] = 'TST01-15';
  o[11] = '10000'; o[12] = '1'; o[13] = '손님' + n; o[14] = String(10000 + n); o[15] = '어디시 어디구';
  o[18] = '0101234' + String(1000 + n);
  return o;
};
window.항목 = function (n, 묶음id, 덧) {
  var 줄 = Object.assign({ id: 'o' + n, 묶음id: 묶음id, 주문번호: 'ORD' + n, 주문일: '2026-10-24',
          수령인: '손님' + n, 우편번호: String(10000 + n), 품목코드: 'TST01-15', 수량: 1,
          핸드폰: '0101234' + String(1000 + n), 주소: '어디시 어디구' }, 덧 || {});
  return { 원본: 칸(n), id: 줄.id, 갈래: '새것', 줄: 줄 };
};
window.심기 = function (항목들) {
  var 저 = ZG.저장소;
  저.전체쓰기(저.키.주문, 저.읽기(저.키.주문).concat(항목들.map(function (것) { return 것.줄; })));
};
window.번호 = function (n) {
  var r = ZG.저장소.읽기(ZG.저장소.키.주문).filter(function (r) { return r.주문번호 === 'ORD' + n; })[0];
  return r ? [Number(r.출력번호) || 0, r.출력일 || ''] : null;
};
window.범위 = function (a, b) { var o = []; for (var i = a; i <= b; i++) o.push(번호(i)[0]); return o; };
window.뽑기 = function (것들, 묶음id) { return ZG.로젠파일.내보내기(것들, 'x.xlsx', { 묶음id: 묶음id }); };
window.XLSX = { utils: { book_new: function () { return {}; }, aoa_to_sheet: function (a) { return a; },
                         book_append_sheet: function () {} }, writeFile: function () {} };
</script></body>"""
파일 = 뿌리 / '검수' / '33-송장번호' / '_껍데기.html'
파일.write_text(껍데기, encoding='utf-8')

with sync_playwright() as p:
    b = p.chromium.launch()
    오류 = []
    page = b.new_page()
    page.on('pageerror', lambda e: 오류.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 오류.append(m.text))
    page.goto(파일.as_uri())
    page.evaluate("() => localStorage.clear()")
    page.reload()

    r = page.evaluate("""() => {
      // 지난주 금요일(10/23)에 뽑은 5건 — 묶음id 는 토요일과 같은 앞머리를 일부러 씀(옛 기준이면 여기에 이어 붙음)
      const 금 = []; for (let i = 1; i <= 5; i++) 금.push(항목(i, '261024-01', { 출력번호: i, 출력일: '2026-10-23' }));
      // 출력일 없는 옛 줄(10/23 전 판으로 뽑음) — 번호 7
      금.push(항목(6, '261026-01', { 출력번호: 7 }));
      심기(금);
      // 주말·월요일 받은 주문 9건 (토 3 · 일 3 · 월 3)
      const 모임 = [];
      for (let i = 11; i <= 13; i++) 모임.push(항목(i, '261024-01'));
      for (let i = 14; i <= 16; i++) 모임.push(항목(i, '261025-01'));
      for (let i = 17; i <= 19; i++) 모임.push(항목(i, '261026-01'));
      심기(모임);
      // ① 월 10:00 배송준비중에서 체크해 첫 출력 (재발행 경로 · 묶음id 는 첫 줄의 토요일 것)
      const 수1 = 뽑기(거르기(모임, true), '261024-01');
      const 첫 = 범위(11, 19);
      const 일 = 번호(11)[1];
      // ② 월 15:00 추가 주문 2건(월요일 받음) 올려 출력
      window.지금 = Date.UTC(2026, 9, 26, 6, 0);
      const 추가 = [항목(21, '261026-02'), 항목(22, '261026-02')];
      심기(추가);
      const 수2 = 뽑기(거르기(추가, false), '261026-02');
      const 둘 = 범위(21, 22);
      // ③ 같은 날 첫 묶음 다시 출력 → 번호 그대로
      뽑기(거르기(모임, true), '261024-01');
      const 다시 = 범위(11, 19);
      // ④ 같은 날 23:59 KST(14:59 UTC) 또 추가 1건 → 12
      window.지금 = Date.UTC(2026, 9, 26, 14, 59);
      const 밤 = [항목(23, '261026-03')]; 심기(밤); 뽑기(거르기(밤, false), '261026-03');
      const 밤번호 = 번호(23);
      // ⑤ 다음날 00:30 KST(10/26 15:30 UTC) — 화요일 첫 출력은 1번
      window.지금 = Date.UTC(2026, 9, 26, 15, 30);
      const 화 = [항목(31, '261027-01'), 항목(32, '261027-01')]; 심기(화);
      뽑기(거르기(화, false), '261027-01');
      const 화번호 = [번호(31), 번호(32)];
      // ⑥ 화요일에 월요일 주문(ORD21) 다시 출력 → 어제 번호(10) 안 물려받고 오늘 번호 이어서 3
      뽑기(거르기([항목(21, '261026-02')], true), '261026-02');
      const 재21 = 번호(21);
      // ⑦ 옛 줄(출력일 없음) 다시 출력 → 오늘 번호 4
      뽑기(거르기([항목(6, '261026-01')], true), '261026-01');
      const 옛 = 번호(6);
      // ⑧ 화요일 화면 미리보기(준비) 숫자 = 다음 번호 5 — 내려받기 전에는 줄에 안 박힘
      const 준 = ZG.로젠파일.준비([항목(33, '261027-02')], { 묶음id: '261027-02' });
      return { 수1, 첫, 일, 수2, 둘, 다시, 밤번호, 화번호, 재21, 옛, 미리: 준.그룹들[0].출력번호, 금: 범위(1, 5) };
    }""")
    본다('① 월요일 첫 출력(주말 주문 섞임) 1~9', r['첫'] == list(range(1, 10)), r['첫'])
    본다('① 출력일 = 2026-10-26(한국시간)', r['일'] == '2026-10-26', r['일'])
    본다('② 같은 날 추가 출력 10·11 (1번부터 다시 안 셈)', r['둘'] == [10, 11], r['둘'])
    본다('③ 같은 날 다시 출력해도 1~9 그대로', r['다시'] == list(range(1, 10)), r['다시'])
    본다('④ 23:59(KST) 추가 출력 12 · 같은 날', r['밤번호'] == [12, '2026-10-26'], r['밤번호'])
    본다('⑤ 다음날 00:30(KST) 첫 출력 1·2', r['화번호'] == [[1, '2026-10-27'], [2, '2026-10-27']], r['화번호'])
    본다('⑥ 어제 뽑은 주문을 오늘 다시 → 오늘 번호 3', r['재21'] == [3, '2026-10-27'], r['재21'])
    본다('⑦ 출력일 없는 옛 줄 다시 → 오늘 번호 4', r['옛'] == [4, '2026-10-27'], r['옛'])
    본다('⑧ 미리보기 번호 5(다음 번호)', r['미리'] == 5, r['미리'])
    본다('지난 금요일 번호 1~5는 그대로', r['금'] == [1, 2, 3, 4, 5], r['금'])

    # ★ 표시(재구매)는 그대로 — 같은 손님 이틀 산 줄이면 E열에 ★2
    s = page.evaluate("""() => {
      localStorage.clear();
      const a = 항목(41, '261020-01', { 주문일: '2026-10-20', 출력번호: 1, 출력일: '2026-10-20' });
      const c = 항목(42, '261026-01', { 주문일: '2026-10-26', 수령인: '손님41', 우편번호: '10041', 핸드폰: '01012341041' });
      c.원본[13] = '손님41'; c.원본[14] = '10041'; c.원본[18] = '01012341041'; c.원본[3] = '2026-10-26';
      심기([a, c]);
      const 표 = ZG.로젠파일.준비([c], { 묶음id: '261026-01' }).표;
      return String(표[0][4]);
    }""")
    본다('★ 재구매 표시 그대로(E열 앞머리)', '★2' in s and s.startswith('('), s)
    본다('콘솔 오류 0', not 오류, 오류[:3])
    b.close()
파일.unlink()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
