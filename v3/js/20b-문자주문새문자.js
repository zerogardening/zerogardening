/* 20b-문자주문새문자 — 「새 문자」 폰·PC (16단계 설계 §3 · 시안 ①). 널서리 08-출고 등록 화면을 옮겼다.
   품목은 목록에서 골라서만 담는다. 칠 때는 화면을 통째로 다시 그리지 않는다 — 미리보기·합계만 갈아낀다 (§8-10).
   수량칸·원칸·밭은 목록(20c)·올리기(20d)도 쓴다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  function 자() { return ZG.문자주문자료; }

  var 상태 = { 검색: '', 담은것: [], 받는분: '', 전화: '', 메모: '', 주소: '', 우편: '', 배송비: 4500 };
  var 참조 = {};

  function 비우기() { 상태.검색 = ''; 상태.담은것 = []; 상태.받는분 = ''; 상태.전화 = ''; 상태.메모 = ''; 상태.주소 = ''; 상태.우편 = ''; 상태.배송비 = 4500; }
  function 지금값() { return { 받는분: 상태.받는분, 전화: 상태.전화, 메모: 상태.메모, 주소: 상태.주소, 우편: 상태.우편, 품목: 상태.담은것, 배송비: 상태.배송비 }; }

  /* ── 부품 ── */
  function 커서끝(입력) {
    function 보내기() {
      requestAnimationFrame(function () {
        var n = 입력.value.length;
        try { 입력.setSelectionRange(n, n); } catch (e) { /* 무시 */ }
      });
    }
    입력.addEventListener('focus', 보내기); 입력.addEventListener('click', 보내기);
  }
  /* 널서리 숫자조절 — 좌우 단추 또는 가운데 숫자를 바로 친다 */
  function 수량칸(값, 바뀜) {
    var 입력 = 만들기('input', { class: 'inp', type: 'text', inputmode: 'numeric', value: String(값), 'aria-label': '수량' });
    function 반영(새) { 값 = Math.max(1, Math.floor(u.숫자(새)) || 1); 입력.value = String(값); 바뀜(값); }
    var 빼 = 만들기('button', { class: 'btn sm', type: 'button', text: '－', 'aria-label': '하나 줄이기' });
    var 더 = 만들기('button', { class: 'btn sm', type: 'button', text: '＋', 'aria-label': '하나 늘리기' });
    빼.addEventListener('click', function () { 반영(값 - 1); });
    더.addEventListener('click', function () { 반영(값 + 1); });
    입력.addEventListener('change', function () { 반영(입력.value); });
    입력.addEventListener('blur', function () { 반영(입력.value); });
    커서끝(입력);
    return 만들기('span', { class: 'qty' }, [빼, 입력, 더]);
  }
  /* 원 단위 칸. 빈칸 = 0 (배송비 빈칸을 4,500으로 되살리지 않는다 §8-4) */
  function 원칸(값, 바뀜, 이름) {
    var e = 만들기('input', { class: 'inp num won', type: 'text', inputmode: 'numeric', value: 값 ? u.콤마(값) : '', 'aria-label': 이름 || '단가' });
    e.addEventListener('input', function () { 바뀜(u.숫자(e.value)); });
    e.addEventListener('blur', function () { var n = u.숫자(e.value); e.value = n ? u.콤마(n) : ''; });
    커서끝(e);
    return e;
  }
  function 밭(라벨, 칸, 스타일) {
    return 만들기('div', { class: 'field', style: 스타일 || null }, [라벨 ? 만들기('label', { html: 라벨 }) : null, 칸]);
  }
  /* 조합안전입력은 120ms 뒤에야 값을 넘긴다. 단추는 그 전에 눌리므로 맞추기()로 칸의 지금 값을 바로 넣고,
     다시 그릴 때는 멈추기()로 남은 타이머를 끊는다 — 안 끊으면 비운 새 화면에 앞사람 이름이 들어간다 */
  function 글칸(값, 자리글, 바뀜) {
    var e = 만들기('input', { class: 'inp', type: 'text', placeholder: 자리글, value: 값 || '' });
    var 감시 = u.조합안전입력(e, 바뀜, 120);
    e.맞추기 = function () { 감시.취소(); 바뀜(e.value); };
    e.멈추기 = 감시.취소;
    return e;
  }
  /* 주소 찾기는 08c 부품을 빌린다. 찾기는 값만 넣고 input 을 안 쏘고 주소칸에 focus 를 돌려준다 — 그때 맞춘다 */
  function 주소묶음(주소, 우편) {
    var 줄 = ZG.주문입력 && ZG.주문입력.주소줄;
    return 줄 ? 줄(주소, 우편) : 주소;
  }
  function 주소칸(주소값, 우편값, 주소바뀜, 우편바뀜) {
    var 주소 = 글칸(주소값, '주소', 주소바뀜), 우편 = 글칸(우편값, '우편번호', 우편바뀜);
    우편.inputMode = 'numeric';
    주소.addEventListener('focus', function () { 주소.맞추기(); 우편.맞추기(); });
    return { 주소: 주소, 우편: 우편, 줄: 주소묶음(주소, 우편) };
  }
  function 글칸맞추기(칸들) { (칸들 || []).forEach(function (e) { e.맞추기(); }); }
  function 글칸멈추기(칸들) { (칸들 || []).forEach(function (e) { e.멈추기(); }); }
  function 전화칸(값, 바뀜, 폰) {
    var e = 만들기('input', { class: 'inp' + (폰 ? ' num' : ''), type: 'tel', inputmode: 'numeric', placeholder: '010-', value: 값 || '' });
    if (폰) e.style.textAlign = 'left';
    e.addEventListener('input', function () { 바뀜(e.value); });
    return e;
  }
  function 말풍선틀() {
    참조.받는이 = 만들기('div', { class: 'to' });
    참조.말풍선 = 만들기('div', { class: '말풍선' });
    return 만들기('div', { class: '말풍선틀' }, [참조.받는이, 참조.말풍선]);
  }

  /* ── 갈아끼우기 ── */
  function 미리보기다시() {
    var 값 = 지금값(), 전 = 자().숫자만(상태.전화);
    if (참조.말풍선) 참조.말풍선.textContent = 자().문자내용(값);
    if (참조.받는이) {
      참조.받는이.hidden = !전;
      참조.받는이.innerHTML = '받는 사람 <b>' + u.안전(자().전화모양(전)) + '</b>';
    }
    if (참조.저장) 참조.저장.disabled = !상태.담은것.length;
    if (참조.문자) 참조.문자.disabled = !상태.담은것.length || !자().문자되나(상태.전화);
  }
  function 합계다시() {
    var 셈 = 자().합계(지금값());
    if (참조.합계) 참조.합계.innerHTML = '합계 <b>' + u.콤마(셈.개) + '</b>개 · <b class="big">' + u.콤마(셈.합) + '</b>원';
    미리보기다시();
  }

  function 담기(p) {
    var 있는 = 상태.담은것.filter(function (r) { return r.품목코드 === p.품목코드; })[0];
    if (있는) 있는.수량 += 1; else 상태.담은것.push(자().담을줄(p));
    상태.검색 = '';
    if (참조.검색) 참조.검색.value = '';
    결과다시(); 담은칸다시();
  }
  function 빼기(코드) {
    상태.담은것 = 상태.담은것.filter(function (r) { return r.품목코드 !== 코드; });
    담은칸다시();
  }

  function 결과다시() {
    var 칸 = 참조.결과칸;
    if (!칸) return;
    u.비우기(칸);
    if (!상태.검색.trim()) return;
    var 목록 = 자().후보(상태.검색);
    if (!목록.length) { 칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '찾는 품목이 없습니다' })); return; }
    var 폰 = u.폰인가();
    var 상자 = 만들기('div', { class: 'ac', role: 'listbox' });
    목록.forEach(function (p, i) {
      var b = 만들기('button', { class: 'it' + (i ? '' : ' on'), type: 'button', role: 'option', 'aria-selected': i ? 'false' : 'true' });
      b.innerHTML = '<span class="cd">' + u.안전(p.품목코드) + '</span>' +
        '<div><div class="nm">' + u.안전(p.유통명) + '</div><div class="sci">' + u.안전(p.학명 || '') + '</div></div>' +
        '<div class="rg">' + u.안전(p.규격 || '') + (폰 ? '<br>' : ' · ') + '<b>' + u.콤마(자().담을줄(p).단가) + '원</b></div>';
      b.addEventListener('click', function () { 담기(p); });
      상자.appendChild(b);
    });
    칸.appendChild(상자);
  }

  function 폰담은줄(r) {
    var 금액 = 만들기('b');
    function 금액다시() { 금액.textContent = u.콤마(r.수량 * (Number(r.단가) || 0)) + '원'; 합계다시(); }
    var 뺄 = 만들기('button', { class: 'btn sm', type: 'button', text: '빼기', style: 'margin-right:auto' });
    뺄.addEventListener('click', function () { 빼기(r.품목코드); });
    var 칸 = 만들기('div', { class: 'ph-card 담음' }, [
      만들기('div', { class: 'r1', html: '<div class="nm">' + u.안전(r.유통명) + '</div><div class="cd">' + u.안전(r.품목코드) + '</div>' }),
      만들기('div', { class: 'r2', text: r.규격 || '' }),
      만들기('div', { class: 'r3' }, [
        만들기('span', { class: 'lbl', text: '수량' }),
        수량칸(r.수량, function (n) { r.수량 = n; 금액다시(); }),
        원칸(r.단가, function (n) { r.단가 = n; 금액다시(); })
      ]),
      만들기('div', { class: 'r4' }, [뺄, 만들기('span', { class: 'lbl', text: '금액' }), 금액])
    ]);
    금액.textContent = u.콤마(r.수량 * (Number(r.단가) || 0)) + '원';
    return 칸;
  }

  function PC담은줄(r) {
    var 금액 = 만들기('td', { class: 'r' });
    function 금액다시() { 금액.textContent = u.콤마(r.수량 * (Number(r.단가) || 0)); 합계다시(); }
    var 뺄 = 만들기('button', { class: 'btn sm', type: 'button', text: '빼기' });
    뺄.addEventListener('click', function () { 빼기(r.품목코드); });
    var tr = 만들기('tr', {}, [
      만들기('td', { class: 'code', text: r.품목코드 }),
      만들기('td', { html: u.안전(r.유통명) + '<span class="sub">' + u.안전(r.규격 || '') + '</span>' }),
      만들기('td', {}, [수량칸(r.수량, function (n) { r.수량 = n; 금액다시(); })]),
      만들기('td', { class: 'r' }, [원칸(r.단가, function (n) { r.단가 = n; 금액다시(); })]),
      금액, 만들기('td', {}, [뺄])
    ]);
    금액.textContent = u.콤마(r.수량 * (Number(r.단가) || 0));
    return tr;
  }

  function PC배송줄() {
    var 금액 = 만들기('td', { class: 'r', text: u.콤마(상태.배송비) });
    return 만들기('tr', {}, [
      만들기('td'), 만들기('td', { class: 'k', text: '배송비' }), 만들기('td'),
      만들기('td', { class: 'r' }, [원칸(상태.배송비, function (n) { 상태.배송비 = n; 금액.textContent = u.콤마(n); 합계다시(); }, '배송비')]),
      금액, 만들기('td')
    ]);
  }

  function 담은칸다시() {
    var 칸 = 참조.담은칸;
    if (!칸) return;
    u.비우기(칸);
    if (u.폰인가()) 상태.담은것.forEach(function (r) { 칸.appendChild(폰담은줄(r)); });
    else {
      상태.담은것.forEach(function (r) { 칸.appendChild(PC담은줄(r)); });
      칸.appendChild(PC배송줄());
    }
    합계다시();
  }

  /* ── 배치 ── */
  function 검색칸() {
    var e = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 학명 · 품목코드', value: 상태.검색 }));
    u.조합안전입력(e, function (값) { 상태.검색 = 값; 결과다시(); }, 150);
    e.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' || ev.isComposing) return;
      var 첫 = 자().후보(e.value)[0];
      if (첫) { ev.preventDefault(); 담기(첫); }
    });
    참조.검색 = e;
    return e;
  }
  function 목록단추() {
    var b = 만들기('button', { class: 'btn sm', type: 'button', text: '📋 문자주문 목록' });
    b.addEventListener('click', function () { ZG.문자주문.목록으로(); });
    return b;
  }
  function 사람칸들(폰) {
    var 칸 = {
      받는분: 글칸(상태.받는분, '받는 분', function (v) { 상태.받는분 = v; 미리보기다시(); }),
      전화: 전화칸(상태.전화, function (v) { 상태.전화 = v; 미리보기다시(); }, 폰),
      메모: 글칸(상태.메모, '메모', function (v) { 상태.메모 = v; }),
      곳: 주소칸(상태.주소, 상태.우편, function (v) { 상태.주소 = v; }, function (v) { 상태.우편 = v; })
    };
    참조.글칸들 = [칸.받는분, 칸.메모, 칸.곳.주소, 칸.곳.우편];
    return 칸;
  }
  function 보내기단추(폰) {
    참조.저장 = 만들기('button', { class: 폰 ? 'btn 저장만' : 'btn', type: 'button', text: '저장' });
    참조.문자 = 만들기('button', { class: 폰 ? 'ph-save' : 'btn main', type: 'button', text: '문자' });
    참조.저장.addEventListener('click', function () { 저장(false); });
    참조.문자.addEventListener('click', function () { 저장(true); });
    return 만들기('div', { class: '보냄줄' }, [참조.저장, 참조.문자]);
  }

  function 폰배치(본문) {
    var 사람 = 사람칸들(true);
    참조.결과칸 = 만들기('div');
    참조.담은칸 = 만들기('div', { class: 'ph-list' });
    참조.합계 = 만들기('div', { class: '합계줄' });
    var 배송 = 원칸(상태.배송비, function (n) { 상태.배송비 = n; 합계다시(); }, '배송비');
    [
      만들기('div', { style: 'display:flex; justify-content:flex-end' }, [목록단추()]),
      만들기('div', { class: 'field' }, [검색칸(), 참조.결과칸]),
      만들기('div', { class: 'ph-sec', text: '담은 품목' }), 참조.담은칸,
      만들기('div', { class: '배송줄' }, [만들기('span', { class: 'k', text: '배송비' }), 배송, 만들기('span', { class: 'lbl', text: '원' })]),
      참조.합계,
      밭('받는 분 <span class="auto">선택</span>', 사람.받는분),
      밭('전화번호', 사람.전화),
      밭('메모 <span class="auto">선택</span>', 사람.메모),
      밭('주소 <span class="auto">선택</span>', 사람.곳.줄),
      밭('우편번호', 사람.곳.우편, 'width:120px'),
      만들기('div', { class: 'ph-sec', text: '문자 미리보기' }), 말풍선틀(),
      보내기단추(true)
    ].forEach(function (e) { 본문.appendChild(e); });
  }

  function PC배치(본문) {
    var 사람 = 사람칸들(false);
    참조.결과칸 = 만들기('div');
    참조.담은칸 = 만들기('tbody');
    참조.합계 = 만들기('div', { class: '합계줄' });
    var 검색카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { html: '품목 검색<span class="right"></span>' }), 검색칸(), 참조.결과칸
    ]);
    검색카드.querySelector('h3 .right').appendChild(목록단추());
    var 표 = 만들기('table', {}, [
      만들기('colgroup', { html: '<col style="width:90px"><col><col style="width:150px"><col style="width:110px"><col style="width:72px"><col style="width:68px">' }),
      만들기('thead', { html: '<tr><th>품목코드</th><th>유통명 · 규격</th><th>수량</th><th class="r">단가</th><th class="r">금액</th><th></th></tr>' }),
      참조.담은칸
    ]);
    var 왼 = 만들기('div', { class: 'l' }, [
      검색카드,
      만들기('div', { class: 'card table-card' }, [만들기('h3', { text: '담은 품목' }), 표, 참조.합계]),
      만들기('div', { class: 'card' }, [만들기('div', { class: 'row' }, [
        밭('받는 분 <span class="auto">선택</span>', 사람.받는분, 'flex:1'),
        밭('전화번호', 사람.전화, 'width:200px'),
        밭('메모 <span class="auto">선택</span>', 사람.메모, 'flex:1')
      ]), 만들기('div', { class: 'row' }, [
        밭('우편번호', 사람.곳.우편, 'width:120px'),
        밭('주소 <span class="auto">선택</span>', 사람.곳.줄, 'flex:1')
      ])])
    ]);
    본문.appendChild(만들기('div', { class: 'cols' }, [왼, 만들기('div', { class: 'rr' }, [말풍선틀(), 보내기단추(false)])]));
  }

  /* 「저장」 = 저장만 · 「문자」 = 저장(보냄) 뒤 문자앱. 확인창 없음 (§7) */
  function 저장(보냄) {
    글칸맞추기(참조.글칸들);
    if (!상태.담은것.length) { u.토스트('담은 품목이 없습니다'); return; }
    if (보냄 && !자().문자되나(상태.전화)) { u.토스트('전화번호가 없습니다'); return; }
    var r = 자().새로저장(지금값(), 보냄);
    비우기();
    u.토스트(보냄 && !u.폰인가() ? '저장했습니다 · 문자 내용을 복사했습니다' : '저장했습니다');
    ZG.주문.다시그리기();
    if (보냄) 자().문자열기(r.전화, 자().문자내용(r));
  }

  function 그리기(본문) {
    글칸멈추기(참조.글칸들);
    참조 = {};
    if (u.폰인가()) 폰배치(본문); else PC배치(본문);
    결과다시(); 담은칸다시();
  }

  ZG.문자주문새문자 = { 그리기: 그리기, 상태: 상태, 수량칸: 수량칸, 원칸: 원칸, 밭: 밭, 글칸: 글칸, 주소칸: 주소칸, 주소묶음: 주소묶음, 글칸맞추기: 글칸맞추기, 글칸멈추기: 글칸멈추기, 전화칸: 전화칸 };
})(window.ZG);
