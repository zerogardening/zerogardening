/* 08k-심폴짝창 — 미리보기 안 「심폴 상품 짝짓기」 상자 (8단계 설계 §7).
   새 화면 단계를 만들지 않는다. 품목 고르기는 08c.품목카드묶음 을 그대로 빌려 쓴다.

   🔴 줄이 아니라 「심폴 상품코드」로 묶는다 — 같은 상품이 다섯 줄이면 짝은 한 번만 지으신다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  /* 08h 의 톤과 같은 값. 새 CSS 규칙을 만들지 않으려고 여기서 입힌다 */
  var 톤 = {
    노랑상자: 'border-color:#F2DFA8',
    노랑머리: 'background:#FFF8E6; color:#9A6400; border-bottom-color:#F2DFA8',
    회색상자: 'border-color:var(--color-border)',
    회색머리: 'background:var(--color-seg-bg); color:var(--color-text-sub); border-bottom-color:var(--color-border)',
    노랑글: 'color:#9A6400'
  };

  function 상자틀(빛, 제목, 왜, 속) {
    return 만들기('div', { class: 'needbox', style: 톤[빛 + '상자'] }, [
      만들기('h4', { style: 톤[빛 + '머리'] }, [
        만들기('span', { text: 제목 }),
        만들기('span', { class: 'why', text: 왜 || '' })
      ]),
      만들기('div', { class: 'inner' }, 속)
    ]);
  }

  function 단추(글자, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글자 });
    b.addEventListener('click', 눌림);
    return b;
  }

  /* 심폴 줄만 상품코드로 묶는다. { 코드, 상품명, 줄수 } */
  function 상품별(항목들) {
    var 표 = {}, 차례 = [];
    (항목들 || []).forEach(function (것) {
      var r = 것 && 것.줄;
      if (!r || r.판매처 !== '심폴') return;
      var c = r.원본코드 || '';
      if (!c) return;
      if (!표[c]) { 표[c] = { 코드: c, 상품명: 것.상품명 || '', 줄수: 0 }; 차례.push(표[c]); }
      표[c].줄수++;
    });
    return 차례;
  }

  function 마스터() {
    var 표 = {};
    ZG.저장소.품목들().forEach(function (p) { 표[p.품목코드] = p; });
    return 표;
  }

  /* ── 못 지은 상품 한 블록 — 08c 품목 고르기 카드를 그대로 쓴다 ── */
  function 못지음블록(것, 옵션) {
    var 묶음 = ZG.주문입력.품목카드묶음(null, { 수량숨김: true, 한장만: true });

    function 저장() {
      var st = 묶음.읽기()[0];
      var 코드 = st ? st.접두 + '-' + st.cm : '';
      if (!코드) { u.토스트('품목을 고른 뒤 「짝 지어 저장」을 눌러 주세요.'); return; }
      /* 🔴 진짜 품목이 있을 때만 짝을 만든다. 없는 코드로 지으면 유통명·규격이 빈 채로 주문이 들어간다 */
      if (!마스터()[코드]) { u.토스트('v3에 ' + 코드 + ' 품목이 없습니다 — 규격을 확인해 주세요.'); return; }
      ZG.심폴.짝쓰기(것.코드, 코드, 것.상품명);
      u.토스트(것.상품명 + ' → ' + 코드 + ' 짝을 저장했습니다.');
      옵션.바뀌면();   // 되붙이기 + 다시 그리기 — 숫자칸·표가 한꺼번에 맞는다
    }

    return 만들기('div', { style: 'padding:10px 0; border-top:1px solid var(--color-border)' }, [
      만들기('div', { style: 'display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:6px' }, [
        만들기('b', { text: 것.상품명 || '(상품명 없음)' }),
        만들기('span', { class: 'sub', text: '상품코드 ' + 것.코드 }),
        만들기('span', { class: 'sub', style: 톤.노랑글, text: '이 파일에 ' + 것.줄수 + '줄' })
      ]),
      묶음.요소,
      만들기('div', { style: 'margin-top:6px' }, [단추('짝 지어 저장', 저장, 'main')])
    ]);
  }

  function 못지음상자(것들, 옵션) {
    var 속 = 것들.map(function (것) { return 못지음블록(것, 옵션); });
    속.push(만들기('div', { class: 'allrow' }, [
      만들기('span', { class: 'l', text: '짝을 안 지어도 —' }),
      만들기('span', {
        class: 'note',
        html: '<b>저장은 됩니다.</b> 품목코드 없이 들어가고 주문 화면에서 나중에 지정하시면 됩니다'
      })
    ]));
    return 상자틀('노랑', '⚠️ 짝 못 지은 상품 ' + 것들.length + '종',
      '한 번만 지어 두시면 다음부터는 저절로 붙습니다', 속);
  }

  /* ── 이미 지어 둔 것 — 「짝 풀기」가 있어야 잘못 지은 짝을 되돌릴 수 있다 ── */
  function 지음상자(것들, 표, 옵션) {
    var 마 = 마스터();
    var 줄들 = 것들.map(function (것) {
      var 코드 = 표[것.코드], p = 마[코드];
      return 만들기('tr', {}, [
        만들기('td', {}, [만들기('div', { text: 것.상품명 }),
          만들기('div', { class: 'sub', text: '이 파일에 ' + 것.줄수 + '줄' })]),
        만들기('td', { class: 'code', text: 것.코드 }),
        만들기('td', {}, [만들기('div', { class: 'code', text: 코드 }),
          만들기('div', { class: 'sub', text: p ? (p.유통명 + ' · ' + (p.규격 || '')) : 'v3에 이 품목이 없습니다' })]),
        만들기('td', { class: 'r' }, [단추('짝 풀기', function () {
          ZG.심폴.짝풀기(것.코드);
          u.토스트(것.상품명 + ' 짝을 풀었습니다.');
          옵션.바뀌면();
        }, 'sm')])
      ]);
    });
    var 표틀 = 만들기('table', {}, [
      만들기('colgroup', {}, ['', '170px', '210px', '84px'].map(function (w) {
        return 만들기('col', w ? { style: 'width:' + w } : {});
      })),
      만들기('tr', {}, [
        만들기('th', { text: '심폴 상품명' }), 만들기('th', { text: '상품코드' }),
        만들기('th', { text: '붙는 v3 품목' }), 만들기('th', { class: 'r', text: '' })
      ])
    ]);
    줄들.forEach(function (tr) { 표틀.appendChild(tr); });
    return 상자틀('회색', '이미 짝 지어 둔 것 ' + 것들.length + '종',
      '잘못 지었으면 「짝 풀기」로 되돌리시면 됩니다', [표틀]);
  }

  function 상자(항목들, 옵션) {
    옵션 = 옵션 || {};
    if (typeof 옵션.바뀌면 !== 'function') 옵션.바뀌면 = function () {};
    var 표 = ZG.심폴.짝표(), 모두 = 상품별(항목들);
    var 못 = 모두.filter(function (것) { return !표[것.코드]; });
    var 됨 = 모두.filter(function (것) { return !!표[것.코드]; });

    var 속 = [];
    if (못.length) 속.push(못지음상자(못, 옵션));
    if (됨.length) 속.push(지음상자(됨, 표, 옵션));
    if (!속.length) {
      속.push(상자틀('회색', '심폴 상품 짝짓기 — 다 붙었습니다',
        '이 파일의 상품이 전부 v3 품목에 붙었습니다', []));
    }
    return 만들기('div', {}, 속);
  }

  ZG.심폴짝창 = { 상자: 상자 };
})(window.ZG);
