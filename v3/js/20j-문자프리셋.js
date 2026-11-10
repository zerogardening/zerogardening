/* 20j-문자프리셋 — 새 문자 위쪽 프리셋 단추 (11/10 우람님 · 자동으로 고르던 묶음 대신).
   프리셋 = { 이름(4자까지), 품목, 배송비, 무료배송, 문자 } · 5개까지 · 누르면 셋을 한 번에 채운다.
   기기 사이 같이 — v3_공유설정 「문자프리셋」 한 줄(01b 설정행 · 01-저장소 객체 키). 길게 누르면(PC 오른쪽 단추) 바꾸기·이름·문자·지우기 */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 최대 = 5, 글자 = 4;   // 4자 × 5개가 폰 390 한 줄에 든다
  function 저() { return ZG.저장소; }
  function 목록() { return (저().읽기(저().키.문자프리셋).목록 || []).slice(0, 최대); }
  function 쓰기(목) { 저().전체쓰기(저().키.문자프리셋, { 목록: 목 }); }
  function 복사(x) { return JSON.parse(JSON.stringify(x)); }

  // 문자 기본값 = 지금 견적 문자, 받는 분 자리는 {이름}(20a 문자내용이 채운다)
  function 기본문자(상태) { return ZG.문자주문자료.문자내용({ 받는분: '{이름}', 품목: 상태.담은것, 배송비: 상태.배송비, 무료배송: 상태.무료배송 }); }

  function 글창(제목, 값, 그때) {
    if (document.querySelector('.askbox')) return;
    var 칸 = 만들기('textarea', { class: 'inp ta', rows: '12' });
    칸.value = 값 || '';
    function 닫기(답) { 막.remove(); 상자.remove(); 그때(답); }
    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });
    var 취소 = 만들기('button', { class: 'btn', type: 'button', text: '취소' }), 저장 = 만들기('button', { class: 'btn main', type: 'button', text: '저장' });
    취소.addEventListener('click', function () { 닫기(null); });
    저장.addEventListener('click', function () { 닫기(칸.value); });
    var 상자 = 만들기('div', { class: 'askbox 글창', role: 'dialog', 'aria-modal': 'true' }, [만들기('h4', { text: 제목 }), 칸, 만들기('div', { class: 'btnrow' }, [취소, 저장])]);
    document.body.appendChild(막); document.body.appendChild(상자);
    setTimeout(function () { 칸.focus(); }, 20);
  }
  function 이름묻기(값, 그때) {
    u.물음({ 제목: '프리셋 이름', 값: 값 || '', 자리표시: 글자 + '자까지', 최대: 글자, 확인글: '저장' }, function (v) {
      v = String(v || '').trim().slice(0, 글자);
      if (v) 그때(v);
    });
  }

  /* 길게 누름(폰) · 오른쪽 단추(PC) — 짧은 누름(click)과 겹치지 않게 됨 표시를 돌려준다 */
  function 길게(b, 할일) {
    var t = null, 됨 = false;
    b.addEventListener('pointerdown', function () { 됨 = false; t = setTimeout(function () { 됨 = true; 할일(); }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(t); }); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); clearTimeout(t); if (!됨) { 됨 = true; 할일(); } });
    return function () { var v = 됨; 됨 = false; return v; };
  }

  function 고치기(i, 상태, 다시) {
    var 목 = 목록(), p = 목[i];
    u.고르기({ 제목: p.이름, 항목: [
      { 값: '바꿈', 글: '지금 담은 것으로 바꾸기' }, { 값: '이름', 글: '이름 바꾸기' },
      { 값: '문자', 글: '문자 내용 고치기' }, { 값: '지움', 글: '지우기' }
    ] }, function (값) {
      if (값 === '바꿈') {
        if (!상태.담은것.length) { u.토스트('담은 품목이 없습니다'); return; }
        Object.assign(p, { 품목: 복사(상태.담은것), 배송비: 상태.배송비, 무료배송: !!상태.무료배송, 문자: 기본문자(상태) });
        쓰기(목); 다시();
      } else if (값 === '이름') 이름묻기(p.이름, function (v) { p.이름 = v; 쓰기(목); 다시(); });
      else if (값 === '문자') 글창(p.이름 + ' 문자', p.문자, function (v) { if (v === null) return; p.문자 = v; 쓰기(목); 다시(); });
      else if (값 === '지움') u.확인({ 제목: '「' + p.이름 + '」 지울까요?', 확인글: '지우기', 위험: true }, function (예) {
        if (!예) return; 목.splice(i, 1); 쓰기(목); 다시();
      });
    });
  }

  /* 새 문자(20b) 맨 위 한 줄 · 넣기(p) 는 20b 가 상태를 채우고 다시 그린다 */
  function 줄(상태, 넣기, 다시) {
    var 목 = 목록();
    var 단추들 = 목.map(function (p, i) {
      var b = 만들기('button', { class: 'btn sm 프리셋', type: 'button', text: p.이름 });
      var 길었나 = 길게(b, function () { 고치기(i, 상태, 다시); });
      b.addEventListener('click', function () { if (!길었나()) 넣기(복사(p)); });
      return b;
    });
    if (목.length < 최대) {
      var 더 = 만들기('button', { class: 'btn sm 프리셋 더', type: 'button', text: '＋', 'aria-label': '프리셋 저장' });
      더.addEventListener('click', function () {
        if (!상태.담은것.length) { u.토스트('품목을 담은 뒤 저장합니다'); return; }
        이름묻기('', function (이름) {
          글창(이름 + ' 문자', 기본문자(상태), function (v) {
            if (v === null) return;
            var 새 = 목록();
            새.push({ 이름: 이름, 품목: 복사(상태.담은것), 배송비: 상태.배송비, 무료배송: !!상태.무료배송, 문자: v });
            쓰기(새.slice(0, 최대)); 다시();
          });
        });
      });
      단추들.push(더);
    }
    return 만들기('div', { class: '프리셋줄' }, 단추들);
  }

  ZG.문자프리셋 = { 줄: 줄, 목록: 목록, 글자: 글자, 최대: 최대 };
})(window.ZG);
