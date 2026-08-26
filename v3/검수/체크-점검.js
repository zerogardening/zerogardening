/* 체크리스트 자체점검 — 브라우저 없이 정렬·달 거르개만 확인한다.
   돌리는 법:  osascript -l JavaScript 검수/체크-점검.js   (프로젝트 v3/ 에서)
   화면(쓸기·펼치기)은 여기서 못 본다 — 그건 눈으로 연다. */
ObjC.import('Foundation');
function 읽어오기(경로) {
  return $.NSString.stringWithContentsOfFileEncodingError(경로, $.NSUTF8StringEncoding, null).js;
}

var 표 = [];
var window = { ZG: {} };
var ZG = window.ZG;
ZG.저장소 = {
  키: { 메모: 'zg.v3.메모' },
  읽기: function () { return 표.map(function (r) { return Object.assign({}, r); }); },
  덧붙이기: function (k, r) { 표.push(r); },
  바꾸기: function (k, id, 변경) {
    표.forEach(function (r) { if (r.id === id) Object.assign(r, 변경); });
  },
  지우기: function (k, id) { 표 = 표.filter(function (r) { return r.id !== id; }); }
};
ZG.ui = { 만들기: function () { return {}; } };
ZG.메모 = {};

var 뿌리 = $.NSProcessInfo.processInfo.environment.objectForKey('PWD').js;
eval(읽어오기(뿌리 + '/js/17c-체크화면.js'));

var 체크 = ZG.체크, 실패 = 0;
function 같나(무엇, 실제, 바람) {
  var a = JSON.stringify(실제), b = JSON.stringify(바람);
  if (a === b) { console.log('  OK   ' + 무엇); return; }
  실패++; console.log('  틀림 ' + 무엇 + '\n       나온 것: ' + a + '\n       바랄 것: ' + b);
}
function 제목들(달) { return 체크.목록(달).map(function (r) { return r.제목; }); }

// 만든때를 손으로 박는다 — 같은 밀리초에 세 건이 들어가면 등록 순서를 못 가린다
function 넣기(제목, 때, 달, 완료) {
  표.push({ id: 'c' + 때, 종류: '체크', 제목: 제목, 상세: '', 완료: !!완료, 날짜: 달 + '-10', 만든때: 때, 끝낸때: 완료 ? 때 : null });
}

console.log('체크리스트 점검');

// ① 등록 순서대로 나열
표 = [];
넣기('하나', 1, '2026-08'); 넣기('둘', 2, '2026-08'); 넣기('셋', 3, '2026-08');
같나('등록 순서대로', 제목들('2026-08'), ['하나', '둘', '셋']);

// ② 완료하면 아래로 내려간다
체크.고치기('c1', { 완료: true, 끝낸때: 9 });
같나('완료는 맨 아래로', 제목들('2026-08'), ['둘', '셋', '하나']);

// ③ 안 끝난 지난달 것은 이번 달에도 보인다 · 끝난 지난달 것은 안 보인다
표 = [];
넣기('지난달 안 끝남', 1, '2026-07'); 넣기('지난달 끝남', 2, '2026-07', true); 넣기('이번달', 3, '2026-08');
같나('안 끝난 지난달 건은 남는다', 제목들('2026-08'), ['지난달 안 끝남', '이번달']);
같나('지난 달엔 그 달 것만 (다음 달 일이 끼지 않는다)', 제목들('2026-07'), ['지난달 안 끝남', '지난달 끝남']);

// ④ 종류가 다른 줄(메모·일지)은 섞이지 않는다
표.push({ id: 'm1', 종류: '메모', 제목: '메모다', 본문: '' });
표.push({ id: '일지-2026-08-10', 종류: '일지', 날짜: '2026-08-10' });
같나('메모·일지는 안 섞인다', 제목들('2026-08'), ['지난달 안 끝남', '이번달']);

// ⑤ 넣기 — 오늘 날짜로 들어가고 안 끝난 상태다
표 = [];
체크.넣기('새 할일', '상세다');
같나('새 할일은 안 끝난 상태', [표[0].종류, 표[0].완료, 표[0].상세], ['체크', false, '상세다']);

console.log(실패 ? '\n❌ ' + 실패 + '건 틀렸다' : '\n✅ 전부 통과');
