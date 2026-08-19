# -*- coding: utf-8 -*-
# 송장 중복출력 · 동봉카드 번호 겹침 고침 검수 (2026-08-19 우람님 지시)
#   python3 v3/검수/송장중복-시험.py     ← 그대로 다시 돈다 (playwright 필요)
# 오전에 송장을 뽑고 오후에 추가 주문을 올렸을 때
#   ① 로젠 파일에 오전 건이 다시 들어가지 않는가  ② 출력번호가 1 부터 다시 세지 않는가
import pathlib, re
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append((참, 이름, 덧))

# 08h 의 로젠항목() 은 모듈 안에 숨어 있다 — 파일에서 그 함수를 그대로 오려 와 시험한다(복사본이 아니다)
소스 = (뿌리 / 'js' / '08h-주문올리기.js').read_text(encoding='utf-8')
m = re.search(r'  function 로젠항목\(\) \{.*?\n  \}\n', 소스, re.S)
assert m, '08h 에서 로젠항목() 을 못 찾았다'
로젠항목소스 = m.group(0)

껍데기 = """<!doctype html><meta charset="utf-8"><title>송장중복 시험</title><body>
<script src="../js/01-저장소.js"></script>
<script src="../js/03-계산.js"></script>
<script src="../js/04-공통UI.js"></script>
<script src="../js/08a-주문자료.js"></script>
<script src="../js/08i-로젠파일.js"></script>
<script>
/* 08h 에서 오려 온 진짜 거르개 */
var 상태 = null;
""" + 로젠항목소스 + """
window.거르기 = function (항목들, 재발행) { 상태 = { 항목들: 항목들, 재발행: !!재발행 }; return 로젠항목(); };

/* 27칸 한 줄 세우기 — 사람마다 우편번호가 달라 묶음이 1주문=1묶음이 된다 */
window.칸 = function (n) {
  var o = new Array(27).fill('');
  o[2] = 'ORD' + n; o[3] = '2026-08-19'; o[4] = '테스트식물'; o[7] = 'TST01-15';
  o[11] = '10000'; o[12] = '1'; o[13] = '손님' + n; o[14] = String(10000 + n); o[15] = '어디시 어디구';
  o[18] = '0101234' + String(1000 + n);
  return o;
};
window.항목 = function (n, 묶음id, id) {
  return { 원본: 칸(n), id: id, 갈래: '새것',
    줄: { id: id, 묶음id: 묶음id, 주문번호: 'ORD' + n, 주문일: '2026-08-19',
          수령인: '손님' + n, 우편번호: String(10000 + n), 품목코드: 'TST01-15', 수량: 1,
          핸드폰: '0101234' + String(1000 + n), 주소: '어디시 어디구' } };
};
/* 저장소에 주문줄을 심는다 (08i 가 출력번호를 되쓸 자리) */
window.심기 = function (항목들) {
  var 저 = ZG.저장소;
  저.전체쓰기(저.키.주문, 저.읽기(저.키.주문).concat(항목들.map(function (것) { return 것.줄; })));
};
window.번호보기 = function () {
  var 표 = {};
  ZG.저장소.읽기(ZG.저장소.키.주문).forEach(function (r) { 표[r.주문번호] = r.출력번호 || 0; });
  return 표;
};
/* 내보내기는 XLSX 를 부른다 — 파일은 안 만들고 번호되쓰기만 태운다 */
window.XLSX = { utils: { book_new: function () { return {}; }, aoa_to_sheet: function (a) { return a; },
                         book_append_sheet: function () {} }, writeFile: function () {} };
</script>
</body>"""
(뿌리 / '검수' / '_송장중복시험.html').write_text(껍데기, encoding='utf-8')
주소 = (뿌리 / '검수' / '_송장중복시험.html').as_uri()

with sync_playwright() as p:
    b = p.chromium.launch()
    오류 = []
    page = b.new_page()
    page.on('pageerror', lambda e: 오류.append(str(e)))
    page.goto(주소)
    page.evaluate("() => localStorage.clear()")

    # ── ① 오전 11시: 10건 올리고 로젠 파일 내려받기 ──
    r1 = page.evaluate("""() => {
      const 것들 = []; for (let i = 1; i <= 10; i++) 것들.push(항목(i, '260819-01', 'o' + i));
      심기(것들);
      const 수 = ZG.로젠파일.내보내기(것들, '20260819-01.xlsx', { 묶음id: '260819-01' });
      return { 수: 수, 번호: 번호보기() };
    }""")
    본다('오전 10줄이 로젠 파일에 들어감', r1['수'] == 10, '줄수 ' + str(r1['수']))
    오전번호 = [r1['번호']['ORD%d' % i] for i in range(1, 11)]
    본다('오전 출력번호 1~10', sorted(오전번호) == list(range(1, 11)), str(오전번호))

    # ── ② 오후 2시: 카페24 파일에 오전 10건이 다시 섞여 15건이 올라옴 ──
    r2 = page.evaluate("""() => {
      const 새것 = []; for (let i = 11; i <= 15; i++) 새것.push(항목(i, '260819-02', 'o' + i));
      심기(새것);                                     // 새 5건만 저장된다 (08h 저장하기가 하는 일)
      const 올린것 = [];                              // 카페24 파일에 딸려 온 15건 전부
      for (let i = 1; i <= 10; i++) 올린것.push(항목(i, '260819-01', 'o' + i));
      새것.forEach(것 => 올린것.push(것));
      const 거른것 = 거르기(올린것, false);
      const 수 = ZG.로젠파일.내보내기(거른것, '20260819-02.xlsx', { 묶음id: '260819-02' });
      return { 올린수: 올린것.length, 거른수: 거른것.length, 수: 수, 번호: 번호보기(),
               남은주문: 거른것.map(것 => 것.줄.주문번호) };
    }""")
    본다('오후 올린 15건 중 이미 뽑은 10건을 뺌', r2['거른수'] == 5,
         '올린 %d → 남은 %d (%s)' % (r2['올린수'], r2['거른수'], ','.join(r2['남은주문'])))
    본다('로젠 파일에 5줄만 나감 (송장 중복 없음)', r2['수'] == 5, '줄수 ' + str(r2['수']))
    오후번호 = [r2['번호']['ORD%d' % i] for i in range(11, 16)]
    본다('오후 출력번호 11~15 (1 부터 다시 안 셈)', sorted(오후번호) == [11, 12, 13, 14, 15], str(오후번호))
    앞번호 = [r2['번호']['ORD%d' % i] for i in range(1, 11)]
    본다('오전 번호는 그대로 1~10', sorted(앞번호) == list(range(1, 11)), str(앞번호))
    전체 = sorted(r2['번호'].values())
    본다('카드 번호가 1~15 로 겹침 없이 한 줄', 전체 == list(range(1, 16)), str(전체))

    # ── ③ 재발행: 회차를 골라 다시 뽑으면 거르지 않고, 번호도 그대로 ──
    r3 = page.evaluate("""() => {
      const 것들 = []; for (let i = 1; i <= 10; i++) 것들.push(항목(i, '260819-01', 'o' + i));
      const 거른것 = 거르기(것들, true);              // 재발행 경로
      const 수 = ZG.로젠파일.내보내기(거른것, '20260819-01.xlsx', { 묶음id: '260819-01' });
      return { 거른수: 거른것.length, 수: 수, 번호: 번호보기() };
    }""")
    본다('재발행은 거르지 않음 (10줄 그대로)', r3['거른수'] == 10 and r3['수'] == 10,
         '남은 %d · 줄수 %d' % (r3['거른수'], r3['수']))
    재번호 = [r3['번호']['ORD%d' % i] for i in range(1, 11)]
    본다('재발행해도 번호가 안 바뀜 (인쇄한 카드와 안 어긋남)', sorted(재번호) == list(range(1, 11)), str(재번호))

    # ── ④ 다음날은 다시 1번부터 ──
    r4 = page.evaluate("""() => {
      const 것들 = []; for (let i = 21; i <= 23; i++) 것들.push(항목(i, '260820-01', 'n' + i));
      심기(것들);
      const 수 = ZG.로젠파일.내보내기(것들, '20260820-01.xlsx', { 묶음id: '260820-01' });
      return { 수: 수, 번호: 번호보기() };
    }""")
    다음날 = [r4['번호']['ORD%d' % i] for i in range(21, 24)]
    본다('다음날은 다시 1~3', sorted(다음날) == [1, 2, 3], str(다음날))

    본다('콘솔 오류 없음', not 오류, ' / '.join(오류[:3]))
    b.close()

친 = sum(1 for 참, _, _ in 결과 if 참)
for 참, 이름, 덧 in 결과:
    print(('  ✓ ' if 참 else '  ✗ ') + 이름 + ((' — ' + 덧) if 덧 else ''))
print('\n%d/%d 통과' % (친, len(결과)))
raise SystemExit(0 if 친 == len(결과) else 1)
